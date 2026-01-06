@echo off
echo Iniciando Bike Dashboard...

echo Iniciando Backend...
start "Bike Dashboard Backend" cmd /k "cd bike-dashboard-backend && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && python main.py"

echo Iniciando Frontend...
start "Bike Dashboard Frontend" cmd /k "cd bike-dashboard-frontend && npm run dev"

echo Aplicacao iniciada!
