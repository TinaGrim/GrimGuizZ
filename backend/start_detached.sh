#!/usr/bin/env bash
# Launch the QuizZ backend detached from the shell so it survives the tool timeout.
cd "$(dirname "$0")"
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
