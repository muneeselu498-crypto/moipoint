@echo off
rem Double-click to run Moi Point on this laptop. Close this window to stop it.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo Installing for the first time. This takes a few minutes...
  call npm install --no-audit --no-fund || (pause & exit /b 1)
)
start "" cmd /c "timeout /t 45 /nobreak >nul & start http://localhost:4600"
call npm start
pause
