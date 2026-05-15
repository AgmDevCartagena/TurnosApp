# Script para iniciar el sistema con Docker
# Sistema de Gestión Empresarial - Inicio con Docker

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SISTEMA DE GESTIÓN EMPRESARIAL" -ForegroundColor White
Write-Host " Inicio con Docker" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar que Docker está corriendo
Write-Host "🔍 Verificando Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Docker Desktop no está corriendo" -ForegroundColor Red
    Write-Host "   Por favor, inicia Docker Desktop e intenta de nuevo" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "✅ Docker Desktop está activo`n" -ForegroundColor Green

# Verificar si las aplicaciones React están compiladas
Write-Host "🔍 Verificando builds de React..." -ForegroundColor Yellow

$nominaBuild = Test-Path "frontend\nomina-build\index.html"
$turnosBuild = Test-Path "frontend\turnos-build\index.html"

if (-not $nominaBuild -or -not $turnosBuild) {
    Write-Host "⚠️  Los builds de React no están actualizados" -ForegroundColor Yellow
    Write-Host "   Compilando aplicaciones React...`n" -ForegroundColor Yellow
    
    # Compilar Nómina
    if (-not $nominaBuild) {
        Write-Host "📦 Compilando módulo de Nómina..." -ForegroundColor Cyan
        Set-Location "frontend\nomina-react"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al compilar Nómina" -ForegroundColor Red
            Set-Location "..\.."
            Read-Host "Presiona Enter para salir"
            exit 1
        }
        Set-Location "..\.."
        Write-Host "✅ Nómina compilada`n" -ForegroundColor Green
    }
    
    # Compilar Turnos
    if (-not $turnosBuild) {
        Write-Host "📦 Compilando módulo de Turnos..." -ForegroundColor Cyan
        Set-Location "frontend\turnos-react"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al compilar Turnos" -ForegroundColor Red
            Set-Location "..\.."
            Read-Host "Presiona Enter para salir"
            exit 1
        }
        Set-Location "..\.."
        Write-Host "✅ Turnos compilado`n" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Builds de React encontrados`n" -ForegroundColor Green
}

# Detener contenedores existentes si los hay
Write-Host "🧹 Limpiando contenedores existentes..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "✅ Limpieza completa`n" -ForegroundColor Green

# Construir imágenes
Write-Host "🏗️  Construyendo imagen Docker..." -ForegroundColor Yellow
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir la imagen Docker" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "✅ Imagen construida exitosamente`n" -ForegroundColor Green

# Iniciar contenedores
Write-Host "🚀 Iniciando contenedores..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar los contenedores" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host "✅ Contenedores iniciados`n" -ForegroundColor Green

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar estado de los contenedores
Write-Host "`n📊 Estado de los contenedores:" -ForegroundColor Cyan
docker-compose ps

# Mostrar información de acceso
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SISTEMA ACTIVO" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n🌐 ACCESO A LA APLICACIÓN:" -ForegroundColor Yellow
Write-Host "   URL: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001" -ForegroundColor Green
Write-Host "`n👤 CREDENCIALES POR DEFECTO:" -ForegroundColor Yellow
Write-Host "   Usuario: " -NoNewline -ForegroundColor White
Write-Host "admin" -ForegroundColor Green
Write-Host "   Contraseña: " -NoNewline -ForegroundColor White
Write-Host "admin" -ForegroundColor Green

Write-Host "`n🐳 COMANDOS ÚTILES:" -ForegroundColor Yellow
Write-Host "   Ver logs: " -NoNewline -ForegroundColor White
Write-Host "docker-compose logs -f" -ForegroundColor Cyan
Write-Host "   Detener: " -NoNewline -ForegroundColor White
Write-Host "docker-compose stop" -ForegroundColor Cyan
Write-Host "   Reiniciar: " -NoNewline -ForegroundColor White
Write-Host "docker-compose restart" -ForegroundColor Cyan

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Preguntar si quiere ver los logs
$verLogs = Read-Host "¿Deseas ver los logs en tiempo real? (S/N)"
if ($verLogs -eq "S" -or $verLogs -eq "s") {
    Write-Host "`n📋 Mostrando logs (presiona Ctrl+C para salir)...`n" -ForegroundColor Yellow
    docker-compose logs -f
} else {
    Write-Host "`n✅ Sistema iniciado correctamente" -ForegroundColor Green
    Write-Host "   Abre tu navegador en: http://localhost:3001`n" -ForegroundColor Cyan
}
