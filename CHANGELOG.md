# 📄 CHANGELOG - Histórico de Mudanças

## [2.0.3] - 2026-03-28

### 🐛 Corrigido
- **Bug Crítico de Notificações Infinitas**: Corrigido problema onde notificações nunca desapareciam
  - **Causa raiz:** useEffect com dependência `onDismiss` que mudava a cada render, cancelando o timer repetidamente
  - **Solução:** Array de dependências vazio para garantir timer execute apenas uma vez no mount
  - Personal Records: Agora desaparecem corretamente após 10 segundos
  - Badges Earned: Timer funciona conforme esperado
  - Múltiplas notificações simultâneas: Cada uma mantém seu próprio timer independente

### 🎨 Melhorias
- Timer de 10 segundos é confiável e não é afetado por re-renders do componente pai
- Performance melhorada: Menos timers criados e cancelados desnecessariamente
- Código mais limpo com dependências explicitamente documentadas

### 📝 Comportamento
- Notificações aparecem com animação suave
- Ficam visíveis por exatos 10 segundos
- Desaparecem automaticamente com fade-out
- Múltiplas notificações empilham e desaparecem na ordem FIFO

---

## [2.0.2] - 2026-03-27

### ✨ Adicionado
- **Distância da Aula (Class Distance)**: Sistema inteligente que mostra distância percorrida especificamente na aula atual
  - Backend calcula `class_distance_m` em tempo real durante a aula
  - Frontend exibe automaticamente distância da aula quando ativa, ou distância total quando fora de aula
  - Todos os alunos começam do zero ao iniciar aula, criando competição justa
  - Histórico de distância total preservado

### 🎨 Melhorias
- Ranking de bikes agora ordena por distância da aula durante sessões ativas
- Feedback visual claro: alunos veem exatamente quantos KM pedalaram hoje

### 📝 Comportamento
- Durante aula: Mostra KM percorridos nesta sessão (começa do 0)
- Fora de aula: Mostra KM totais acumulados da bike
- Resumo de aula: Inclui distância percorrida na sessão

---

## [2.0.1] - 2026-03-27

### 🐛 Corrigido
- **Database Lock Error ao Encerrar Aula**: Corrigido erro crítico que quebrava o backend quando o instrutor clicava em "Encerrar Aula"
  - Problema: Múltiplas conexões SQLite simultâneas causavam "database is locked"
  - Solução: Refatoração de `check_badges()` para reutilizar conexão única durante toda a transação
  - Eliminada chamada recursiva de `award_xp()` dentro de badges, implementando XP inline
  - Todas operações de banco agora executam em transação atômica
  - Melhoria de performance: Menos overhead de abrir/fechar conexões

### 🔧 Alterações Técnicas
- `check_badges()` agora aceita parâmetro opcional `conn=None` para reutilizar conexões
- XP de badges é concedido inline usando a mesma conexão transacional
- Ordem de execução alterada em `end_class()`: badges verificados antes do commit final
- Documentação completa da correção em `DATABASE_LOCK_FIX.md`

---

## [2.0.0] - 2026-03-27

### ✨ Sistema Completo de Gamificação

#### 🎮 Mecânicas de Jogo
- **W/kg (Watts por Kilo)**: Normalização de potência para competição justa entre diferentes biotipos
- **Zonas de Esforço**: Sistema de 6 zonas baseadas em % do FTP individual (Z1-Z6)
  - Cores visuais: Cinza, Azul, Verde, Amarelo, Laranja (🔥), Vermelho (🔥)
  - Animação de fogo para Z5 e Z6
- **FTP (Functional Threshold Power)**: Estimado automaticamente ou calculado via teste de 20 minutos
- **Sistema de XP e Níveis**: 50 níveis progressivos com títulos (Iniciante → Lenda)
- **Badges/Conquistas**: 16 badges em 4 categorias (Primeiros Passos, Comprometimento, Performance, Elite)
- **Personal Records**: Detecção automática e celebração de recordes pessoais

#### 🏁 Modos de Jogo
1. **Sprint**: Corridas de 30s/1min/2min com ranking em tempo real por W/kg
2. **Team Battle**: Lado Direito vs Esquerdo
   - Métricas: Potência Total ou W/kg Médio
   - Placar ao vivo com barra de progresso
3. **Cadence Challenge**: Metas coletivas de RPM
   - Progresso visual de quantos alunos atingiram a meta
4. **FTP Test**: Protocolo completo de 20 minutos com cálculo automático (95% da média)

#### 📊 Tracking e Histórico
- **Class Sessions**: Histórico completo de todas as aulas
- **Class Participation**: Estatísticas individuais por aula
- **Tela de Resumo**: Exibida ao final de cada aula com:
  - XP ganho, distância percorrida, tempo em zonas
  - Badges desbloqueados, records quebrados
  - Ranking da aula

