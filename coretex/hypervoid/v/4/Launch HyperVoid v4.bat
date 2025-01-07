@echo off
echo H Y P E R V O I D
echo     Quantum Messenger
echo     Version 4.0.0
echo.
echo The Future of Quantum Messaging
echo.

cd /d "%~dp0"

REM Install dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt --no-cache-dir

REM Kill any existing Python processes using ports 8767-8769
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8767" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8768" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8769" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

REM Start visualization server
start "HyperVoid Visualizer" cmd /c python quantum_vis_server.py

REM Start the main server
start "HyperVoid Server" cmd /c python server_v5.py

REM Start the debug tool
python debug_tool_v5.py
