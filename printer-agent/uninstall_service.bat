@echo off
chcp 65001 >nul
title Desinstallation du service SpeedZ

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Lancez ce script en tant qu'ADMINISTRATEUR.
  pause
  exit /b 1
)

echo Arret et suppression du service...
if exist "%~dp0dist\SpeedZPrinterService.exe" (
  "%~dp0dist\SpeedZPrinterService.exe" stop
  "%~dp0dist\SpeedZPrinterService.exe" remove
) else (
  python "%~dp0windows_service.py" stop
  python "%~dp0windows_service.py" remove
)

echo Service supprime.
pause