#### 🎨 Interface
- **Painel do Instrutor**: Controle centralizado de todos os modos de jogo
- **Telas Overlay**: Sprint, Team Battle, Cadence, FTP Test
- **Notificações**: Level Up, Badge Earned, Personal Record
- **Componentes Visuais**: 
  - ZoneIndicator (badges coloridos)
  - WkgBadge (rating de 1-4 estrelas)
  - BadgesGrid (coleção de conquistas)

#### 🗄️ Banco de Dados
- 9 novas tabelas criadas:
  - `student_profiles`: XP, nível, estatísticas acumuladas
  - `game_state`: Estado global do jogo
  - `badges`: Definição de badges
  - `student_badges`: Badges conquistados
  - `personal_records`: Recordes por métrica
  - `class_sessions`: Histórico de aulas
  - `class_participation`: Participação individual
  - `ftp_tests`: Testes de FTP realizados
  - `zone_time_tracking`: Tempo em cada zona

#### 🚀 Backend (Python/FastAPI)
- Módulo `gamification.py`: Funções core (W/kg, zonas, XP, níveis)
- 25+ novos endpoints REST para gamificação
- WebSocket com eventos especializados: `level_up`, `badge_earned`, `personal_record`, `class_ended`
- Cálculo automático de XP ao final da aula (base + distância + esforço)

#### ⚛️ Frontend (React)
- 12 novos componentes criados
- Integração completa com WebSocket
- Animações e transições suaves
- Design responsivo com TailwindCSS

### 🎯 Anti-Embarrassment Strategy
- Rankings por W/kg em vez de potência absoluta
- Zonas individualizadas (cada um compete contra si mesmo)
- Celebração de recordes pessoais
- Múltiplos tipos de ranking (não apenas "mais forte")

### 📝 Documentação
- `plan.md`: Plano completo de implementação
- `BUG_FIX_CLASS_END.md`: Correção do bug de XP
- `DATABASE_LOCK_FIX.md`: Correção do database lock
- `SCRIPTS_INICIALIZACAO.md`: Instruções de startup
- `start_all.bat` e `start_all.ps1`: Scripts de inicialização

### ✅ Status
- 18/18 tarefas completadas (100%)
- Sistema pronto para produção
- Zero erros de compilação

---

## [1.1.0] - 2025-10-20

### ✨ Adicionado
- **Paginação de Bikes**: Sistema de paginação mostrando 10 bikes por página
  - Navegação com botões: Primeira, Anterior, Próxima, Última página
  - Indicador visual da página atual (ex: 1/3)
  - Contador de bikes exibidas (ex: "Mostrando 1 a 10 de 25 bikes")
  - Navegação rápida por números (em telas grandes, quando há até 7 páginas)
  - Design responsivo e alinhado ao tema

### 🎨 Melhorias
- Componente `Pagination.jsx` adicionado com:
  - Ícones de navegação (setas simples e duplas)
  - Botões desabilitados automaticamente nos extremos
  - Efeitos hover elegantes
  - Cores consistentes com o tema Abitah

### 🔧 Alterações Técnicas
- `App.jsx` atualizado para gerenciar paginação
- Nova constante `BIKES_PER_PAGE = 10`
- Cálculo automático de páginas baseado no total de bikes
- Reset automático para página 1 se a página atual ficar vazia

### 📝 Comportamento
- Mostra até 10 bikes por vez
- Paginação aparece apenas quando há mais de 10 bikes
- Ao adicionar/remover bikes, a paginação se ajusta automaticamente
- Estado da página é mantido enquanto navega

---

## [1.0.0] - 2025-10-15

### 🎉 Lançamento Inicial
- Dashboard completo para monitoramento de bikes
- Backend FastAPI com WebSocket
- Frontend React com atualização em tempo real
- Design baseado na identidade Abitah Bikes
- Suporte para até 20 bikes simultâneas
- Documentação completa
- Simulador de testes incluído

---

## 🔮 Próximas Versões

### [1.2.0] - Planejado
- [ ] Busca/filtro de bikes por nome
- [ ] Ordenação (por velocidade, potência, etc.)
- [ ] Visualização em lista (alternativa ao grid)
- [ ] Configuração de bikes por página (5, 10, 20, Todas)

### [1.3.0] - Planejado
- [ ] Favoritar bikes específicas
- [ ] Alertas customizáveis
- [ ] Histórico de sessões
- [ ] Exportação de dados

---

## 📌 Legenda

- ✨ **Adicionado**: Novas funcionalidades
- 🎨 **Melhorias**: Melhorias visuais ou de UX
- 🔧 **Alterações**: Mudanças técnicas
- 🐛 **Corrigido**: Bugs corrigidos
- 🗑️ **Removido**: Funcionalidades removidas
- 📝 **Documentação**: Atualizações na documentação
- 🔒 **Segurança**: Correções de segurança
