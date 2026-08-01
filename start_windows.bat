@echo off
echo Starting Cognitive Forensic Investigator (Windows)...

:: Start Frontend in background
start "CFI Frontend" cmd /c "npm run dev --prefix frontend"

:: Start Backend
call venv\Scripts\activate.bat
set PYTHONPATH=.
uvicorn backend.main:app --host 0.0.0.0 --port 8000
