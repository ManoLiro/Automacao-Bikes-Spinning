# 🚀 Scripts de Inicialização - Abitah Bikes

## Scripts Disponíveis

Criados 2 scripts para facilitar o início do sistema:

### 1. `start_all.bat` (Windows CMD)
**Uso:** Duplo clique no arquivo ou execute no CMD:
```cmd
start_all.bat
```

### 2. `start_all.ps1` (PowerShell)
**Uso:** Clique direito → "Executar com PowerShell" ou execute:
```powershell
.\start_all.ps1
```

---

## O Que os Scripts Fazem

Ambos scripts abrem **3 janelas separadas**:

1. **Backend (FastAPI)** 🐍
   - Porta: `http://localhost:8000`
   - Comando: `python main.py`
   - Diretório: `bike-dashboard-backend/`

2. **Frontend (React + Vite)** ⚛️
   - Porta: `http://localhost:3000`
   - Comando: `npm run dev`
   - Diretório: `bike-dashboard-frontend/`

3. **Simulador (Dados Fake)** 🎲
   - Gera dados de 20 bikes simuladas
   - Comando: `python simulator.py`
   - Diretório: `bike-dashboard-backend/`

---

## Acesso ao Sistema

Após executar o script, aguarde ~10 segundos e acesse:

🌐 **Dashboard:** http://localhost:3000

---

## Como Parar os Serviços

Feche individualmente cada janela que foi aberta (3 no total).

Ou use `Ctrl+C` em cada terminal.

---

## Troubleshooting

### Erro: "Política de Execução" (PowerShell)
Se ao executar `start_all.ps1` aparecer erro de política:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Depois execute novamente o script.

### Erro: "Python não encontrado"
Certifique-se de que Python está instalado e no PATH:
```cmd
python --version
```

### Erro: "npm não encontrado"
Certifique-se de que Node.js está instalado:
```cmd
node --version
npm --version
```

### Porta já em uso
Se as portas 8000 ou 3000 estiverem ocupadas:
- **Windows:** `netstat -ano | findstr :8000`
- Mate o processo: `taskkill /PID <PID> /F`

---

## Estrutura de Pastas

```
Automacao-Bikes-Spinning/
├── start_all.bat          ← Script CMD (Windows)
├── start_all.ps1          ← Script PowerShell
├── bike-dashboard-backend/
│   ├── main.py           ← Backend FastAPI
│   └── simulator.py      ← Simulador
└── bike-dashboard-frontend/
    └── (código React)
```

---

## Ordem de Inicialização

O script aguarda alguns segundos entre cada serviço:

1. **Backend** → Aguarda 3s
2. **Frontend** → Aguarda 5s  
3. **Simulador** → Inicia imediatamente

Isso garante que o backend esteja pronto quando o frontend tentar conectar.

---

## Logs e Debugging

Cada janela mostra os logs do respectivo serviço:

- **Backend:** Logs FastAPI/Uvicorn + requisições HTTP
- **Frontend:** Logs Vite + HMR (Hot Module Replacement)
- **Simulador:** Logs de envio de dados (POST /api/ftms)

---

## Recomendação

Use o **script PowerShell (`start_all.ps1`)** para ter colorização melhor nos logs.

---

Desenvolvido para CT Abitah 🚴‍♂️
