#!/usr/bin/env bash
# Start the server, run end-to-end API smoke tests, then stop the server.
# Run from backend/ dir. Requires .venv + running mongod.
set -e
cd "$(dirname "$0")"

B=http://127.0.0.1:8000
LOG=/tmp/quizz-backend.log

cleanup() { kill "$SRV_PID" 2>/dev/null || true; }
trap cleanup EXIT

# Start the server in the background.
. .venv/bin/activate
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 >"$LOG" 2>&1 &
SRV_PID=$!
echo "server pid $SRV_PID"

# Wait for health.
for i in $(seq 1 30); do
  if curl -sf -m 2 "$B/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
echo "== health =="; curl -s "$B/api/health"; echo

echo "== student enter known =="
curl -s -X POST "$B/api/students/enter" -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}'; echo
echo "== student enter unknown =="
curl -s -X POST "$B/api/students/enter" -H 'Content-Type: application/json' -d '{"name":"Nobody"}'; echo

echo "== teacher login =="
LOGIN=$(curl -s -X POST "$B/api/teacher/login" -H 'Content-Type: application/json' -d '{"username":"mrs.chen","password":"QuizZ1234!"}')
echo "$LOGIN" | head -c 200; echo
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "token length: ${#TOKEN}"

echo "== teacher categories (auth) =="
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/teacher/categories" -H "Authorization: Bearer $TOKEN"
echo "== teacher categories (no auth) =="
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/teacher/categories"

echo "== student quizzes for Jamie =="
STU=$(curl -s -X POST "$B/api/students/enter" -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}')
SID=$(echo "$STU" | python3 -c 'import sys,json;print(json.load(sys.stdin)["student"]["id"])')
echo "student id $SID"
echo "$STU" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("hasQuizzes:",d["hasQuizzes"],"count:",len(d["quizzes"]));[print(" -",q["title"],q["_id"]) for q in d["quizzes"]]'

QID=$(echo "$STU" | python3 -c 'import sys,json;print(json.load(sys.stdin)["quizzes"][0]["_id"])')
echo "== spin quiz $QID =="
SPIN=$(curl -s -X POST "$B/api/quizzes/$QID/spin" -H 'Content-Type: application/json' -d "{\"studentId\":\"$SID\"}")
echo "$SPIN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("wheel:",d["wheelResult"],"served:",len(d["questionsServed"]))'
Q0=$(echo "$SPIN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["questionsServed"][0]["questionId"] if d["questionsServed"] else "")')
echo "== create attempt =="
ATT=$(curl -s -X POST "$B/api/attempts" -H 'Content-Type: application/json' -d "{\"studentId\":\"$SID\",\"quizId\":\"$QID\",\"wheelResult\":$(echo "$SPIN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["wheelResult"])'),\"questionsServed\":$(echo "$SPIN" | python3 -c 'import sys,json;print(json.dumps(json.load(sys.stdin)["questionsServed"]))')}")
AID=$(echo "$ATT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "attempt id $AID"
echo "== submit answer (wrong) =="
curl -s -X PATCH "$B/api/attempts/$AID/answer" -H 'Content-Type: application/json' -d "{\"questionId\":\"$Q0\",\"chosenOptionIndex\":0}"; echo
echo "== complete attempt =="
curl -s -X POST "$B/api/attempts/$AID/complete"; echo

echo "== teacher reports/class =="
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/teacher/reports/class" -H "Authorization: Bearer $TOKEN"

echo "== DONE =="
