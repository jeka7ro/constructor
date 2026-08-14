source backend/venv/bin/activate
set -a
source backend/.env
set +a
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &
echo $! > server.pid
sleep 3
