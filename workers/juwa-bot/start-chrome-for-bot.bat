@echo off
title Spinora - Chrome for Juwa Bot (VPN)
cd /d "%~dp0"

set "PROFILE=%LOCALAPPDATA%\SpinoraJuwaBot"
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
echo   JUWA BOT - CHROME SETUP
echo ============================================================
echo.
echo   This opens a SEPARATE Chrome (not your normal one).
echo   Juwa ONLY works when VPN is ON in THIS window.
echo.
echo   FIRST TIME:
echo     1. Chrome opens - install your VPN extension
echo        (same one you use in normal Chrome)
echo     2. Turn VPN ON in that Chrome
echo     3. Go to: https://ht.juwa777.com/login
echo     4. You must see the Juwa LOGIN page (not an error)
echo.
echo   EVERY TIME AFTER:
echo     1. Run this file
echo     2. Turn VPN ON in this Chrome
echo     3. Confirm Juwa login page loads
echo     4. Then run start-bot.bat
echo.
echo   If you use a VPN APP on Windows (Nord, Express, etc.):
echo     Turn that app ON first, BEFORE opening Chrome.
echo.
echo ============================================================
echo.

start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="%PROFILE%" "about:blank"

echo Chrome started. Connect VPN, then open https://ht.juwa777.com/login
echo When login page works, run start-bot.bat
pause
