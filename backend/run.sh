#!/usr/bin/env bash
# Start the QuizZ FastAPI backend.
set -e
cd "$(dirname "$0")"
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
