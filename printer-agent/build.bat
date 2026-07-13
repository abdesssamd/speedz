@echo off
chcp 65001 >nul
title Compilation de l'agent d'impression SpeedZ
echo ============================================
echo   Compilation de l'agent d'impression SpeedZ
echo ============================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
  echo Installez Python depuis https://www.python.org/downloads/ ^(cochez "Add to PATH"^).
  pause
  exit /b 1
)

echo [1/3] Installation des dependances...
python -m pip install --upgrade pip >nul
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo [ERREUR] Echec de l'installation des dependances.
  pause
  exit /b 1
)

echo.
echo [2/3] Compilation de l'application ^(interface graphique^)...
python -m PyInstaller --onefile --noconsole --name SpeedZPrinter speedz_printer_gui.py
if %errorlevel% neq 0 (
  echo [ERREUR] Echec de la compilation de l'application.
  pause
  exit /b 1
)

echo.
echo [3/3] Compilation du service Windows...
python -m PyInstaller --onefile --name SpeedZPrinterService windows_service.py

echo.
echo ============================================
echo   Termine !
echo   Les executables sont dans le dossier : dist\
echo     - dist\SpeedZPrinter.exe          ^(a distribuer aux restaurants^)
echo     - dist\SpeedZPrinterService.exe   ^(pour l'installation en service^)
echo ============================================
pause
