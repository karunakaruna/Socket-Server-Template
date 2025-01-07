@echo off
title Quantum Network Launcher

REM Start server in a new window
start "Quantum Server" cmd /k python server_v9.py

REM Wait for server to start
timeout /t 2 /nobreak

REM Start quantum client
start "Quantum Client" cmd /k python quantum_client_simple.py
