@echo off
rem Doble clic: descarga datos nuevos de futbol (football-data.org y Bzzoiro).
rem Gasta cuota de las API de futbol, por eso pide confirmacion. No abre la web.
echo Esto descargara datos nuevos de futbol y gastara llamadas de las API
echo de football-data.org y Bzzoiro.
choice /c SN /m "Continuar"
if errorlevel 2 (
  echo Cancelado. No se ha llamado a ninguna API.
  pause
  exit /b 0
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp001-dashboard-deportes\scripts\marcador.ps1" -ActualizarDatos -SinNba -SinWeb %*
echo.
pause
