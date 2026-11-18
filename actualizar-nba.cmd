@echo off
rem Doble clic: descarga datos nuevos de la NBA (SportsDataverse) y reentrena sus modelos.
rem No usa claves ni gasta cuota de API, pero el entrenamiento tarda varios minutos. No abre la web.
echo Esto descargara datos nuevos de la NBA y volvera a entrenar los modelos.
echo No gasta cuota de API, pero tarda varios minutos.
choice /c SN /m "Continuar"
if errorlevel 2 (
  echo Cancelado. No se ha descargado nada.
  pause
  exit /b 0
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp001-dashboard-deportes\scripts\marcador.ps1" -ActualizarDatos -SinFutbol -SinWeb %*
echo.
pause
