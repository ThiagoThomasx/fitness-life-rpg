# Sprint 17 — Training Cycles & Long-Term Progression (escopo reduzido)

Data: 2026-07-18

## Escopo

A especificação original desta sprint tinha 38 fases (modelo de ciclo, metas mensuráveis, revisão de meio de ciclo, tipos de semana, comparação entre ciclos, arquivamento, integração em Dashboard/Planner/Insights/Perfil/Histórico, matriz completa de testes e QA visual em 16 estados). Dado o tamanho e a regra do `CLAUDE.md` de manter tarefas granulares (1–4h, sem misturar múltiplas frentes), o escopo foi reduzido e confirmado com o usuário antes de implementar:

**Incluído:**
- Modelo de ciclo + persistência + invariante de ciclo único ativo
- Motor de análise (`training-cycle-summary.ts`) reaproveitando os motores das Sprints 11–16
- Criação de ciclo, card do ciclo ativo, encerramento (com observação opcional), histórico de ciclos concluídos
- Backup + testes unitários

**Deixado fora deste corte** (candidato a Sprint 17.1):
- Metas mensuráveis por ciclo (`TrainingCycleTarget`) e status de meta
- Revisão de meio de ciclo (`CycleReview`)
- Classificação manual de semana (normal/recuperação/teste/transição) e anotações por semana
- Comparação entre dois ciclos concluídos
- Arquivamento/restauração de ciclos
- Seções dedicadas em Insights ("Evolução por ciclo"), Perfil (estatísticas agregadas) e Histórico separado — a visão atual cobre isso de forma compacta dentro da aba "Ciclo" do Planner
- Matriz completa de QA visual (16 estados, desktop+mobile, `docs/screenshots/sprint17/`)

## Auditoria (Fase 1 da especificação original)

Executada via agente de exploração antes de qualquer código. Principais achados:

1. **Nenhum conceito de ciclo/bloco/programa existia.** `src/lib/training-load.ts` (Sprint 16) é explicitamente semanal (comentário no topo do arquivo). A única unidade de planejamento é `WeeklyPlan`, com apenas a semana atual persistida.
2. **Semanas são identificadas por `weekStart`** (segunda-feira, ISO date), via `getWeekStart()` em `weekly-plan.ts:9`. `training-load.ts` reexporta essa mesma fonte e adiciona `getWeekEnd`/`getWeekBoundaries`/`getPreviousWeekStart`.
3. **Sessões livres (fora do plano)** já têm um predicado limpo: `!customWorkoutIds.has(workout.workoutId)` — reaproveitado sem alteração.
4. **Quase todas as métricas de ciclo já existem** em módulos das Sprints 11–16 e só precisam de recorte por data: `getExerciseSummary`/`calculateVolumeKg`/`calculateEstimated1RM` (Sprint 12), `computeReadinessStats` (Sprint 14), `sessionVolumeKg`/`getSessionPrimaryMuscleGroups` (Sprint 16, exportados nesta sprint).
5. **Achado de débito técnico**: `getWeekStart` está duplicado de forma independente em `daily-missions.ts:53-59` (mesma lógica, mantida em paralelo). Não consolidado nesta sprint — é uma mudança em código pré-existente fora do escopo aditivo desta feature, registrada aqui para uma sprint de limpeza futura.

## Decisões Arquiteturais

### Persistência mínima, tudo o mais é derivado

`TrainingCycle` só guarda identidade e metadados (nome, objetivo, data de início, duração planejada opcional, status, notas). Volume, aderência, PRs, prontidão e tendência nunca são persistidos — são sempre recalculados por `buildCycleSummary(cycle)` a partir do histórico já existente. Isso evita qualquer risco de dessincronia entre o resumo do ciclo e os dados reais de treino.

### Um único ciclo ativo, garantido no módulo de dados

`createCycle()` recusa criar um segundo ciclo ativo (`getActiveCycle()` não nulo) em vez de confiar na UI para impedir isso — a invariante fica no lugar certo (dados), não na tela.

### Data de término efetiva

Para um ciclo ainda ativo, o "hoje" é usado como fim do intervalo de análise. Para um ciclo já concluído, `completedAt` é a fronteira — assim reabrir o histórico de um ciclo fechado nunca conta sessões posteriores ao encerramento, mesmo que o usuário continue treinando depois.

### Tendência de volume ignora a semana corrente incompleta

Bug real encontrado em QA (teste unitário, não produção): a série semanal de volume inicialmente incluía a semana em andamento de um ciclo ativo, que naturalmente tem menos volume acumulado por ainda não ter terminado — isso classificava erroneamente ciclos com crescimento real como `mixed` (falso "decreasing" na última semana parcial). Corrigido filtrando `buildWeeklyVolumeSeries` para incluir apenas semanas cujo `weekEnd <= endDate` efetivo do ciclo.

### Status de exercício dentro do ciclo

Compara a primeira × última execução do exercício dentro do intervalo do ciclo (não do histórico todo):
- `insufficient_data` — menos de 2 sessões no ciclo
- `improving` — peso máximo aumentou
- `stable` — peso máximo idêntico
- `regressing` — queda ≥ 2,5 kg (um incremento de carga)
- `stagnant` — queda menor que 2,5 kg (ruído/platô, não necessariamente regressão real)

### Reuso explícito em vez de recálculo

