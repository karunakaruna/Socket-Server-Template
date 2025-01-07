@echo off
mode con: cols=120 lines=40
title ╔═══ HyperVoid Quantum Control Center v9.0.0 ═══╗
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
echo ║                        ▄▄▄   Quantum Messaging System v9.0.0      ▄▄▄                                 ║
echo ║                      ▄█████▄ "Hyperdimensional Communication"   ▄█████▄                               ║
echo ║                     ████████      sp³ Hybridization           ████████                                ║
echo ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝

:cleanup
echo.
echo [■■■■] Initializing Quantum Core...
echo [####] Purging Temporal Anomalies...

REM Kill all Python processes
taskkill /F /IM python.exe >nul 2>&1
timeout /t 1 >nul

REM Reset quantum network
echo [⚡⚡⚡⚡] Resetting Quantum Network...
netsh int ip reset >nul 2>&1
netsh winsock reset >nul 2>&1
timeout /t 3 >nul

REM Delete old quantum states
if exist "ports.json" del "ports.json"
if exist "ready.txt" del "ready.txt"
if exist "hypervoid.log" del "hypervoid.log"

REM Check Python installation
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [XXXX] ERROR: Python not found in quantum space
    echo [####] Please install Python and add it to PATH
    pause
    exit
)

REM Check quantum dependencies
pip show websockets >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [####] Installing quantum dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Failed to install quantum dependencies
        pause
        exit
    )
)

:menu
echo.
echo ╔═══════════════════════════════════════════╗
echo ║        QUANTUM CONTROL INTERFACE          ║
echo ╠═══════════════════════════════════════════╣
echo ║ [1] ⚛ Initialize Quantum Core            ║
echo ║ [2] 💧 Open Quantum Viewport             ║
echo ║ [3] 🔗 Spawn Quantum Entity              ║
echo ║ [4] ⚡ Deploy Entity Swarm               ║
echo ║ [5] Ψ Return to Base Reality             ║
echo ╚═══════════════════════════════════════════╝
echo.

set /p choice="Enter Quantum Command (1-5): "

if "%choice%"=="1" (
    call :cleanup
    echo.
    echo [⚛⚛⚛] Initializing Quantum Core...
    
    REM Start quantum supervisor
    start "HyperVoid Quantum Supervisor" cmd /k "python supervisor.py"
    
    REM Wait for quantum initialization
    echo [💧💧💧] Waiting for quantum initialization...
    :wait_for_ready
    if not exist "ready.txt" (
        timeout /t 1 >nul
        goto wait_for_ready
    )
    
    REM Read quantum ports
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['http'])"`) do set HTTP_PORT=%%a
    
    REM Open quantum viewport
    echo [🔗🔗🔗] Opening Quantum Viewport...
    start "" "http://localhost:%HTTP_PORT%"
    goto menu
)

if "%choice%"=="2" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Quantum Core not initialized
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['http'])"`) do set HTTP_PORT=%%a
    echo [💧] Opening Quantum Viewport...
    start "" "http://localhost:%HTTP_PORT%"
    goto menu
)

if "%choice%"=="3" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Quantum Core not initialized
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    echo.
    set /p name="Quantum Entity Designation (ENTER for random): "
    set /p duration="Temporal Duration (ENTER for infinite): "
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['websocket'])"`) do set WS_PORT=%%a
    
    if "%name%"=="" (
        if "%duration%"=="" (
            echo [🔗] Spawning Random Quantum Entity...
            start "HyperVoid Quantum Client" cmd /k "python client_v9.py --port %WS_PORT%"
        ) else (
            echo [🔗] Spawning Temporal Quantum Entity...
            start "HyperVoid Quantum Client" cmd /k "python client_v9.py --port %WS_PORT% --duration %duration%"
        )
    ) else (
        if "%duration%"=="" (
            echo [🔗] Spawning Named Quantum Entity...
            start "HyperVoid Quantum Client" cmd /k "python client_v9.py --port %WS_PORT% --name %name%"
        ) else (
            echo [🔗] Spawning Named Temporal Quantum Entity...
            start "HyperVoid Quantum Client" cmd /k "python client_v9.py --port %WS_PORT% --name %name% --duration %duration%"
        )
    )
    goto menu
)

if "%choice%"=="4" (
    if not exist "ports.json" (
        echo [XXXX] ERROR: Quantum Core not initialized
        echo [####] Please initialize Quantum Core first
        pause
        goto menu
    )
    
    echo.
    set /p count="Quantum Swarm Size: "
    set /p duration="Swarm Duration (seconds): "
    
    REM Validate quantum input
    echo %count%| findstr /r "^[1-9][0-9]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Invalid quantum swarm size
        pause
        goto menu
    )
    
    echo %duration%| findstr /r "^[1-9][0-9]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [XXXX] ERROR: Invalid quantum duration
        pause
        goto menu
    )
    
    for /f "usebackq delims=" %%a in (`type ports.json ^| python -c "import sys,json; ports=json.load(sys.stdin); print(ports['websocket'])"`) do set WS_PORT=%%a
    
    set /a delay=20/%count%
    if %delay% LSS 1 set delay=1
    
    echo.
    echo [⚡] Initializing Quantum Swarm Protocol...
    echo [⚡] Deploying %count% quantum entities with %delay%ms separation...
    echo.
    
    for /l %%i in (1,1,%count%) do (
        echo [⚡] Quantum Entity %%i of %count% materialized...
        start "HyperVoid Quantum Entity %%i" cmd /k "python client_v9.py --port %WS_PORT% --name Entity_%%i --duration %duration%"
        timeout /t %delay% >nul
    )
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo [####] Initiating Quantum Collapse...
    call :cleanup
    echo [####] Return to Base Reality Complete.
    timeout /t 2 >nul
    exit
)

goto menu
