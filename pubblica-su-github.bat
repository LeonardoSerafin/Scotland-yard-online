@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   Pubblicazione su GitHub - Scotland Yard Tracker
echo ================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [X] Git non risulta installato.
  echo     Scaricalo da: https://git-scm.com/download/win
  echo     Poi rilancia questo file.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo - Inizializzo il repository git...
  git init
)

git config user.name  "Leonardo Serafin"
git config user.email "leo.sera3.0@gmail.com"

echo - Aggiungo i file e creo il commit...
git add -A
git commit -m "Scotland Yard Tracker" 2>nul

echo - Imposto il branch main...
git branch -M main

echo - Collego il remote GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/LeonardoSerafin/Scotland-yard-online.git

echo - Invio il codice su GitHub (potrebbe chiederti di accedere)...
git push -u origin main

echo.
echo ================================================
echo  Fatto! Se vedi 'main -> main' qui sopra, ha funzionato.
echo  Ora vai su https://vercel.com , 'Add New Project',
echo  importa la repo Scotland-yard-online e premi Deploy.
echo ================================================
echo.
pause
