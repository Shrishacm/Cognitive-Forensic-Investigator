# CFI Setup Guide — Ubuntu Linux
**Cognitive Forensic Investigator**
**Repo:** https://github.com/Shrishacm/Cognitive-Forensic-Investigator

---

## ⚠️ Before Anything Else — NVIDIA Driver

Your GPU (GTX 1050 Ti) needs driver 570+ for Ollama to use it.
Without this, AI responses will be extremely slow (CPU fallback).

```bash
# Install the driver
sudo apt install nvidia-driver-570

# Reboot (required)
sudo reboot
```

After reboot, verify it worked:

```bash
nvidia-smi
```

You should see a table showing **GeForce GTX 1050 Ti** and **Driver Version: 570.xx**
If you see an error — stop here and fix this before continuing.
Everything else depends on it.

---

## Step 1 — Install System Dependencies

```bash
sudo apt update
sudo apt install -y \
  python3 python3-pip python3-venv \
  nodejs npm \
  libewf-dev ewf-tools sleuthkit \
  tesseract-ocr \
  ffmpeg \
  fuse \
  libssl-dev libffi-dev \
  python3-dev build-essential
```

---

## Step 2 — Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify it installed:

```bash
ollama --version
```

---

## Step 3 — Clone the Project

```bash
git clone https://github.com/Shrishacm/Cognitive-Forensic-Investigator.git
cd Cognitive-Forensic-Investigator
```

---

## Step 4 — Configure Environment

```bash
cp .env.example .env
nano .env
```

Inside the file, change two things:

**1. Generate a secret key** — open a second terminal and run:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and paste it as the `SECRET_KEY` value.

**2. Set the AI model** for your GPU (4GB VRAM):

```
OLLAMA_MODEL=phi4-mini
```

Save and close: **Ctrl+O** → Enter → **Ctrl+X**

---

## Step 5 — Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This will automatically:
- Create a Python virtual environment
- Install all Python packages (~50 packages)
- Download the spaCy NLP model
- Create data directories
- Run all 16 database migrations
- Install frontend packages
- Pull the Ollama AI model (phi4-mini ~2.3GB)

⏳ This takes **5–15 minutes** depending on internet speed. Let it run completely.

---

## Step 6 — Verify GPU is Being Used

Before running the app, confirm Ollama is actually using your GPU:

```bash
# Start Ollama
ollama serve &

# Wait a few seconds, then test
sleep 5
ollama run phi4-mini "hello"
```

In a **second terminal** while it is generating:

```bash
ollama ps
```

You should see **100% GPU** in the Processor column.
If it shows **CPU** — your driver is the issue. Go back to the NVIDIA step.

---

## Step 7 — Start the Application

You need **three terminals** open simultaneously.

### Terminal 1 — AI Engine
```bash
ollama serve
```

### Terminal 2 — Backend
```bash
cd Cognitive-Forensic-Investigator
source venv/bin/activate
PYTHONPATH=. uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 3 — Frontend
```bash
cd Cognitive-Forensic-Investigator/frontend
npm run dev
```

---

## Step 8 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

You should see the CFI landing page.

---

## Step 9 — First Time Setup

1. Click **Register** or **Create account**
2. Fill in your details and register
3. The **first account created is automatically Admin**
4. Log in — you land on the Dashboard
5. Click **System Health** in the sidebar
6. All 8 checklist items must be **green** before uploading any evidence

---

## Every Time You Start (After First Setup)

```bash
# Terminal 1
ollama serve

# Terminal 2
cd Cognitive-Forensic-Investigator
source venv/bin/activate
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# Terminal 3
cd Cognitive-Forensic-Investigator/frontend
npm run dev
```

Then open `http://localhost:3000`

---

## Getting Updates

If a bug is fixed and pushed to GitHub:

```bash
cd Cognitive-Forensic-Investigator
git pull
```

Restart the backend terminal after pulling.

---

## Troubleshooting

### Ollama using CPU instead of GPU
```bash
nvidia-smi          # Must show driver 570+
sudo apt install nvidia-driver-570
sudo reboot
```

### Port 8000 already in use
```bash
lsof -i :8000
kill -9 <PID shown>
```

### spaCy model missing
```bash
source venv/bin/activate
python3 -m spacy download en_core_web_lg
```

### Node.js version too old
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version      # Should show v18+
```

### Permission denied on setup.sh
```bash
chmod +x setup.sh
./setup.sh
```

### pyewf not installing
This only affects `.E01` disk image files.
All other file types (PDF, DOCX, audio, images, etc.) work fine without it.
The setup script tries to build it automatically — if it fails, ignore and continue.

### Backend won't start — missing module
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start — missing packages
```bash
cd frontend
npm install
npm run dev
```

---

## AI Model Reference

| GPU VRAM | Recommended Model | Command |
|---|---|---|
| 4GB (GTX 1050 Ti) | phi4-mini | `ollama pull phi4-mini` |
| 8GB | llama3.2:3b | `ollama pull llama3.2:3b` |
| 12GB+ | qwen2.5:7b | `ollama pull qwen2.5:7b` |

To switch models, edit `.env`:
```
OLLAMA_MODEL=phi4-mini
```
Then restart the backend terminal.

---

*CFI — Cognitive Forensic Investigator | Final Year Project*
