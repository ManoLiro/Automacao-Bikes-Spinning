@echo off
REM ==========================================
REM   Abitah Bikes - Start All Services
REM ==========================================

echo.
echo ========================================
echo   Iniciando Abitah Bikes Dashboard
echo ========================================
echo.

REM Define o diretório base
set BASE_DIR=%~dp0

echo [1/3] Iniciando Backend (Python/FastAPI)...
start "Abitah Backend" cmd /k "cd /d %BASE_DIR%bike-dashboard-backend && python main.py"
timeout /t 3 /nobreak >nul

echo [2/3] Iniciando Frontend (React/Vite)...
start "Abitah Frontend" cmd /k "cd /d %BASE_DIR%bike-dashboard-frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando Simulador (Dados Fake)...
start "Abitah Simulator" cmd /k "cd /d %BASE_DIR%bike-dashboard-backend && python simulator.py"

echo.
echo ========================================
echo   TUDO INICIADO COM SUCESSO!
echo ========================================
echo.
echo   Backend:    http://localhost:8000
echo   Frontend:   http://localhost:3000
echo   Simulador:  Rodando em background
echo.
echo   3 janelas foram abertas. Feche-as para parar os servicos.
echo.
echo   Pressione qualquer tecla para fechar esta janela...
pause >nul
