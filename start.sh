#!/bin/bash

echo "========================================"
echo "  SnapTube Downloader - Starting..."
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed!"
    echo "Please install Python from https://www.python.org/downloads/"
    exit 1
fi

# Check if requirements are installed
echo "Checking dependencies..."
if ! python3 -c "import yt_dlp" 2>/dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
fi

echo ""
echo "========================================"
echo "  Server starting at http://localhost:5000"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

python3 app.py
