@echo off
:: Check if server is already running on port 4317
netstat -ano | findstr ":4317 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    :: Already running — just open the browser
    start "" "http://127.0.0.1:4317"
    exit /b
)

:: Start the dashboard server minimized, then open browser after 2s
cd /d "C:\FTC HOLDING\APPS\saywetin-extension"
start "Career Dashboard" /min cmd /c "npm run career:dashboard -- --no-open"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4317"
