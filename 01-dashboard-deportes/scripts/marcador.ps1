<#
.SYNOPSIS
  Arranca la base de datos y la web de Marcador; con -ActualizarDatos, descarga datos nuevos.

.DESCRIPTION
  Por defecto NO llama a ninguna API: solo arranca PostgreSQL y la web.
  Las descargas, que gastan cuota de las API, solo se hacen con -ActualizarDatos.
  Pasos, en orden:
    1. Docker Desktop y PostgreSQL (docker compose).
    2. Solo con -ActualizarDatos: fútbol (football-data.org y Bzzoiro).
    3. Solo con -ActualizarDatos: NBA y entrenamiento de sus modelos.
    4. Web Next.js en una ventana aparte, y el navegador (salvo con -SinWeb).
  Si la web ya está en marcha, la reutiliza y solo abre el navegador.
  En la raíz del repositorio: iniciar-marcador.cmd arranca todo y actualizar-datos.cmd descarga datos.

.EXAMPLE
  .\marcador.ps1                                   # base de datos y web, sin llamar a las API
.EXAMPLE
  .\marcador.ps1 -ActualizarDatos -SinWeb          # descargar datos nuevos
.EXAMPLE
  .\marcador.ps1 -ActualizarDatos -SinWeb -SinNba  # descargar solo el fútbol
#>
[CmdletBinding()]
param(
  [int]$Season = 2026,
  [int]$Puerto = 3000,
  [switch]$ActualizarDatos,
  [switch]$SinFutbol,
  [switch]$SinNba,
  [switch]$SinWeb
)

# Docker and Python write progress to stderr; in Windows PowerShell 5.1 "Stop" would turn that into
# errors. Each external command is checked through its exit code instead.
$ErrorActionPreference = "Continue"
$proyecto = Split-Path -Parent $PSScriptRoot          # 01-dashboard-deportes
$web = Join-Path $proyecto "web"
$python = Join-Path $proyecto ".venv\Scripts\python.exe"
$avisos = New-Object System.Collections.Generic.List[string]

function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Ok([string]$texto) { Write-Host "    $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "    $texto" -ForegroundColor Yellow; $avisos.Add($texto) }
function Fallo([string]$texto) { Write-Host "`nERROR: $texto" -ForegroundColor Red; exit 1 }

# Runs a Python module from the project folder; exit code 2 from Bzzoiro means "partial import".
function Python([string]$descripcion, [string[]]$argumentos, [switch]$ParcialEsAviso) {
  Write-Host "    $descripcion..."
  Push-Location $proyecto
  try { & $python @argumentos; $codigo = $LASTEXITCODE } finally { Pop-Location }
  if ($codigo -eq 0) { Ok "${descripcion}: hecho." }
  elseif ($codigo -eq 2 -and $ParcialEsAviso) { Aviso "${descripcion}: quedaron partidos pendientes; se reintentarán la próxima vez." }
  else { Fallo "$descripcion terminó con el código $codigo. Lo ya importado se conserva." }
}

# Port of a "next dev" already running for this web folder, or $null.
function PuertoWebActiva {
  $carpeta = [regex]::Escape($web)
  $procesos = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match $carpeta -and $_.CommandLine -match "next" }
  foreach ($p in $procesos) {
    $escucha = Get-NetTCPConnection -OwningProcess $p.ProcessId -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($escucha) { return $escucha.LocalPort }
  }
  return $null
}

# --- Comprobaciones previas ---------------------------------------------------
if ($ActualizarDatos -and -not (Test-Path $python)) {
  Fallo "No encuentro el entorno de Python ($python). Crea .venv e instala requirements.txt en 01-dashboard-deportes."
}
if ($ActualizarDatos -and -not $SinFutbol -and -not (Test-Path (Join-Path $proyecto ".env"))) {
  Fallo "Falta 01-dashboard-deportes\.env con tus claves. Copia .env.example a .env y rellénalo."
}

