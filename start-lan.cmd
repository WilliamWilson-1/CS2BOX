@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "CASELAB_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined CASELAB_NODE set "CASELAB_NODE=%%N"
if not defined CASELAB_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "CASELAB_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined CASELAB_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "CASELAB_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined CASELAB_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "CASELAB_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined CASELAB_NODE (
  echo Node.js was not found. Install Node.js LTS from https://nodejs.org/
  echo Then double-click this script again. No npm install is required.
  pause
  exit /b 1
)
"%CASELAB_NODE%" "%~dp0scripts\serve.cjs" --lan %*
if errorlevel 1 pause
endlocal
