@echo off
REM Phase 2+ full stack. TrafficAgent refuses until phase >= 2.
cd /d "%~dp0"
python run.py all
if errorlevel 1 exit /b %errorlevel%
