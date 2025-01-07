@echo off
cd /d "%~dp0"
set PYTHONPATH=%~dp0
python debug_tool_v5.py server_v3.py
