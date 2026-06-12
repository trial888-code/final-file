@echo off
title Spinora - Chrome for Vegas Sweeps Bot (VPN)
cd /d "%~dp0"

set "PROFILE=%LOCALAPPDATA%\SpinoraVegasBot"
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
echo   VEGAS SWEEPS BOT - CHROME SETUP
echo ============================================================
echo.
echo   This opens a SEPARATE Chrome (not your normal one) on port 9223.
echo.
echo   FIRST TIME:
echo     1. Chrome opens - install your VPN extension if the panel needs it
echo     2. Turn VPN ON in that Chrome (if required)
echo     3. Go to: https://agent.lasvegassweeps.com/login
echo     4. Log in to the agent panel manually (handles any CAPTCHA)
echo.
echo   EVERY TIME AFTER:
echo     1. Run this file
echo     2. Make sure the panel is logged in
echo     3. Then run start-bot.bat
echo.
echo ============================================================
echo.

start "" "%CHROME%" --remote-debugging-port=9223 --user-data-dir="%PROFILE%" "about:blank"

echo Chrome started on port 9223. Open https://agent.lasvegassweeps.com/login and log in.
echo Set VEGAS_CDP_URL=http://localhost:9223 in .env, then run start-bot.bat
pause
