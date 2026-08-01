#!/bin/bash
echo "Starting Cognitive Forensic Investigator (Mac/Linux)..."

# Start Frontend in background
npm run dev --prefix frontend &
FRONTEND_PID=$!

# Start Backend
source venv/bin/activate
PYTHONPATH=. uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Cleanup when backend stops
kill $FRONTEND_PID
