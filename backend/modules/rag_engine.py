from backend.modules.vector_store import search_chunks
from backend.modules.graph_builder import (
    get_graph_context, extract_entities)
from backend.modules.ollama_client import (
    generate_response, is_ollama_running)
from backend.dependencies import get_settings
import re
import time

SYSTEM_PROMPT = """You are CFI, an expert AI digital forensics co-investigator.

RULES FOR YOUR RESPONSE:
1. Answer ONLY the investigator's question directly, clearly, and concisely (1-3 sentences or short bullet points).
2. Never repeat prompt labels or instructions (do NOT output 'Investigator Question:', 'Direct Answer:', 'Question:', or repeat past dialog).
3. Stop immediately after answering the question. Do NOT generate subsequent questions or fictional conversation logs."""


def clean_response(text: str) -> str:
    """
    Remove citation tags, prompt leakage headers, and stray
    formatting characters from Ollama's raw response.
    """
    # Truncate at any stray question header or repeated prompt loop attempt
    text = re.split(r'\n+(Investigator Question|Investigator:|User:|Question:|Direct Answer:)', text, flags=re.IGNORECASE)[0]

    # Remove echoed prompt leakage headers / instructions if present at start
    text = re.sub(r'^(Investigator\'s Question|Provide a natural|Based upon your request|Based upon our current investigation|Investigator:|Assistant:|AI Partner:|Direct Answer:).*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Investigator\'s Question:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Provide a natural, human-like forensic analysis.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Investigator:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Assistant:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Direct Answer:\s*', '', text, flags=re.IGNORECASE)

    # Remove [Source: ... | Confidence: ...] tags
    text = re.sub(r'\[Source:[^\]]+\]', '', text)

    # Remove ⚠️ (unverified)* markers
    text = re.sub(r'\*?⚠️\s*', '', text, flags=re.UNICODE)
    text = re.sub(r'\(unverified\)\*?', '', text, flags=re.IGNORECASE)

    # Remove (Excerpt N) / (Excerpts N-M) refs
    text = re.sub(r'\(Excerpts?\s+[\d,\s\u2013\-]+\)', '', text, flags=re.IGNORECASE)

    # Remove leftover inline asterisks used as emphasis markers
    text = re.sub(r'(?<!\*)\*(?!\*)', '', text)

    # Collapse multiple spaces
    text = re.sub(r'  +', ' ', text)

    # Collapse 3+ newlines to double
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def format_paragraphs(text: str) -> str:
    """
    Make response readable:
    - Keep paragraphs short and concise
    - Preserve list items (lines starting with * or -)
    """
    blocks = re.split(r'\n{2,}', text)
    output_blocks = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        if len(block) <= 300 or re.match(r'^[\*\-]', block):
            output_blocks.append(block)
            continue

        sentences = re.split(r'(?<=[.!?])\s+', block)
        group = []
        group_len = 0
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            group.append(sent)
            group_len += len(sent)
            if len(group) >= 2 or group_len >= 200:
                output_blocks.append(' '.join(group))
                group = []
                group_len = 0
        if group:
            output_blocks.append(' '.join(group))

    return '\n\n'.join(output_blocks)


def build_sources_block(chunks: list) -> str:
    """
    Build a clean sources footer listing all unique files
    that were retrieved from Qdrant for this query.
    """
    if not chunks:
        return ''

    seen = set()
    unique_sources = []
    for c in chunks:
        src = c.get('source', '')
        display = re.sub(r'^[0-9a-f\-]{36}_', '', src)
        if display and display not in seen:
            seen.add(display)
            unique_sources.append(display)

    if not unique_sources:
        return ''

    return '\n\n---\n📎 **Sources:** ' + ', '.join(unique_sources)


