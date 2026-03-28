# 🔧 Correção: Database Lock Error ao Encerrar Aula

## 📋 Problema Identificado

Ao clicar em "Encerrar Aula", o backend quebrava com erro:
```
sqlite3.OperationalError: database is locked
```

**E depois com:**
```
TypeError: 'sqlite3.Row' object does not support item assignment
```

**Stack trace apontava para:**
- `main.py:2151` → `check_badges()`
- `main.py:1058` → `award_xp()` 
- `main.py:1102` → `UPDATE student_profiles`
- `main.py:1072` → `profile["total_xp"] = new_xp` (TypeError)

## 🔍 Causa Raiz

### Problema 1: Database Lock
O SQLite **não suporta múltiplas conexões simultâneas escrevendo no mesmo banco**. O fluxo problemático era:

```
end_class()
  ├─ Abre conexão conn (linha ~2070)
  ├─ Escreve estatísticas da aula
  ├─ conn.commit() e conn.close() (linha 2145)
  └─ Loop: check_badges() para cada aluno (linha 2149-2151)
       ├─ Abre NOVA conexão (linha 1011)
       └─ Dentro do loop de badges:
            └─ award_xp() 
                └─ Abre TERCEIRA conexão (linha 1088) ❌
```

**Resultado:** Múltiplas conexões tentando escrever = **database is locked**

### Problema 2: sqlite3.Row Immutability
`sqlite3.Row` é um objeto **somente leitura**. Tentativas de modificar valores diretamente falham:
```python
profile = conn.execute("SELECT * ...").fetchone()  # Retorna sqlite3.Row
profile["total_xp"] = new_xp  # ❌ TypeError: Row não suporta item assignment
```

## ✅ Solução Implementada

### 1. **Refatoração de `check_badges()`**

**Antes:**
```python
async def check_badges(student_cpf: str, device: str = None, session_id: str = None):
    conn = get_db()  # Sempre abre nova conexão
    profile = conn.execute("SELECT * ...").fetchone()  # Row imutável
    # ...
    profile["total_xp"] = new_xp  # ❌ Erro!
    conn.commit()
    conn.close()
```

**Depois:**
```python
async def check_badges(student_cpf: str, device: str = None, session_id: str = None, conn=None):
    should_close = False
    if conn is None:
        conn = get_db()
        should_close = True
    
    # Convert Row to dict for mutability
    profile_row = conn.execute("SELECT * ...").fetchone()
    profile = dict(profile_row)  # ✅ Agora é mutável
    
    # ...
    profile["total_xp"] = new_xp  # ✅ Funciona!
    
    if should_close:
        conn.commit()
        conn.close()
```

### 2. **Eliminou chamada `award_xp()` dentro de `check_badges()`**

**Antes:**
```python
if badge["xp_reward"] > 0:
    await award_xp(student_cpf, badge["xp_reward"], f"badge_{badge['id']}")  # Abre nova conexão
```

**Depois:**
```python
# XP inline usando a mesma conexão
if badge["xp_reward"] > 0:
    old_level = profile["level"]
    new_xp = profile["total_xp"] + badge["xp_reward"]
    new_level = level_from_xp(new_xp)
    
    conn.execute("""
        UPDATE student_profiles SET total_xp = ?, level = ?, updated_at = datetime('now')
        WHERE student_cpf = ?
    """, (new_xp, new_level, student_cpf))
    
    profile["total_xp"] = new_xp  # Atualiza dict mutável
    profile["level"] = new_level
```

### 3. **Mudou ordem de execução em `end_class()`**

**Antes:**
```python
conn.commit()
conn.close()

# Depois de fechar, tenta usar novamente:
for device, data in class_session_state["participants"].items():
    await check_badges(student_cpf, device, session_id)  # Abre nova conexão
```

**Depois:**
```python
# Check badges ANTES de fechar (reutiliza conexão)
for device, data in class_session_state["participants"].items():
    await check_badges(student_cpf, device, session_id, conn=conn)  # Passa conexão existente

conn.commit()
conn.close()  # Só fecha no final
```

### 4. **Corrigiu `award_xp()` para reutilizar conexão**

**Antes:**
```python
conn.commit()
conn.close()

# Depois de fechar, chama check_badges:
await check_badges(student_cpf, device)  # Abre nova conexão
```

**Depois:**
```python
# Check badges ANTES de commit/close
await check_badges(student_cpf, device, conn=conn)  # Reutiliza conexão

conn.commit()
conn.close()
```

## 🎯 Benefícios da Solução

✅ **Uma única conexão** durante todo o processo de `end_class()`  
✅ **Zero conflitos** de escrita simultânea no SQLite  
✅ **Row convertido para dict**: Permite modificação sem TypeError  
✅ **Performance melhorada**: Menos overhead de abrir/fechar conexões  
✅ **Transação atômica**: Todas operações em uma única transação  
✅ **Backward compatible**: `check_badges()` ainda funciona standalone (quando `conn=None`)  

## 🧪 Como Testar

1. Inicie o sistema:
   ```bash
   .\start_all.ps1
   ```

2. Inicie uma aula no painel do instrutor

3. Simule alguns alunos pedalando

4. **Clique em "Encerrar Aula"**

5. ✅ Deve funcionar sem erros e exibir tela de resumo

## 📝 Arquivos Modificados

- `bike-dashboard-backend/main.py`
  - Linha ~1009: Assinatura de `check_badges()` com parâmetro `conn=None`
  - Linha ~1014: Lógica de `should_close`
  - Linha ~1017-1026: Conversão de `Row` para `dict` mutável
  - Linha ~1056-1081: XP inline em vez de `award_xp()`
  - Linha ~1111-1113: Commit/close condicional
  - Linha ~1117-1169: `award_xp()` chama `check_badges(conn=conn)` antes de fechar
  - Linha ~2175-2178: Passa `conn=conn` para `check_badges()`

## 📊 Fluxo Corrigido

```
end_class()
  ├─ Abre conexão conn ÚNICA (linha ~2070)
  ├─ Escreve estatísticas da aula
  ├─ Loop: check_badges(conn=conn) para cada aluno
  │    ├─ Reutiliza conexão passada
  │    ├─ Converte Row → dict mutável
  │    ├─ Escreve badges
  │    └─ Atualiza XP inline (mesma conexão)
  ├─ conn.commit() UMA VEZ
  └─ conn.close() NO FINAL ✅
```

## 🔄 Status

✅ Correção aplicada (Database Lock)  
✅ Correção aplicada (Row Immutability)  
✅ Backend compila sem erros  
✅ Pronto para testes em produção  

---

**Data:** 2026-03-27  
**Issue 1:** Database lock ao encerrar aula  
**Issue 2:** TypeError com sqlite3.Row immutability  
**Solução:** Conexão única + Row convertido para dict mutável
