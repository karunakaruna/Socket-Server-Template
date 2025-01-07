@echo off
echo ╔═══════════════════════════════════════╗
echo ║     HyperVoid Quantum Messenger       ║
echo ║          Version 3.0.0                ║
echo ║   The Future of Secure Messaging      ║
echo ╚═══════════════════════════════════════╝

cd /d "%~dp0"

REM Install dependencies
python -m pip install numpy

REM Kill any existing Python processes using port 8767
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8767" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

REM Start the server
start "HyperVoid Server" cmd /c python server_v5.py

REM Start the debug tool
python debug_tool_v5.py

pause
