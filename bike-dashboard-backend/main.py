from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import asyncio
import json
from datetime import datetime
import time

app = FastAPI(title="Bike Dashboard API")

# CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Armazenamento em memória dos dados das bikes
bike_data: Dict[str, Dict[str, Any]] = {}

# Estado acumulado de cada bike (distância, energia, tempo)
bike_state: Dict[str, Dict[str, Any]] = {}

# Gerenciamento de conexões WebSocket
active_connections: List[WebSocket] = []


class BikeReading(BaseModel):
    ts: float
    src: str
    device: str
    reading: Dict[str, Any]


def calculate_speed_from_power_and_cadence(power: float, cadence: float) -> float:
    """
    Calcula a velocidade (km/h) baseada na potência (W) e cadência (RPM).
    
    Fórmula considerando:
    - Velocidade base da cadência (RPM × fator de conversão)
    - Ajuste pela potência (maior potência = maior velocidade)
    - Circunferência típica de roda de bike indoor: ~2.1m
    - Relação de marcha média: ~3.5
    """
    # Velocidade base pela cadência (km/h)
    speed_from_cadence = cadence * 2.1 * 3.5 * 60 / 1000
    
    # Fator de ajuste pela potência
    power_factor = 0.9 + (power - 80) / (250 - 80) * 0.25
    power_factor = max(0.8, min(1.2, power_factor))  # Limita entre 0.8 e 1.2
    
    # Velocidade final
    speed = speed_from_cadence * power_factor
    
    return round(speed, 1)


@app.post("/api/ftms")
async def receive_bike_data(data: BikeReading):
    """
    Endpoint para receber dados das bicicletas (ESP32)
    """
    device_name = data.device
    
    # Atualiza os dados da bike com timestamp
    bike_data[device_name] = {
        "device": device_name,
        "last_update": datetime.now().isoformat(),
        "timestamp": data.ts,
        **data.reading
    }
    
    # Broadcast para todos os clientes WebSocket conectados
    if active_connections:
        message = json.dumps({
            "type": "update",
            "device": device_name,
            "data": bike_data[device_name]
        })
        await broadcast(message)
    
    return {"status": "ok", "device": device_name}


@app.get("/api/bikes")
async def get_all_bikes():
    """
    Retorna dados de todas as bikes
    """
    return {"bikes": bike_data}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket para enviar atualizações em tempo real aos clientes
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    # Envia dados iniciais ao conectar
    await websocket.send_text(json.dumps({
        "type": "initial",
        "bikes": bike_data
    }))
    
    try:
        while True:
            # Mantém a conexão aberta
            data = await websocket.receive_text()
            
            # Pode processar mensagens do cliente se necessário
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"Cliente desconectado. Conexões ativas: {len(active_connections)}")


async def broadcast(message: str):
    """
    Envia mensagem para todos os clientes conectados
    """
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except:
            disconnected.append(connection)
    
    # Remove conexões que falharam
    for connection in disconnected:
        active_connections.remove(connection)


@app.get("/")
async def root():
    return {
        "app": "Bike Dashboard API",
        "status": "running",
        "active_bikes": len(bike_data),
        "active_connections": len(active_connections)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
