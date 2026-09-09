@echo off
echo ========================================
echo   SnapTube Downloader - Starting...
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if requirements are installed
echo Checking dependencies...
pip show yt-dlp >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo ========================================
echo   Server starting at http://localhost:5000
echo   Press Ctrl+C to stop
echo ========================================
echo.

python app.py

pause
