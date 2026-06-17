@echo off
set PORT=5173
if not "%1"=="" set PORT=%1

echo Starting local server on http://127.0.0.1:%PORT%
set PORT=%PORT%
start "" "http://127.0.0.1:%PORT%"
bun run start
