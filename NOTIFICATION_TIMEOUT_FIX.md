# ⏱️ Correção: Timeout de Notificações

## 📋 Problema Identificado

Notificações de conquistas (Personal Records, Badges) ficavam **permanentemente** na tela sem desaparecer automaticamente, causando poluição visual.

### 🐛 Causa Raiz Identificada

O problema não era o timer em si, mas sim **dependências incorretas no useEffect**:

```jsx
// ❌ PROBLEMA - useEffect executava novamente a cada render
useEffect(() => {
  const dismissTimer = setTimeout(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 400);
  }, 10000);
  
  return () => clearTimeout(dismissTimer);
}, [onDismiss]); // ❌ onDismiss muda a cada render!
```

**Por que isso quebrava:**
1. `onDismiss` era criado inline no Container: `() => onDismiss(index)`
2. A cada render, uma **nova função** era criada
3. O useEffect detectava mudança na dependência
4. **Cancelava o timer anterior** e criava um novo
5. Timer nunca completava = notificação infinita ♾️

## ✅ Solução Implementada

### 1. Personal Record Toast & Badge Earned Toast
**Arquivo:** `PersonalRecordToast.jsx` e `BadgeEarnedToast.jsx`

```jsx
// ✅ SOLUÇÃO - useEffect executa apenas uma vez no mount
useEffect(() => {
  requestAnimationFrame(() => setIsVisible(true));
  
  const dismissTimer = setTimeout(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 400);
  }, 10000);
  
  return () => clearTimeout(dismissTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ✅ Array vazio - executa uma única vez
```

**Mudanças:**
- ✅ Dependências vazias `[]` - useEffect roda **apenas no mount**
- ✅ Timer nunca é cancelado prematuramente
- ✅ `onDismiss` é chamado após exatos 10 segundos
- ✅ Comentário eslint-disable para avisar sobre dependência omitida intencionalmente

### 2. Level Up Notification
Mantido inalterado - já funciona corretamente porque:
- Usa `notification` como dependência (correto)
- É um único objeto, não um array
- Não sofre do problema de re-criação de função

## 🎯 Comportamento Corrigido

### Antes (Bugado)
```
0s:   Notificação aparece
0.1s: Parent re-renderiza → onDismiss recriado
      → useEffect cancela timer e cria novo
0.2s: Parent re-renderiza novamente
      → Timer cancelado novamente
...   (loop infinito de cancelamento)
♾️:   Notificação NUNCA desaparece
```

### Depois (Funcionando)
```
0s:    Notificação aparece
       → useEffect cria timer ÚNICO
0.1s:  Parent re-renderiza
       → useEffect NÃO executa (deps vazias)
       → Timer continua intacto
...    
10s:   Timer completa
       → setIsExiting(true)
10.4s: Notificação removida do DOM ✅
```

## 🔧 Arquivos Modificados

### PersonalRecordToast.jsx
```diff
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
-     setTimeout(onDismiss, 400);
+     setTimeout(() => onDismiss(), 400);
    }, 10000);
    
    return () => clearTimeout(dismissTimer);
+   // eslint-disable-next-line react-hooks/exhaustive-deps
- }, [onDismiss]);
+ }, []); // Empty deps - timer should only run once on mount
```

### BadgeEarnedToast.jsx
(Mesma mudança que PersonalRecordToast.jsx)

### LevelUpNotification.jsx
✅ Sem mudanças - já funcionava corretamente

## ✅ Benefícios da Solução

✅ **Timer confiável**: Executa exatamente após 10 segundos  
✅ **Zero re-execuções**: useEffect não é afetado por re-renders  
✅ **Performance**: Menos timers criados/cancelados  
✅ **Múltiplas notificações**: Cada uma tem seu próprio timer independente  
✅ **Código limpo**: Dependências explicitamente documentadas  

## 🧪 Como Testar

1. **Personal Record - Múltiplos simultâneos:**
   - Inicie uma aula
   - Pedale forte para quebrar múltiplos recordes ao mesmo tempo
   - ✅ Cada notificação deve desaparecer após 10s
   - ✅ Não devem ficar travadas na tela

2. **Badge Earned:**
   - Complete um badge durante a aula
   - ✅ Notificação roxa deve desaparecer após 10s

3. **Level Up:**
   - Ganhe XP suficiente para subir de nível
   - ✅ Notificação centralizada deve desaparecer após 10s

4. **Teste de estresse:**
   - Quebre 4-5 recordes seguidos
   - ✅ Todas devem empilhar corretamente
   - ✅ Todas devem desaparecer na ordem (primeira que entrou, primeira que sai)

---

**Data:** 2026-03-28  
**Issue:** Notificações não desapareciam (ficavam infinitas)  
**Causa Raiz:** useEffect com dependência `onDismiss` que mudava a cada render  
**Solução:** Array de dependências vazio para timer executar apenas uma vez  
**Status:** ✅ Corrigido e testado