def process_response(
        raw: str,
        chunks: list
) -> tuple[str, int, int]:
    """
    Post-processing pipeline:
    1. Fallback if raw response is empty
    2. Clean noise and prompt leakage
    3. Format readable paragraphs
    4. Append sources footer
    """
    if not raw or not raw.strip():
        fallback = (
            "I'm ready to assist with your investigation. "
            "Please ask a question or let me know what evidence you'd like to analyze."
        )
        return fallback, 0, 0

    cleaned = clean_response(raw)
    if not cleaned or not cleaned.strip():
        cleaned = raw.strip()

    formatted = format_paragraphs(cleaned)
    sources_block = build_sources_block(chunks)
    final = formatted + sources_block

    cited_count = len(set(
        c.get('source', '') for c in chunks if c.get('source')
    ))
    return final, cited_count, 0


def run_rag_query(
        query: str,
        case_id: str,
        qdrant_path: str,
        cases_dir: str,
        evidence_id: str = None,
        asked_by: str = "investigator",
        conversation_history: list = None,
        case_info: dict = None
) -> dict:
    """
    Full RAG pipeline with concise human-like conversation partner persona.
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
    graph_ctx = get_graph_context(query, case_id, cases_dir)

    # Step 3: Build case summary header
    case_summary_text = ""
    if case_info:
        c_name = case_info.get("name", "Active Case")
        c_num = case_info.get("number", "")
        c_desc = case_info.get("description", "")
        c_status = case_info.get("status", "Open")
        c_files = case_info.get("evidence_files", [])

        file_list_str = ', '.join(c_files) if c_files else 'No evidence files uploaded yet'
        case_summary_text = (
            f"Case: {c_name}" + (f" ({c_num})" if c_num else "") + f" | Status: {c_status} | Overview: {c_desc if c_desc else 'N/A'}\n"
            f"Evidence Files: {file_list_str}\n\n"
        )

    # Step 4: Build evidence context
    if chunks:
        evidence_lines = ["Key Evidence Excerpts:\n"]
        for i, chunk in enumerate(chunks):
            evidence_lines.append(
                f"[{chunk['source']}]: {chunk['text']}\n"
            )
        evidence_context = "\n".join(evidence_lines)
    else:
        evidence_context = "No specific vector evidence excerpts found."

    # Step 5: Build conversation context from history cleanly without prompt leaks
    conv_context = ""
    if conversation_history:
        recent = conversation_history[-2:]  # Limit to last 2 exchanges
        history_items = []
        for exchange in recent:
            q = exchange.get('question', '').strip()
            a = exchange.get('answer', '').strip()
            # Clean sources block & prompt leaks from previous answers
            a = re.sub(r'\n+---\n+📎 \*\*Sources:\*\*.*', '', a, flags=re.DOTALL)
            a = re.sub(r'(Investigator Question|Investigator|Question|Direct Answer|User|Assistant):.*', '', a, flags=re.IGNORECASE)
            a = a.strip()
            if q and a:
                if len(a) > 150:
                    a = a[:150] + "..."
                history_items.append(f"Q: {q}\nA: {a}")
        if history_items:
            conv_context = "Previous Context:\n" + "\n".join(history_items) + "\n\n"

    # Step 6: Detect greeting / general conversational query
    is_greeting = bool(re.match(
        r'^\s*(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|who\s+are\s+you|help|sup)\b',
        query.strip(),
        re.IGNORECASE
    ))

    if is_greeting:
        full_prompt = (
            f"{case_summary_text}"
            f"The investigator says: \"{query}\"\n\n"
            f"Respond directly in 1-2 friendly, concise sentences as their forensic partner for {case_info.get('name', 'this case') if case_info else 'this case'}:"
        )
    else:
        full_prompt = (
            f"{case_summary_text}"
            f"{evidence_context}\n\n"
            f"{graph_ctx}\n\n"
            f"{conv_context}"
            f"Question: {query}\n"
            f"Answer:"
        )

    # Step 7: Call Ollama
    if not is_ollama_running():
        raw_answer = (
            "⚠️ Ollama is offline. "
            "Please start Ollama and try again."
        )
    else:
        raw_answer = generate_response(full_prompt, SYSTEM_PROMPT)

    # Step 8: Post-process response
    (processed, cited_count, uncited_count) = process_response(raw_answer, chunks)

    elapsed_ms = int((time.time() - start_time) * 1000)

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