`training-load.ts` teve apenas a palavra `export` adicionada a helpers que já existiam e já eram testados (`sessionVolumeKg`, `sessionTotalSets`, `sessionTotalReps`, `getSessionPrimaryMuscleGroups`, `ALL_MUSCLE_GROUPS`) — nenhuma lógica nova ali, nenhuma mudança de comportamento para a Sprint 16. Isso evitou duplicar a resolução de "grupo muscular primário" (que já tem sua própria regra de desambiguação) em `training-cycle-summary.ts`.

## Arquivos criados

- `src/lib/training-cycles.ts` — modelo + storage (CRUD, validação, import para backup)
- `src/lib/training-cycle-summary.ts` — motor de análise puro
- `src/lib/training-cycles.test.ts` — 17 testes
- `src/lib/training-cycle-summary.test.ts` — 11 testes
- `src/components/plano/CycleForm.tsx` — formulário de criação
- `src/components/plano/CycleSummaryCard.tsx` — card de resumo (reusado para ciclo ativo e histórico)
- `src/components/plano/CycleSection.tsx` — orquestração da aba (estado vazio, criação, ciclo ativo, encerramento, histórico)
- `SPRINT-17.md` — este relatório

## Arquivos alterados

- `src/lib/training-load.ts` — `export` adicional em 5 helpers já existentes (sem mudança de comportamento)
- `src/lib/backup.ts` — `lrpg-fit:training-cycles` adicionado a `STORAGE_KEYS`/`ARRAY_KEYS`
- `src/lib/backup.test.ts` — seed de ciclo adicionado ao teste de round-trip
- `src/app/(dashboard)/plano/page.tsx` — nova aba "📈 Ciclo"
- `ROADMAP_SPRINTS.md` — Sprint 16 (retroativa, estava faltando) e Sprint 17 documentadas
- `CHANGELOG.md` — Sprint 16 (retroativa) e Sprint 17 documentadas

## Testes

- 28 testes novos: `training-cycles.test.ts` (17) + `training-cycle-summary.test.ts` (11)
- `backup.test.ts` estendido com seed de `lrpg-fit:training-cycles` no round-trip
- **279/279 testes no total do projeto** (251 anteriores + 28 novos)

Cobertura inclui: criação de ciclo, invariante de ciclo único ativo, rejeição de nome vazio, `customGoal` só quando `goal === 'custom'`, reabertura de novo ciclo após concluir o anterior, ordenação de histórico por data, encerramento (idempotência, observação final), `updateCycle`, `getCycleById`, import/dedup de backup; e no motor de análise: cliclo vazio, exclusão de sessões fora do intervalo, separação sessão livre × planejada, classificação de status por exercício (`improving`/`regressing`/`insufficient_data`), soma de PRs, tendência com poucos dados (`insufficient_data`), tendência crescente real, ciclo atravessando virada de ano/mês, uso de `completedAt` como fronteira em vez de "hoje".

## QA manual (dev server, `fitness-rpg` launch config)

Fluxo completo testado via Browser pane (texto/DOM, não screenshot — ver nota abaixo):
1. Estado vazio em `/plano` → aba "Ciclo" → CTA "Criar ciclo" ✓
2. Formulário preenchido (nome, objetivo "Força", data padrão hoje) → submissão ✓
3. Card do ciclo ativo com métricas zeradas corretas (`Semana 1 de 6`, sessões/PRs/volume em 0) ✓
4. "Concluir ciclo" → painel de confirmação com campo de observação ✓
5. Confirmação → ciclo desaparece do estado ativo, estado vazio retorna, ciclo aparece em "Ciclos anteriores" com "✓ Concluído" ✓
6. Refresh completo da página → estado persistido corretamente via `localStorage` ✓
7. Expansão do item de histórico → resumo completo renderizado ✓
8. Console limpo em todas as etapas (`read_console_messages`, sem erros)
9. Viewport mobile (375×812) → sem overflow horizontal de página (`document.documentElement.scrollWidth <= clientWidth`)

**Nota de ferramenta**: `computer` screenshot travou nesta máquina (comportamento conhecido, ver memória `browser-pane-screenshot-workaround`) — verificação feita via `get_page_text`/`read_page`/`read_console_messages`/`javascript_tool` em vez de captura visual. Screenshots formais (`docs/screenshots/sprint17/`) ficam para a sprint de QA visual dedicada, junto com a matriz completa de 16 estados da especificação original.

## Não regressão

Confirmado manualmente e por teste automatizado:
- XP, badges, PRs, 1RM, progressão, prontidão, ajustes de sessão, carga semanal — nenhum desses módulos foi tocado (apenas leitura via funções já existentes)
- Plano semanal (`/plano`, aba "Semana") funcionando sem alteração
- Backup antigo (sem `lrpg-fit:training-cycles`) continua importando normalmente — chave ausente é tratada como array vazio
- Nenhuma rota nova criada; nenhuma navegação principal alterada
- Nenhum ciclo/semana de recuperação aplicado automaticamente — toda ação (criar, concluir) é explícita do usuário

## Gates finais

```
npm run lint       → 0 erros
npx tsc --noEmit    → 0 erros
npm run test        → 279/279 passando
npm run build        → build de produção limpo, 15 rotas
```

## Status do Git

Nada commitado ou enviado ao remoto nesta sessão — aguardando revisão e aprovação explícita do usuário antes de `git commit`/`git push`, conforme prática já estabelecida nas sprints anteriores.
