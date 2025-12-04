# 🚴‍♂️ CT Abitah Bikes - Dashboard em Tempo Real

Sistema completo de monitoramento em tempo real para até 20 bicicletas conectadas via FTMS (Fitness Machine Service).

> **👋 Primeira vez aqui?** Leia primeiro: [BEM_VINDO.md](BEM_VINDO.md)  
> **🚀 Quer começar rápido?** Vá direto para: [INICIO_RAPIDO.md](INICIO_RAPIDO.md)

## 📚 Documentação

### 🚀 Para Começar
- **[👋 BEM_VINDO.md](BEM_VINDO.md)** - **COMECE AQUI!** Introdução amigável ao projeto
- **[📋 RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md)** - Visão completa do projeto
- **[� INICIO_RAPIDO.md](INICIO_RAPIDO.md)** - Instale e rode em 10 minutos
- **[📂 ESTRUTURA_PROJETO.md](ESTRUTURA_PROJETO.md)** - Entenda a organização dos arquivos
- **[🌳 ARVORE_PROJETO.md](ARVORE_PROJETO.md)** - Visualização completa da estrutura

### 🎨 Design e Interface
- **[🎨 GUIA_VISUAL.md](GUIA_VISUAL.md)** - Como o dashboard vai parecer
- **[🌈 Paleta de Cores]** - Laranja (#f97316) + Preto (#1a1a1a)

### 🧪 Desenvolvimento e Testes
- **[🧪 TESTE_SIMULADOR.md](TESTE_SIMULADOR.md)** - Teste sem hardware real
- **[⚡ COMANDOS_UTEIS.md](COMANDOS_UTEIS.md)** - Referência rápida de comandos

### 🔧 Suporte
- **[🔧 TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solução de problemas comuns

### 📖 Documentação Técnica
- **[Backend README](bike-dashboard-backend/README.md)** - API FastAPI e WebSocket
- **[Frontend README](bike-dashboard-frontend/README.md)** - Interface React + Vite

## 📁 Estrutura do Projeto

```
Code/
├── CodigoMicroPythonBase.py      # Código MicroPython para ESP32
├── bike-dashboard-backend/        # API FastAPI + WebSocket
└── bike-dashboard-frontend/       # Interface React + Vite
```

## 🎨 Design

A interface utiliza as cores da marca Abitah Bikes:
- **Laranja (#f97316)** - Cor principal da marca
- **Preto (#1a1a1a)** - Cor de fundo e contraste
- Design moderno com gradientes e efeitos de blur
- Totalmente responsivo (mobile, tablet, desktop)

## 🚀 Instalação e Execução

### 1️⃣ Backend (FastAPI)

```powershell
# Navegar para a pasta do backend
cd bike-dashboard-backend

# Criar ambiente virtual (recomendado)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt

# Executar o servidor
python main.py
```

O servidor estará rodando em: **http://localhost:8000**

API Endpoints:
- `POST /api/ftms` - Recebe dados das bikes (ESP32)
- `GET /api/bikes` - Lista todas as bikes
- `WS /ws` - WebSocket para dados em tempo real
- `GET /` - Status da API

### 2️⃣ Frontend (React + Vite)

```powershell
# Navegar para a pasta do frontend
cd bike-dashboard-frontend

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
```

O dashboard estará acessível em: **http://localhost:3000**

Para produção:
```powershell
npm run build
npm run preview
```

### 3️⃣ Configurar ESP32 (MicroPython)

No arquivo `CodigoMicroPythonBase.py`, ajuste as configurações:

```python
# WiFi
WIFI_SSID = "Abitah_Bikes"
WIFI_PSK  = "01020304"

# URL do backend
ENDPOINT_URL = "http://SEU_IP:8000/api/ftms"

# Nome da bike (deve ser único para cada ESP32)
BIKE_NAME_SUBSTR = "BIKE-0775"
```

**Importante:** 
- Altere `SEU_IP` para o IP da máquina rodando o backend
- Cada ESP32 deve ter um `BIKE_NAME_SUBSTR` único (BIKE-0001, BIKE-0002, etc.)

## 📊 Funcionalidades

### Dashboard
- ✅ Visualização em tempo real de até 20 bikes
- ✅ Cards individuais com métricas de cada bike
- ✅ Indicador de status (ativo/inativo)
- ✅ Atualização automática via WebSocket
- ✅ Design responsivo e otimizado
- ✅ Cores baseadas na identidade visual da marca

### Métricas Exibidas
- **Velocidade instantânea** (km/h)
- **Potência** (Watts)
- **Cadência** (RPM)
- **Distância total** (km)
- **Frequência cardíaca** (BPM) - se disponível
- **Tempo decorrido** (mm:ss)
- **Energia gasta** (kcal)

### Backend
- ✅ API RESTful com FastAPI
- ✅ WebSocket para comunicação em tempo real
- ✅ Suporte para múltiplas conexões simultâneas
- ✅ Armazenamento em memória dos dados
- ✅ CORS habilitado para desenvolvimento

## 🔧 Tecnologias Utilizadas

### Backend
- **FastAPI** - Framework web moderno e rápido
- **Uvicorn** - Servidor ASGI
- **WebSockets** - Comunicação em tempo real
- **Pydantic** - Validação de dados

### Frontend
- **React 18** - Biblioteca UI
- **Vite** - Build tool rápido
- **TailwindCSS** - Framework CSS utilitário
- **Lucide React** - Ícones modernos
- **WebSocket API** - Comunicação em tempo real

### ESP32
- **MicroPython** - Python para microcontroladores
- **aioble** - BLE assíncrono
- **uasyncio** - Programação assíncrona

## 🌐 Arquitetura

```
ESP32 (Bikes) → [BLE FTMS] → ESP32 → [HTTP POST] → Backend
                                                        ↓
                                                   [WebSocket]
                                                        ↓
                                              Frontend (Browser)
```

1. ESP32 conecta via BLE às bikes FTMS
2. Dados são enviados via HTTP POST para o backend
3. Backend distribui dados via WebSocket para todos os clientes conectados
4. Frontend atualiza interface em tempo real

## 📝 Notas Importantes

- O dashboard considera uma bike **ativa** se recebeu dados nos últimos 10 segundos
- Conexão WebSocket se reconecta automaticamente em caso de falha
- Dados são mantidos em memória no backend (reiniciar = perder histórico)
- Para produção, considere adicionar banco de dados e autenticação

## 🎯 Próximos Passos (Opcional)

- [ ] Adicionar banco de dados (PostgreSQL/MongoDB)
- [ ] Implementar autenticação de usuários
- [ ] Criar histórico e gráficos de performance
- [ ] Adicionar exportação de dados (CSV/Excel)
- [ ] Implementar alertas e notificações
- [ ] App mobile (React Native)

## 📄 Licença

Este projeto foi desenvolvido para CT Abitah.

## 👨‍💻 Suporte

Para dúvidas ou problemas:
1. Verifique se o backend está rodando
2. Verifique se o frontend está conectado ao WebSocket
3. Confirme que os ESP32 estão enviando dados para a URL correta
4. Verifique os logs do console para erros
