from backend.modules.vector_store import search_chunks
from backend.modules.graph_builder import (
    get_graph_context, extract_entities)
from backend.modules.ollama_client import (
    generate_response, is_ollama_running)
from backend.dependencies import get_settings
import re
import time

SYSTEM_PROMPT = """You are a forensic evidence analysis assistant.
Your job is to answer questions using ONLY the Evidence Excerpts provided below.

RULES:
1. Always attempt to answer from the provided evidence.
2. For every sentence you write, add a citation at the END of that
   sentence in this exact format:
   [Source: filename | Confidence: 0.85]
   Use the Source and Confidence values from the matching excerpt.
   Every individual sentence must have its own citation.
3. If the evidence excerpts do not contain information relevant
   to the question, respond ONLY with:
   INSUFFICIENT EVIDENCE: The provided documents do not contain
   enough information to answer this question.
4. Do NOT use any knowledge from your training data.
5. Do NOT infer or guess connections that are not in the evidence.
6. Do NOT refuse to answer — always engage with the evidence.
"""


def reformat_citations(response: str) -> str:
    """
    Handles two citation patterns Ollama produces:

    Pattern A — citation BEFORE the paragraph (Ollama's most common output):
      [Source: file.txt | Confidence: 0.85]
      Sentence one. Sentence two. Sentence three.
      → Distribute the citation to every sentence in the paragraph.

    Pattern B — citation AFTER each sentence (ideal, already correct):
      Sentence one. [Source: file.txt | Confidence: 0.85]
      → Leave as-is.
    """
    paragraphs = re.split(r'\n{2,}', response.strip())
    output_paragraphs = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Pattern A: paragraph starts with a [Source: ...] citation
        leading = re.match(
            r'^(\[Source:[^\]]+\])\s*(.*)',
            para, re.DOTALL
        )
        if leading:
            citation = leading.group(1)
            body = leading.group(2).strip()
            if not body:
                # Bare citation line with no text — skip it
                continue
            # Split body into sentences and append the citation to each
            sents = re.split(r'(?<=[.!?])\s+', body)
            new_sents = []
            for s in sents:
                s = s.strip()
                if not s:
                    continue
                if '[Source:' in s:
                    # Already has its own citation
                    new_sents.append(s)
                else:
                    # Append the block-level citation
                    end = s[-1] if s else '.'
                    if end not in '.!?':
                        new_sents.append(f"{s}. {citation}")
                    else:
                        new_sents.append(f"{s} {citation}")
            output_paragraphs.append(' '.join(new_sents))
        else:
            # Pattern B: inline citations — leave paragraph unchanged
            output_paragraphs.append(para)

    result = '\n\n'.join(output_paragraphs)
    return result if result else response


def resolve_excerpt_refs(
        response: str,
        chunks: list) -> str:
    """
    Ollama often cites using informal shorthand like:
      (Excerpt 1)  (Excerpts 1-3)  (Excerpts 1, 4)
    This function replaces those with proper tags:
      [Source: filename | Confidence: 0.85]
    so enforce_citations can detect and count them.
    """
    if not chunks:
        return response

    def replace_ref(match):
        # Pull the first excerpt number from the match
        nums = re.findall(r'\d+', match.group(0))
        if not nums:
            return match.group(0)
        idx = int(nums[0]) - 1  # excerpts are 1-indexed
        if 0 <= idx < len(chunks):
            c = chunks[idx]
            return (
                f"[Source: {c['source']} "
                f"| Confidence: {c['score']}]"
            )
        return match.group(0)

    # Match: (Excerpt 1), (Excerpts 1-3), (Excerpts 1, 2, 4)
    return re.sub(
        r'\(Excerpts?\s+[\d,\s\u2013\-]+\)',
        replace_ref,
        response,
        flags=re.IGNORECASE
    )


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

    # Step 7: Resolve informal (Excerpt N) refs → [Source: ...] tags
    resolved = resolve_excerpt_refs(raw_answer, chunks)

    # Step 8: Reformat and enforce citations
    reformatted = reformat_citations(resolved)
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
