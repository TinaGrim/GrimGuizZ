#!/usr/bin/env bash
# Teacher CRUD + analytics smoke tests.
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

echo "== categories list =="
curl -s "$B/api/teacher/categories" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("count:",len(d));[print(" -",c["name"],c["id"]) for c in d[:3]]'

echo "== create category =="
NEWCAT=$(curl -s -X POST "$B/api/teacher/categories" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Calculus Preview","description":"Intro limits"}')
echo "$NEWCAT"; NEWCID=$(echo "$NEWCAT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

echo "== lessons list =="
curl -s "$B/api/teacher/lessons" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("count:",len(d))'

echo "== students list =="
curl -s "$B/api/teacher/students" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("count:",len(d))'

echo "== create student + assign =="
NEWS=$(curl -s -X POST "$B/api/teacher/students" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"New Kid"}')
echo "$NEWS"; NSID=$(echo "$NEWS" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

QID=$(curl -s "$B/api/teacher/categories" -H "$AUTH" >/dev/null 2>&1; curl -s "$B/api/students/enter" -X POST -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["quizzes"][0]["_id"])')
echo "assign quiz $QID to student $NSID"
curl -s -X POST "$B/api/teacher/students/$NSID/assign" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"quizIds\":[\"$QID\"]}"; echo

echo "== messages: teacher list + send =="
curl -s -X POST "$B/api/teacher/messages" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$NSID\",\"text\":\"Welcome to class!\"}"; echo

echo "== report for Jamie (month) =="
JSID=$(curl -s -X POST "$B/api/students/enter" -H 'Content-Type: application/json' -d '{"name":"Jamie Chen"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["student"]["id"])')
curl -s "$B/api/teacher/reports/$JSID" -H "$AUTH"; echo

echo "== create question in a quiz =="
curl -s -X POST "$B/api/teacher/quizzes/$QID/questions" -H "$AUTH" -H 'Content-Type: application/json' -d '{"quizId":"'$QID'","prompt":"Test: 1+1=?","options":["1","2","3","4","5"],"correctOptionIndex":1,"order":99}'; echo

echo "== DONE =="
