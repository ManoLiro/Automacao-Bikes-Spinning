# 🚴 Feature: Distância da Aula (Class Distance)

## 📋 Objetivo

Mostrar a distância percorrida **durante a aula atual**, não a distância total acumulada da bike. Isso permite aos alunos verem seu progresso específico daquela sessão.

## ✨ Funcionalidade

### Backend (Python/FastAPI)

**1. Tracking da Distância Inicial**
Quando um aluno começa a pedalar durante uma aula:
```python
# Salva a distância inicial da bike
"distance_start": int(updated["total_distance"])
```

**2. Cálculo em Tempo Real**
A cada update de métricas, o backend agora calcula e envia:
```python
if class_session_state["active"] and device_name in class_session_state["participants"]:
    participant_data = class_session_state["participants"][device_name]
    class_distance_m = int(updated["total_distance"]) - participant_data.get("distance_start", 0)
    update_message["data"]["class_distance_m"] = class_distance_m
```

**3. Cálculo no Final da Aula**
Quando a aula termina:
```python
total_distance_m = current_distance - data.get("distance_start", 0)
```

### Frontend (React)

**1. Display Condicional**
A distância exibida muda automaticamente:
- **Durante aula ativa:** Mostra `class_distance_m` (distância da aula)
- **Fora de aula:** Mostra `total_distance` (distância total da bike)

```jsx
{bike.class_distance_m !== undefined 
  ? ((bike.class_distance_m || 0) / 1000).toFixed(2)  // Distância da aula
  : ((bike.total_distance || 0) / 1000).toFixed(2)}  // Distância total
```

**2. Ranking Atualizado**
O ranking de distância também usa a lógica condicional:
```jsx
const getDistance = (bike) => 
  bike.class_distance_m !== undefined 
    ? bike.class_distance_m 
    : bike.total_distance
```

## 🎯 Comportamento

### Antes de Iniciar Aula
- Dashboard mostra distância total acumulada de cada bike
- Ranking por distância total

### Durante a Aula
- ✅ Distância **zera** quando o aluno começa a pedalar
- ✅ Contador mostra apenas KM percorridos **nesta aula**
- ✅ Ranking ordena por distância da aula atual
- ✅ Cada aluno vê seu progresso específico

### Após Encerrar Aula
- Resumo de aula mostra distância percorrida
- Dashboard volta a mostrar distância total da bike
- Estatísticas salvas no banco de dados

## 📊 Exemplo de Fluxo

```
Bike123 tem 500km acumulados
├─ Aula inicia
├─ Aluno começa a pedalar
│   └─ distance_start = 500.000m
├─ Aluno pedala 5km
│   └─ Dashboard mostra: 5.00 km (não 505 km)
├─ Aula termina
│   └─ Resumo: "Você percorreu 5.00 km nesta aula!"
└─ Dashboard volta a mostrar: 505.00 km (total)
```

## 🔧 Arquivos Modificados

### Backend
- `bike-dashboard-backend/main.py`
  - Linha ~669-682: Adiciona `class_distance_m` ao WebSocket update
  - Linha ~634: Salva `distance_start` quando aluno entra na aula
  - Linha ~2097: Calcula distância da aula no final

### Frontend
- `bike-dashboard-frontend/src/components/BikeRankingList.jsx`
  - Linha ~25-34: Função `getDistance()` para escolher fonte correta
  - Linha ~221-227: Display condicional de distância

## ✅ Benefícios

✅ **Motivação:** Alunos veem progresso imediato da aula  
✅ **Competição Justa:** Todos começam do zero  
✅ **Feedback Claro:** KM percorridos hoje, não acumulado  
✅ **Histórico Preservado:** Distância total ainda é rastreada  
✅ **Zero Configuração:** Funciona automaticamente quando aula inicia  

## 🧪 Como Testar

1. Inicie o sistema:
   ```bash
   .\start_all.ps1
   ```

2. **Antes de iniciar aula:**
   - Veja que dashboard mostra distância total

3. **Inicie uma aula:**
   - Clique no painel do instrutor
   - "Iniciar Aula"

4. **Pedale com alunos:**
   - ✅ Distância deve começar de 0.00 km
   - ✅ Deve crescer conforme pedalam

5. **Encerre a aula:**
   - Resumo mostra KM percorridos na aula

6. **Após encerrar:**
   - Dashboard volta a mostrar distância total

---

**Data:** 2026-03-27  
**Feature:** Class Distance Tracking  
**Status:** ✅ Implementado e testado
