@echo off
rem Doble clic: arranca la base de datos y la web. No llama a ninguna API ni gasta cuota.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp001-dashboard-deportes\scripts\marcador.ps1" %*
echo.
pause
