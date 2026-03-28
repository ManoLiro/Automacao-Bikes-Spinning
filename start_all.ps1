# ==========================================
#   Abitah Bikes - Start All Services
# ==========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Iniciando Abitah Bikes Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define o diretório base
$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Inicia Backend
Write-Host "[1/3] Iniciando Backend (Python/FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\bike-dashboard-backend'; Write-Host 'Backend Abitah Bikes' -ForegroundColor Green; python main.py"
Start-Sleep -Seconds 3

# Inicia Frontend
Write-Host "[2/3] Iniciando Frontend (React/Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\bike-dashboard-frontend'; Write-Host 'Frontend Abitah Bikes' -ForegroundColor Green; npm run dev"
Start-Sleep -Seconds 5

# Inicia Simulador
Write-Host "[3/3] Iniciando Simulador (Dados Fake)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\bike-dashboard-backend'; Write-Host 'Simulador Abitah Bikes' -ForegroundColor Green; python simulator.py"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   TUDO INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend:    " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Frontend:   " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Simulador:  " -NoNewline -ForegroundColor White
Write-Host "Rodando em background" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3 janelas PowerShell foram abertas." -ForegroundColor Yellow
Write-Host "   Feche-as individualmente para parar os servicos." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Pressione qualquer tecla para fechar esta janela..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
