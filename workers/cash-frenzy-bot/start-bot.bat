@echo off
title Spinora Cash Frenzy Bot
cd /d "%~dp0"

echo.
echo ============================================================
echo   SPINORA CASH FRENZY BOT
echo ============================================================
echo.
echo   BEFORE this works you need:
echo     [x] start-chrome-for-bot.bat was run
echo     [x] VPN is ON in that Chrome window (if the panel needs it)
echo     [x] https://agentserver.cashfrenzy777.com is LOGGED IN with User List open
echo.
echo ============================================================
echo.

curl.exe -s -o nul -w "%%{http_code}" http://127.0.0.1:9229/json/version 2>nul | findstr /r "^200$" >nul
if errorlevel 1 (
  echo  ERROR: Bot Chrome is not running on port 9229.
  echo  Run start-chrome-for-bot.bat first.
  echo.
  pause
  exit /b 1
)

npm start
pause
