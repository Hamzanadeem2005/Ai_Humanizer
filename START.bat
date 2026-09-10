@echo off
title HumanizeAI - One Click Startup
cd /d "%~dp0"
echo ============================================================
echo           Launching HumanizeAI Application...
echo ============================================================
echo.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0setup_and_run.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Startup script exited with error code %ERRORLEVEL%.
    pause
)
