@echo off
title HyperVoid Debug Tool v8.0.0
cls
echo H Y P E R V O I D
echo Quantum Messaging System v8.0.0
echo.
echo.

:menu
echo [1] Start Server
echo [2] Open Visualizer
echo [3] Spawn Client
echo [4] Exit
echo.
set /p choice="Select option: "

if "%choice%"=="1" (
    start "HyperVoid Server" cmd /k "python server_v6.py"
    timeout /t 1 >nul
    start "HyperVoid Visualizer" cmd /k "python quantum_vis_server.py"
    timeout /t 2 >nul
    start "" "http://localhost:8770"
    goto menu
)
if "%choice%"=="2" (
    start "" "http://localhost:8770"
    goto menu
)
if "%choice%"=="3" (
    start "HyperVoid Client" cmd /k "python client_v6.py"
    goto menu
)
if "%choice%"=="4" (
    exit
)

goto menu
