@echo off
title Spinora - Chrome for Cash Frenzy Bot (VPN)
cd /d "%~dp0"

set "PROFILE=%LOCALAPPDATA%\SpinoraCashFrenzyBot"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo Could not find Google Chrome.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   CASH FRENZY BOT - CHROME SETUP
echo ============================================================
echo.
echo   This opens a SEPARATE Chrome (not your normal one) on port 9229.
echo.
echo   FIRST TIME:
echo     1. Chrome opens - install your VPN extension if the panel needs it
echo     2. Turn VPN ON in that Chrome (if required)
echo     3. Log in at https://agentserver.cashfrenzy777.com/admin/login (CAPTCHA)
echo     4. Click User List in the sidebar (NOT /admin/userManagement)
echo.
echo   EVERY TIME AFTER:
echo     1. Run this file
echo     2. Make sure the panel is logged in
echo     3. Open User List in the sidebar
echo     4. Then run start-bot.bat
echo.
echo ============================================================
echo.

start "" "%CHROME%" --remote-debugging-port=9229 --user-data-dir="%PROFILE%" "https://agentserver.cashfrenzy777.com/admin/login"

echo Chrome started on port 9229. Log in, open User List, then run start-bot.bat
pause
