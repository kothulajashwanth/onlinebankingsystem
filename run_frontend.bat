@echo off
title Secure Online Banking & Fund Transfer System - Stage 1 Frontend
echo =====================================================================
echo  SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM
echo  Stage 1: Frontend Demonstration Server
echo =====================================================================
echo.
echo Launching frontend server at http://localhost:8080 ...
echo Press Ctrl+C in this terminal window to stop the server.
echo.

cd /d "%~dp0frontend"

:: Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: Check if Node is available
node -v >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start http://localhost:8080
    npx -y serve -l 8080 .
    goto end
)

:: Fallback: Open index.html directly
echo Starting default browser with local file...
start index.html

:end
