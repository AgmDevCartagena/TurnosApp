# Script para detener el sistema Docker
# Sistema de Gestión Empresarial - Detener Docker

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DETENER SISTEMA DOCKER" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🛑 Deteniendo contenedores..." -ForegroundColor Yellow
docker-compose stop

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contenedores detenidos exitosamente`n" -ForegroundColor Green
    
    $eliminar = Read-Host "¿Deseas eliminar los contenedores? (S/N) [Los datos se mantendrán]"
    if ($eliminar -eq "S" -or $eliminar -eq "s") {
        Write-Host "`n🗑️  Eliminando contenedores..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ Contenedores eliminados`n" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Error al detener los contenedores" -ForegroundColor Red
}

Write-Host "========================================`n" -ForegroundColor Cyan
Read-Host "Presiona Enter para salir"
