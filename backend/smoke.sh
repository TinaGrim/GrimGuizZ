#!/usr/bin/env bash
# Post-refactor smoke check: seed + login still work after auth.py/seed.py renames.
set -e
cd "$(dirname "$0")"
B=http://127.0.0.1:8000
LOG=/tmp/quizz-backend.log
cleanup() { kill "$SRV_PID" 2>/dev/null || true; }
trap cleanup EXIT
. .venv/bin/activate
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 >"$LOG" 2>&1 &
SRV_PID=$!
for i in $(seq 1 30); do curl -sf -m 2 "$B/api/health" >/dev/null 2>&1 && break; sleep 1; done
echo "health: $(curl -s $B/api/health)"
echo "login: $(curl -s -X POST $B/api/teacher/login -H 'Content-Type: application/json' -d '{"username":"mrs.chen","password":"QuizZ1234!"}' | head -c 80)"
echo "enter: $(curl -s -X POST $B/api/students/enter -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}' | head -c 120)"
