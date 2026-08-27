@echo off
REM Phase 1 daily: content + ChatMate + MoneyBot + scoreboard.
REM Phase 0 still runs this — chat/money no-op until enabled in config.yaml.
cd /d "%~dp0"
python run.py daily
if errorlevel 1 exit /b %errorlevel%
