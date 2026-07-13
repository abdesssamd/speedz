@echo off
chcp 65001 >nul
title Installation du service SpeedZ
echo ============================================
echo   Installation de l'agent SpeedZ en service
echo ============================================
echo.

:: Verifie les droits administrateur
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERREUR] Ce script doit etre lance en tant qu'ADMINISTRATEUR.
  echo Faites un clic droit sur ce fichier -^> "Executer en tant qu'administrateur".
  pause
  exit /b 1
)

:: IMPORTANT : ouvrez d'abord l'application SpeedZPrinter une fois pour
:: enregistrer votre token (cela cree config.json). Le service utilise ce fichier.
if not exist "%~dp0config.json" (
  echo [ATTENTION] config.json introuvable.
  echo Ouvrez d'abord SpeedZPrinter.exe, collez votre token et connectez-vous,
  echo puis relancez ce script.
  pause
  exit /b 1
)

echo Installation du service...
if exist "%~dp0dist\SpeedZPrinterService.exe" (
  "%~dp0dist\SpeedZPrinterService.exe" install
  "%~dp0dist\SpeedZPrinterService.exe" start
) else (
  python "%~dp0windows_service.py" install
  python "%~dp0windows_service.py" start
)

:: Demarrage automatique au demarrage de Windows
sc config SpeedZPrinterAgent start= auto >nul 2>&1

echo.
echo ============================================
echo   Service installe et demarre.
echo   Il se lancera automatiquement au demarrage de Windows.
echo   ^(N'ouvrez plus l'application SpeedZPrinter en meme temps
echo    pour eviter les doubles impressions.^)
echo ============================================
pause
