from backend.modules.vector_store import search_chunks
from backend.modules.graph_builder import (
    get_graph_context, extract_entities)
from backend.modules.ollama_client import (
    generate_response, is_ollama_running)
from backend.dependencies import get_settings
import re
import time

SYSTEM_PROMPT = """You are a forensic evidence analysis assistant
operating under strict legal rules.

ABSOLUTE RULES:
1. Every sentence MUST end with a citation:
   [Source: filename | Confidence: X.XX]
2. If you cannot cite a sentence, do not write that sentence.
3. If evidence is insufficient, respond with:
   INSUFFICIENT EVIDENCE: The provided documents do not contain
   enough information.
4. Never use your training knowledge.
5. Never infer connections not in the evidence.
6. You may use the conversation history below to understand
   follow-up questions, but STILL cite every claim from the
   evidence excerpts provided.
"""


def reformat_citations(response: str) -> str:
    pattern = (r'(\[Source:[^\]]+\])\s+'
               r'(.+?)(?=\[Source:|$)')

    def move_citation(match):
        citation = match.group(1)
        sentence = match.group(2).strip()
        if sentence.endswith('.'):
            return f"{sentence[:-1]}. {citation}\n"
        return f"{sentence}. {citation}\n"

    reformatted = re.sub(
        pattern, move_citation,
        response, flags=re.DOTALL)
    reformatted = '\n'.join(
        line.strip()
        for line in reformatted.splitlines()
        if line.strip()
    )
    return reformatted if reformatted else response


def enforce_citations(response: str) -> tuple[
        str, int, int]:
    """
    Marks uncited sentences with warning.
    Returns (processed_response, cited_count,
             uncited_count)
    """
    sentences = re.split(
        r'(?<=[.!?])\s+', response.strip())
    output_lines = []
    cited_count = 0
    uncited_count = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if '[Source:' in sentence:
            output_lines.append(sentence)
            cited_count += 1
        elif 'INSUFFICIENT EVIDENCE' in sentence:
            output_lines.append(sentence)
        else:
            output_lines.append(
                f"*\u26a0\ufe0f {sentence} "
                f"(unverified)*"
            )
            uncited_count += 1

    result = ' '.join(output_lines)
    if uncited_count > 0 and cited_count > 0:
        result += (
            f"\n\n---\n"
            f"*\U0001f4ca {cited_count} sentence(s) grounded"
            f" in evidence. "
            f"{uncited_count} unverified.*"
        )
    return result, cited_count, uncited_count


def run_rag_query(
        query: str,
        case_id: str,
        qdrant_path: str,
        cases_dir: str,
        evidence_id: str = None,
        asked_by: str = "investigator",
        conversation_history: list = None
) -> dict:
    """
    Full RAG pipeline with optional conversation memory.
    conversation_history is a list of dicts:
      [{"role": "investigator",
        "question": "...",
        "answer": "..."}, ...]
    Maximum 5 most recent exchanges are included.
    Returns dict with answer and metadata for QueryLog.
    """
    start_time = time.time()

    # Step 1: Retrieve chunks from Qdrant
    chunks = search_chunks(
        query=query,
        case_id=case_id,
        qdrant_path=qdrant_path,
        top_k=7,
        evidence_id=evidence_id
    )

    # Step 2: Get graph context
    graph_ctx = get_graph_context(
        query, case_id, cases_dir)

    # Step 3: Build evidence context
    evidence_lines = ["Evidence Excerpts:\n"]
    for i, chunk in enumerate(chunks):
        evidence_lines.append(
            f"[Excerpt {i + 1}]\n"
            f"Source: {chunk['source']} | "
            f"Confidence: {chunk['score']}\n"
            f"Content: {chunk['text']}\n"
        )
    evidence_context = "\n".join(evidence_lines)

    # Step 4: Build conversation context from history
    conv_context = ""
    if conversation_history:
        # Cap at last 5 exchanges
        recent = conversation_history[-5:]
        conv_lines = [
            "\nPrevious exchanges in this investigation session:"
        ]
        for i, exchange in enumerate(recent, 1):
            conv_lines.append(f"\n[Exchange {i}]")
            conv_lines.append(
                f"Investigator: {exchange.get('question', '')}"
            )
            raw_answer = exchange.get('answer', '')
            if len(raw_answer) > 500:
                conv_lines.append(
                    f"Assistant: {raw_answer[:500]}..."
                )
            else:
                conv_lines.append(
                    f"Assistant: {raw_answer}"
                )
        conv_context = '\n'.join(conv_lines)

    # Step 5: Assemble full prompt
    full_prompt = (
        f"{evidence_context}\n\n"
        f"{graph_ctx}\n\n"
        f"{conv_context}\n\n"
        f"Current Question: {query}\n\n"
        f"Provide your analysis based solely "
        f"on the evidence above:"
    )

    # Step 6: Check Ollama
    if not is_ollama_running():
        raw_answer = (
            "\u26a0\ufe0f Ollama is offline. "
            "Retrieved chunks shown for manual review."
        )
    else:
        raw_answer = generate_response(
            full_prompt, SYSTEM_PROMPT)

    # Step 7: Process response
    reformatted = reformat_citations(raw_answer)
    (processed, cited_count,
     uncited_count) = enforce_citations(reformatted)

    elapsed_ms = int(
        (time.time() - start_time) * 1000)

    return {
        "answer": processed,
        "raw_llm_response": raw_answer,
        "chunks_used": chunks,
        "graph_context": graph_ctx,
        "ollama_available": is_ollama_running(),
        "cited_sentence_count": cited_count,
        "uncited_sentence_count": uncited_count,
        "response_time_ms": elapsed_ms,
        "model_used": get_settings().ollama_model
    }