# --- 1. Base de datos ---------------------------------------------------------
Paso "1/4 Base de datos"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $docker = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"),
    (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe")
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $docker) { Fallo "Docker no está en marcha y no encuentro Docker Desktop. Ábrelo a mano y vuelve a ejecutar." }
  Write-Host "    Abriendo Docker Desktop (puede tardar un minuto)..."
  Start-Process $docker
  $listo = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 3
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $listo = $true; break }
  }
  if (-not $listo) { Fallo "Docker Desktop no respondió en 3 minutos." }
}
Push-Location $proyecto
try { docker compose up -d --wait; $codigo = $LASTEXITCODE } finally { Pop-Location }
if ($codigo -ne 0) { Fallo "No se pudo arrancar PostgreSQL con docker compose." }
Ok "PostgreSQL en marcha (127.0.0.1:5433)."

# --- 2 y 3. Datos -------------------------------------------------------------
if (-not $ActualizarDatos) {
  Paso "2/4 y 3/4 Datos: sin actualizar (no se llama a ninguna API)"
} else {
  if ($SinFutbol) {
    Paso "2/4 Fútbol: omitido (-SinFutbol)"
  } else {
    Paso "2/4 Fútbol, temporada $Season"
    Python "Partidos, equipos y goleadores" @("-m", "sports_dashboard.ingest", "--competitions", "PD,PL,SA,BL1,FL1", "--seasons", "$Season")
    Python "Jugadores, alineaciones y tiros (Bzzoiro)" @("-m", "sports_dashboard.bsd", "--competitions", "PD", "PL", "SA", "BL1", "FL1", "--season", "$Season") -ParcialEsAviso
    Python "Correspondencias de equipos" @("-m", "sports_dashboard.bsd", "--mapping-file", "data/bsd_team_map.json") -ParcialEsAviso
  }
  if ($SinNba) {
    Paso "3/4 NBA: omitida (-SinNba)"
  } else {
    Paso "3/4 NBA, temporada $Season"
    Python "Partidos, jugadores y tiros" @("-m", "sports_dashboard.nba.ingest", "--season", "$Season", "--history", "10")
    Python "Entrenamiento de los modelos (varios minutos)" @("-m", "sports_dashboard.nba.train", "--season", "$Season", "--history", "10", "--shot-history", "3", "--runs", "10000")
  }
}

# --- 4. Web -------------------------------------------------------------------
if ($SinWeb) {
  Paso "4/4 Web: omitida (-SinWeb)"
} else {
  Paso "4/4 Web"
  $activo = PuertoWebActiva
  if ($activo) {
    $Puerto = $activo
    Ok "La web ya estaba en marcha en el puerto $Puerto."
  } else {
    if (-not (Test-Path (Join-Path $web ".env.local"))) {
      Copy-Item (Join-Path $web ".env.example") (Join-Path $web ".env.local") -ErrorAction Stop
      Ok "Creado web\.env.local a partir del ejemplo."
    }
    if (-not (Test-Path (Join-Path $web "node_modules"))) {
      Write-Host "    Instalando dependencias de la web (solo la primera vez)..."
      Push-Location $web
      try { npm ci; $codigo = $LASTEXITCODE } finally { Pop-Location }
      if ($codigo -ne 0) { Fallo "npm ci falló." }
    }
    # Its own window, so the server keeps running after this script ends. Close that window to stop it.
    Start-Process powershell -WorkingDirectory $web -ArgumentList @(
      "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Marcador web (cierra para parar)'; npm run dev -- -p $Puerto"
    )
    Write-Host "    Esperando a que la web responda..."
    $listo = $false
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Seconds 2
      try { Invoke-WebRequest "http://localhost:$Puerto" -UseBasicParsing -TimeoutSec 60 | Out-Null; $listo = $true; break } catch {}
    }
    if (-not $listo) { Aviso "La web tarda en arrancar; revisa su ventana si no carga." }
  }
  Start-Process "http://localhost:$Puerto"
  Ok "Abierta http://localhost:$Puerto (NBA en /nba)."
}

Write-Host ""
if ($avisos.Count) {
  Write-Host "Terminado con avisos:" -ForegroundColor Yellow
  $avisos | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
  Write-Host "Todo listo." -ForegroundColor Green
}
