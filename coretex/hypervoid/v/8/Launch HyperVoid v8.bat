@echo off
mode con: cols=120 lines=40
title ╔═══ HyperVoid Quantum Control Center v8.0.0 ═══╗
color 0B
cls

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

REM Delete old files
if exist "ports.json" del "ports.json"
if exist "ready.txt" del "ready.txt"
if exist "hypervoid.log" del "hypervoid.log"

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
    
    REM Start supervisor
    start "HyperVoid Supervisor" cmd /k "python supervisor.py"
    
    REM Wait for ready file
    echo [⚡⚡⚡] Waiting for quantum initialization...
    :wait_for_ready
    if not exist "ready.txt" (
        timeout /t 1 >nul
        goto wait_for_ready
    )
    
    REM Read ports from JSON
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['http'])"`) do set HTTP_PORT=%%a
    
    REM Start browser
    echo [⚡⚡⚡] Opening Viewport...
    start "" "http://localhost:%HTTP_PORT%"
    goto menu
)

if "%choice%"=="2" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Server not running
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['http'])"`) do set HTTP_PORT=%%a
    echo [⚡] Opening Viewport...
    start "" "http://localhost:%HTTP_PORT%"
    goto menu
)

if "%choice%"=="3" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Server not running
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    echo.
    set /p name="Entity Designation (ENTER for random): "
    set /p duration="Temporal Duration (ENTER for infinite): "
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['websocket'])"`) do set WS_PORT=%%a
    
    if "%name%"=="" (
        if "%duration%"=="" (
            echo [☢] Spawning Random Entity...
            start "HyperVoid Client" cmd /k "python client_v8.py --port %WS_PORT%"
        ) else (
            echo [☢] Spawning Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v8.py --port %WS_PORT% --duration %duration%"
        )
    ) else (
        if "%duration%"=="" (
            echo [☢] Spawning Named Entity...
            start "HyperVoid Client" cmd /k "python client_v8.py --port %WS_PORT% --name %name%"
        ) else (
            echo [☢] Spawning Named Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v8.py --port %WS_PORT% --name %name% --duration %duration%"
        )
    )
    goto menu
)

if "%choice%"=="4" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Server not running
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    echo.
    set /p count="Swarm Size: "
    set /p duration="Swarm Duration (seconds): "
    
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
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['websocket'])"`) do set WS_PORT=%%a
    
    set /a delay=20/%count%
    if %delay% LSS 1 set delay=1
    
    echo.
    echo [⚔] Initializing Quantum Swarm Protocol...
    echo [⚔] Deploying %count% entities with %delay%ms quantum separation...
    echo.
    
    for /l %%i in (1,1,%count%) do (
        echo [⚔] Entity %%i of %count% materialized...
        start "HyperVoid Test Client %%i" cmd /k "python client_v8.py --port %WS_PORT% --name Entity_%%i --duration %duration%"
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
