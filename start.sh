#!/bin/bash
# Pornește aplicația Pontaj Digital
# Backend pe port 8000, Frontend pe port 5678

set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

echo "🚀 Pornesc Pontaj Digital..."
echo ""

# Backend
echo "📦 Pornesc backend (port 8000)..."
(cd "$ROOT/backend" && "$ROOT/.venv/bin/python3" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!
sleep 3

# Frontend
echo "🎨 Pornesc frontend (port 5678)..."
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Aplicația pornește!"
echo "📍 Backend:  http://localhost:8000"
echo "📍 Frontend: http://localhost:5678"
echo ""
echo "Apasă Ctrl+C pentru a opri..."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
