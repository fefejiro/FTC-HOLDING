@echo off
REM =========================================================
REM Gidi Dashers — Android AAB Build
REM Run from any directory. No args needed.
REM =========================================================
setlocal

set UNITY=C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe
set PROJECT=C:\FTC HOLDING\APPS\gidi-dashers-game
set LOG=%PROJECT%\Logs\build-android.log

echo [GidiDashers] Starting Android AAB build...
echo Log: %LOG%

"%UNITY%" ^
  -batchmode ^
  -nographics ^
  -projectPath "%PROJECT%" ^
  -executeMethod GidiDashers.Editor.BuildScript.BuildAndroid ^
  -logFile "%LOG%" ^
  -quit

if %ERRORLEVEL% equ 0 (
    echo [GidiDashers] BUILD SUCCEEDED
    echo Output: %PROJECT%\Builds\Android\GidiDashers.aab
) else (
    echo [GidiDashers] BUILD FAILED — see %LOG%
    exit /b 1
)
endlocal
