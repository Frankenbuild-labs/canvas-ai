@echo off
echo Starting CanvasAI Agents Service...
echo.

cd external\agents_service

echo Checking Python dependencies...
pip install -q -r requirements.txt

echo.
echo Starting service on port 8100...
echo Press Ctrl+C to stop
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8100 --reload
