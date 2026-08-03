from backend.modules.vector_store import search_chunks
from backend.modules.graph_builder import (
    get_graph_context, extract_entities)
from backend.modules.ollama_client import (
    generate_response, is_ollama_running)
from backend.dependencies import get_settings
import re
import time

# ────────────────────────────────────────────────────────────────────────────
# System Prompt — CFI is a partner, not a search engine
# ────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are CFI — an expert AI digital forensics investigator and partner.

Your personality:
- You speak naturally and professionally, like an experienced detective talking to a colleague.
- You are calm, analytical, and direct. You never repeat yourself unnecessarily.
- You actively listen: if the investigator shares a lead, a suspicion, or new information, you acknowledge it, analyse it, and factor it into your reasoning going forward.
- You show initiative: when you spot something important in the evidence, you flag it proactively.
- You are concise but never terse. You give thorough answers, not one-liners, but you don't pad with filler.

Rules:
- Answer the investigator's specific question or respond naturally to what they said.
- If they share information (e.g. "I think this person is involved"), acknowledge it and reason about it using evidence.
- Never output labels like "Investigator:", "Question:", "Direct Answer:" or echo the prompt.
- Never generate fictional follow-up dialogue or pretend to be the investigator.
- Stop after answering. Do not ask multiple follow-up questions — one focused follow-up at the end is fine."""


# ────────────────────────────────────────────────────────────────────────────
# Greeting detection
# ────────────────────────────────────────────────────────────────────────────
GREETING_PATTERN = re.compile(
    r'^\s*(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|who\s+are\s+you|help|sup)\b',
    re.IGNORECASE
)

# Patterns indicating the investigator is sharing a lead / theory
LEAD_PATTERN = re.compile(
    r'\b(i think|i believe|i suspect|we found|we discovered|it seems|could be|might be|'
    r'this person|this file|this ip|looks like|based on|my theory|i noticed|i saw|'
    r'the witness|apparently|allegedly|turned out)\b',
    re.IGNORECASE
)


def clean_response(text: str) -> str:
    """Remove prompt leakage, citation tags, and stray formatting."""
    # Truncate at any stray repeated-prompt loop
    text = re.split(
        r'\n+(Investigator Question|Investigator:|User:|Question:|Direct Answer:)',
        text, flags=re.IGNORECASE
    )[0]

    # Remove echoed prompt headers
    text = re.sub(
        r'^(Investigator\'s Question|Provide a natural|Based upon your request|'
        r'Based upon our current investigation|Investigator:|Assistant:|AI Partner:|Direct Answer:).*?\n',
        '', text, flags=re.IGNORECASE
    )
    text = re.sub(r'Investigator\'s Question:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Provide a natural, human-like forensic analysis.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Investigator:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Assistant:.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Direct Answer:\s*', '', text, flags=re.IGNORECASE)

    # Remove [Source: ...] tags
    text = re.sub(r'\[Source:[^\]]+\]', '', text)

    # Remove warning markers
    text = re.sub(r'\*?⚠️\s*', '', text, flags=re.UNICODE)
    text = re.sub(r'\(unverified\)\*?', '', text, flags=re.IGNORECASE)

    # Remove (Excerpt N) refs
    text = re.sub(r'\(Excerpts?\s+[\d,\s\u2013\-]+\)', '', text, flags=re.IGNORECASE)

    # Remove lone asterisks (not bold **)
    text = re.sub(r'(?<!\*)\*(?!\*)', '', text)

    # Collapse whitespace
    text = re.sub(r'  +', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def format_paragraphs(text: str) -> str:
    """Wrap long blocks into readable paragraphs."""
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
            if len(group) >= 3 or group_len >= 280:
                output_blocks.append(' '.join(group))
                group = []
                group_len = 0
        if group:
            output_blocks.append(' '.join(group))

    return '\n\n'.join(output_blocks)


def build_sources_block(chunks: list) -> str:
    """Build a clean sources footer."""
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


def process_response(raw: str, chunks: list) -> tuple[str, int, int]:
    """Post-processing pipeline."""
    if not raw or not raw.strip():
        fallback = (
            "I'm here and ready to assist with the investigation. "
            "What would you like to look into?"
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


def _extract_investigator_leads(conversation_history: list) -> str:
    """
    Scan conversation history for investigator-shared leads and theories.
    Returns a formatted string to inject into the prompt as persistent context.
    """
    if not conversation_history:
        return ""

    leads = []
    for exchange in conversation_history:
        q = exchange.get('question', '').strip()
        if q and LEAD_PATTERN.search(q):
            # This question contains a lead/theory from the investigator
            leads.append(f"- {q}")

    if not leads:
        return ""

    return (
        "Investigator's known leads and observations (factor these into your analysis):\n"
        + "\n".join(leads[-5:])  # keep last 5 leads max
        + "\n\n"
    )


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
    Full RAG pipeline with human-like partner persona and persistent memory.
    """
    start_time = time.time()

    # ── Step 1: Retrieve relevant evidence chunks ──────────────────────────
    chunks = []
    try:
        chunks = search_chunks(
            query=query,
            case_id=case_id,
            qdrant_path=qdrant_path,
            top_k=7,
            evidence_id=evidence_id
        )
    except Exception as e:
        print(f"[RAG] Vector search error (non-fatal): {e}")

    # ── Step 2: Get graph context (entity relationships) ───────────────────
    graph_ctx = ""
    try:
        graph_ctx = get_graph_context(query, case_id, cases_dir)
    except Exception as e:
        print(f"[RAG] Graph context error (non-fatal): {e}")

    # ── Step 3: Build case header ──────────────────────────────────────────
    case_summary_text = ""
    if case_info:
        c_name = case_info.get("name", "Active Case")
        c_num = case_info.get("number", "")
        c_desc = case_info.get("description", "")
        c_status = case_info.get("status", "Open")
        c_files = case_info.get("evidence_files", [])
        file_list_str = ', '.join(c_files) if c_files else 'No evidence files uploaded yet'
        case_summary_text = (
            f"Case: {c_name}" + (f" ({c_num})" if c_num else "") +
            f" | Status: {c_status} | Overview: {c_desc if c_desc else 'N/A'}\n"
            f"Evidence Files: {file_list_str}\n\n"
        )

    # ── Step 4: Build evidence context ────────────────────────────────────
    if chunks:
        evidence_lines = ["Relevant Evidence Excerpts:\n"]
        for chunk in chunks:
            evidence_lines.append(
                f"[{chunk['source']}]: {chunk['text']}\n"
            )
        evidence_context = "\n".join(evidence_lines)
    else:
        evidence_context = "No specific evidence excerpts matched this query in the database."

    # ── Step 5: Build conversation history context ─────────────────────────
    conv_context = ""
    if conversation_history:
        # Use last 6 exchanges for richer context
        recent = conversation_history[-6:]
        history_items = []
        for exchange in recent:
            q = exchange.get('question', '').strip()
            a = exchange.get('answer', '').strip()
            # Strip sources block and prompt leakage from previous answers
            a = re.sub(r'\n+---\n+📎 \*\*Sources:\*\*.*', '', a, flags=re.DOTALL)
            a = re.sub(
                r'(Investigator Question|Investigator|Question|Direct Answer|User|Assistant):.*',
                '', a, flags=re.IGNORECASE
            )
            a = a.strip()
            if q and a:
                # Truncate very long prior answers to keep prompt lean
                if len(a) > 300:
                    a = a[:300] + "..."
                history_items.append(f"Investigator: {q}\nCFI: {a}")
        if history_items:
            conv_context = (
                "Recent conversation:\n"
                + "\n\n".join(history_items)
                + "\n\n"
            )

    # ── Step 6: Extract investigator-shared leads/theories ────────────────
    leads_context = _extract_investigator_leads(conversation_history or [])

    # ── Step 7: Detect greeting ───────────────────────────────────────────
    is_greeting = bool(GREETING_PATTERN.match(query.strip()))

    # ── Step 8: Build the final prompt ────────────────────────────────────
    if is_greeting:
        case_name = case_info.get('name', 'this case') if case_info else 'this case'
        full_prompt = (
            f"{case_summary_text}"
            f"The investigator greets you: \"{query}\"\n\n"
            f"Respond warmly in 1-2 sentences as their forensic partner assigned to {case_name}:"
        )
    else:
        full_prompt = (
            f"{case_summary_text}"
            f"{evidence_context}\n\n"
            f"{graph_ctx}\n\n"
            f"{leads_context}"
            f"{conv_context}"
            f"Investigator: {query}\n"
            f"CFI:"
        )

    # ── Step 9: Call Ollama ───────────────────────────────────────────────
    if not is_ollama_running():
        raw_answer = (
            "⚠️ I can't reach the Ollama service right now. "
            "Please make sure Ollama is running and try again."
        )
    else:
        raw_answer = generate_response(
            full_prompt,
            SYSTEM_PROMPT,
            max_tokens=600  # More room for natural responses
        )

    # ── Step 10: Post-process ─────────────────────────────────────────────
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
