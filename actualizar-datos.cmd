@echo off
rem Doble clic: descarga datos nuevos de futbol y NBA y reentrena los modelos NBA.
rem Gasta cuota de las API de futbol, por eso pide confirmacion.
rem Opciones desde una terminal: actualizar-datos.cmd -SinNba ^| -SinFutbol
echo Esto descargara datos nuevos y gastara llamadas de las API de futbol.
echo La NBA se reentrena al final y tarda varios minutos.
choice /c SN /m "Continuar"
if errorlevel 2 (
  echo Cancelado. No se ha llamado a ninguna API.
  pause
  exit /b 0
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp001-dashboard-deportes\scripts\marcador.ps1" -ActualizarDatos -SinWeb %*
echo.
pause
