#!/usr/bin/env bash
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

TOKEN=$(curl -s -X POST "$B/api/teacher/login" -H 'Content-Type: application/json' -d '{"username":"mrs.chen","password":"QuizZ1234!"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH="Authorization: Bearer $TOKEN"
QID=$(curl -s -X POST "$B/api/students/enter" -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["quizzes"][0]["_id"])')

echo "== assign single quizId (correct field) =="
curl -s -X POST "$B/api/teacher/students/6a93e88390c50de9c0fd5dc6/assign" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"quizId\":\"$QID\"}"; echo
echo "== create question (correct path) =="
curl -s -X POST "$B/api/teacher/questions" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"quizId\":\"$QID\",\"prompt\":\"Verify: 1+1=?\",\"options\":[\"1\",\"2\",\"3\",\"4\",\"5\"],\"correctOptionIndex\":1,\"order\":99}"; echo
echo "== create question bad options (should 400) =="
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/api/teacher/questions" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"quizId\":\"$QID\",\"prompt\":\"bad\",\"options\":[\"1\",\"2\"],\"correctOptionIndex\":0,\"order\":100}"
echo "== DONE =="
