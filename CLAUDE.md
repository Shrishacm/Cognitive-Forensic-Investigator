# AI Coding Agent Guide & Execution Instructions

This document provides clear, structured instructions for AI coding agents (such as Antigravity, Cursor, Claude, Copilot, or Devin) to run, develop, debug, and test the **Cognitive Forensic Investigator (CFI)** project on **Windows**, **Linux**, and **macOS**.

---

## 1. Quick Operating System Execution Guide

### 🪟 Windows Setup & Execution

#### Option A: One-Command Batch Scripts (Recommended)
1. **Initial Setup (Run Once):**
   ```cmd
   setup_windows.bat
   ```
2. **Start Application:**
   ```cmd
   start_windows.bat
   ```

#### Option B: Manual Execution (Command Prompt / PowerShell)
- **Terminal 1 — Ollama (LLM Runtime):**
  ```cmd
  ollama serve
  ```
- **Terminal 2 — FastAPI Backend:**
  ```cmd
  call venv\Scripts\activate.bat
  set PYTHONPATH=.
  uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Terminal 3 — React Frontend:**
  ```cmd
  cd frontend
  npm run dev
  ```

---

### 🐧 Linux & 🍎 macOS Setup & Execution

#### Option A: One-Command Shell Scripts (Recommended)
1. **Initial Setup (Run Once):**
   ```bash
   ./setup.sh
   ```
2. **Start Application:**
   ```bash
   ./start.sh
   ```

#### Option B: Manual Execution
- **Terminal 1 — Ollama (LLM Runtime):**
  ```bash
  ollama serve
  ```
- **Terminal 2 — FastAPI Backend:**
  ```bash
  source venv/bin/activate
  PYTHONPATH=. uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Terminal 3 — React Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 2. System Architecture & Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React 18 + Vite | Single page app with Tailwind CSS + Custom Design System |
| **Backend** | FastAPI + Uvicorn | REST API backend running on Python 3.10+ |
| **Database** | SQLite + SQLAlchemy | Relational DB for cases, evidence, entities, notes, audit logs |
| **Vector Store** | Qdrant (Local) | Embedded vector DB stored under `data/cases/<case_id>/qdrant` |
| **LLM Runtime** | Ollama (Local) | Runs models locally (`llama3.2:3b`, `phi4-mini`, or `qwen2.5:7b`) |
| **NLP Engine** | spaCy (`en_core_web_lg`) | Entity extraction (Person, Location, Org, IP, Files) |
| **Transcription** | OpenAI Whisper (Local) | Local audio/video transcription |
| **OCR** | Tesseract OCR | Image text extraction |

---

## 3. Environment & Configuration

1. **Environment File (`.env`):**
   Copy `.env.example` to `.env` if it doesn't exist:
   ```env
   SECRET_KEY=cfi_secret_key_change_in_production
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2:3b
   CASES_DIR=data/cases
   ```

2. **Database Migrations:**
   Run all migrations to create/update SQLite tables:
   ```bash
   # Windows:
   venv\Scripts\python.exe backend/migrate_all.py

   # Linux/Mac:
   python3 backend/migrate_all.py
   ```

3. **Seeder / Demo Data:**
   To seed realistic demo cases (`admin` user, demo evidence, entity graphs):
   ```bash
   # Windows:
   venv\Scripts\python.exe backend/seed_demo.py

   # Linux/Mac:
   python3 backend/seed_demo.py
   ```
   **Default Credentials:**
   - Username: `admin`
   - Password: `Admin@CFI2025`

---

## 4. Key Developer & Agent Guidelines

- **Cross-Platform Compatibility:**
  - Always use Python's `os.path.join()` or `pathlib.Path` for file paths. Never hardcode forward or backward slashes.
  - Do not call OS-specific commands directly (like `grep`, `cat`, `ls`) inside Python code. Use standard library modules (`os`, `shutil`, `glob`).
  - SpaCy GPU acceleration is disabled by default to ensure maximum stability across CUDA versions and platforms.

- **Backend Structure:**
  - `backend/main.py`: Entry point and FastAPI app definition.
  - `backend/routers/`: API endpoints (`cases.py`, `evidence.py`, `queries.py`, `auth_router.py`, etc.).
  - `backend/modules/rag_engine.py`: Conversational partner persona and retrieval pipeline.
  - `backend/modules/vector_store.py`: Qdrant vector database storage and query methods.
  - `backend/modules/job_worker.py`: Background worker processing ingestion tasks.

- **Frontend Structure:**
  - `frontend/src/App.jsx`: Main routing & layout structure.
  - `frontend/src/api/client.js`: Axios client configuration for backend communication.
  - `frontend/src/pages/`: Main application pages (`InvestigatePage.jsx`, `DashboardPage.jsx`, `EvidencePage.jsx`, etc.).
  - `frontend/src/index.css`: Design system tokens (amber `#D4A32A`, navy `#060B14`, Barlow Condensed + JetBrains Mono fonts).

- **Testing Application Health:**
  - Backend Status Endpoint: `GET http://localhost:8000/api/status`
  - Frontend URL: `http://localhost:3000` or `http://localhost:5173`
  - Interactive API Docs: `http://localhost:8000/docs`

---

## 5. Verification Commands for Agents

After making any code changes, verify using:
```bash
# Frontend build check
cd frontend && npm run build

# Backend syntax / import check
python3 -c "import backend.main; print('Backend syntax OK')"
```
