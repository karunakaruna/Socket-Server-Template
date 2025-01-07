@echo off
mode con: cols=120 lines=40
title ╔═══ HyperVoid Quantum Control Center v8.0.0 ═══╗
color 0B
cls

:ascii_art
echo ╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║  ██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗ ██╗██████╗                              ║
echo ║  ██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██║   ██║██╔═══██╗██║██╔══██╗                             ║
echo ║  ███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║   ██║██║   ██║██║██║  ██║                             ║
echo ║  ██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗╚██╗ ██╔╝██║   ██║██║██║  ██║                             ║
echo ║  ██║  ██║   ██║   ██║     ███████╗██║  ██║ ╚████╔╝ ╚██████╔╝██║██████╔╝                             ║
echo ║  ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚═╝╚═════╝                              ║
echo ║                                                                                                        ║
echo ║                        ▄▄▄     Quantum Messaging System v8.0.0    ▄▄▄                                 ║
echo ║                      ▄█████▄   "Where Reality Meets Quantum"    ▄█████▄                               ║
echo ║                     ████████                                   ████████                                ║
echo ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝

:cleanup
echo.
echo [■■■■] Initializing Quantum Core...
echo [####] Purging Temporal Anomalies...

REM Kill all Python processes
taskkill /F /IM python.exe >nul 2>&1
timeout /t 1 >nul

REM Reset network stack
echo [⚡⚡⚡⚡] Resetting Network Stack...
netsh int ip reset >nul 2>&1
netsh winsock reset >nul 2>&1
timeout /t 3 >nul

REM Delete old port file
if exist "server_port.txt" del "server_port.txt"

REM Check Python installation
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [XXXX] ERROR: Python not found in PATH
    echo [####] Please install Python and add it to PATH
    pause
    exit
)

REM Check dependencies
pip show websockets >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [####] Installing dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Failed to install dependencies
        pause
        exit
    )
)

REM Check if ports are available
set /a PORT_CHECK=0
:check_ports
netstat -an | find "8769" >nul
if %ERRORLEVEL% EQU 0 (
    set /a PORT_CHECK+=1
    echo [####] Port 8769 still in use, waiting...
    timeout /t 2 >nul
    if %PORT_CHECK% LSS 5 goto check_ports
    echo [XXXX] ERROR: Could not free port 8769
    pause
    exit
)

netstat -an | find "8770" >nul
if %ERRORLEVEL% EQU 0 (
    set /a PORT_CHECK+=1
    echo [####] Port 8770 still in use, waiting...
    timeout /t 2 >nul
    if %PORT_CHECK% LSS 5 goto check_ports
    echo [XXXX] ERROR: Could not free port 8770
    pause
    exit
)

echo [%%%%] Stabilizing Quantum Foam...

:menu
echo.
echo ╔═══════════════════════════════════════════╗
echo ║           QUANTUM CONTROL PANEL           ║
echo ╠═══════════════════════════════════════════╣
echo ║ [1] ⚛ Initialize Quantum Core            ║
echo ║ [2] ⚡ Open Reality Viewport              ║
echo ║ [3] ☢ Spawn Quantum Entity               ║
echo ║ [4] ⚔ Deploy Entity Swarm                ║
echo ║ [5] ⚪ Return to Base Reality             ║
echo ╚═══════════════════════════════════════════╝
echo.

set /p choice="Enter Command (1-5): "

if "%choice%"=="1" (
    call :cleanup
    echo.
    echo [☢☢☢] Initializing Quantum Core...
    
    REM Start visualizer first (it will find a free port)
    echo [■■■■] Starting Visualizer...
    start "HyperVoid Visualizer" cmd /k "python quantum_vis_server.py"
    
    REM Wait for port file
    echo [⚡⚡⚡] Waiting for server initialization...
    :wait_for_port
    if not exist "server_port.txt" (
        timeout /t 1 >nul
        goto wait_for_port
    )
    
    REM Read port from file
    set /p SERVER_PORT=<server_port.txt
    
    REM Start browser
    echo [⚡⚡⚡] Opening Viewport...
    start "" "http://localhost:%SERVER_PORT%"
    goto menu
)

if "%choice%"=="2" (
    echo [⚡] Opening Viewport...
    start "" "http://localhost:8770"
    goto menu
)

if "%choice%"=="3" (
    echo.
    set /p name="Entity Designation (ENTER for random): "
    set /p duration="Temporal Duration (ENTER for infinite): "
    
    REM Check if server is running first
    netstat -an | find "8769" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Server not running
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    if "%name%"=="" (
        if "%duration%"=="" (
            echo [☢] Spawning Random Entity...
            start "HyperVoid Client" cmd /k "python client_v7.py"
        ) else (
            echo [☢] Spawning Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v7.py --duration %duration%"
        )
    ) else (
        if "%duration%"=="" (
            echo [☢] Spawning Named Entity...
            start "HyperVoid Client" cmd /k "python client_v7.py --name %name%"
        ) else (
            echo [☢] Spawning Named Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v7.py --name %name% --duration %duration%"
        )
    )
    goto menu
)

if "%choice%"=="4" (
    echo.
    set /p count="Swarm Size: "
    set /p duration="Swarm Duration (seconds): "
    
    REM Check if server is running first
    netstat -an | find "8769" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Server not running
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    REM Validate input
    echo %count%| findstr /r "^[1-9][0-9]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Invalid swarm size
        pause
        goto menu
    )
    
    echo %duration%| findstr /r "^[1-9][0-9]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Invalid duration
        pause
        goto menu
    )
    
    set /a delay=20/%count%
    if %delay% LSS 1 set delay=1
    
    echo.
    echo [⚔] Initializing Quantum Swarm Protocol...
    echo [⚔] Deploying %count% entities with %delay%ms quantum separation...
    echo.
    
    for /l %%i in (1,1,%count%) do (
        echo [⚔] Entity %%i of %count% materialized...
        start "HyperVoid Test Client %%i" cmd /k "python client_v7.py --name Entity_%%i --duration %duration%"
        timeout /t %delay% >nul
    )
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo [####] Initiating Reality Collapse...
    call :cleanup
    echo [####] Return to Base Reality Complete.
    timeout /t 2 >nul
    exit
)

goto menu
