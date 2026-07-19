# Changelog — Fitness Life RPG

## [v2 - Redesign] — Em andamento

### Decisões tomadas

- **2026-07** — Definida abordagem **híbrida** para correção do projeto: manter toda a lógica e dados da v1 (stores, cálculo de XP/PR/atributos, backup), reconstruir apenas navegação e camada visual. Motivo: a lógica de negócio da v1 foi validada como sólida; o problema foi visual/navegação e excesso de escopo (ver seção v1 abaixo).
- **2026-07** — Identidade visual definida como **dashboard de progressão física orientado a dados** (números, gráficos, métricas), explicitamente **sem** linguagem RPG/fantasia, mesmo o app se chamando "Fitness Life RPG".
- **2026-07** — Paleta de cor: tokens do `DESIGN.md` (chartreuse `#c8f169`, deep forest `#043f2e`, etc.) adaptados para **fundo escuro** (estilo Spotify/dark canvas), em vez do canvas claro/sage original do documento de referência. Motivo: reaproveitar o que funcionou no redesign Spotify da v1 (Perfil/Treinos) sem repetir a inconsistência de aplicação parcial.
- **2026-07** — Tipografia: Fraunces (display/headline) + Inter (UI/corpo), como substitutos reais de Grenette/Graphik do `DESIGN.md`.
- **2026-07** — Feature freeze declarado: nenhuma funcionalidade nova entra até o roadmap de redesign (`ROADMAP_SPRINTS.md`, Sprints 1–6) ser aceito.
- **2026-07** — Decisão de navegação tratada como spike único e travado no Sprint 1 (não iterativo), para evitar repetir o ciclo de 4 tentativas falhas de BottomNav da v1.

### Entregas

#### Sprint 18.1a (v2) — Novos tipos de meta + motor de conclusão automática — 2026-07-18

Primeira sub-sprint da Sprint 18.1 (spec original de 44 fases, dividida em sub-sprints menores para respeitar a regra de tarefas granuladas do projeto). Escopo: os 4 tipos de meta adiados na Sprint 18 (`weekly_volume`, `cycle_completion`, `personal_record`, `custom`) e um motor de conclusão automática somente-leitura. **Fora de escopo, deliberadamente**: vínculo genérico meta↔ciclo, transferência entre ciclos, integração com Planner/sessão/resumo de treino/Insights/Perfil, log de eventos de ciclo de vida, fila de notificação — ficam para sub-sprints futuras.

- **Auditoria prévia**: confirmou que o ciclo de vida de metas (pausar/retomar/concluir/reabrir/arquivar/restaurar) já estava completo e manual desde a Sprint 18 — nenhuma mudança necessária ali. Confirmou também que o projeto não tem precedente de exclusão permanente em nenhum domínio (metas ou ciclos) — decisão de não implementar exclusão de meta, apenas arquivamento.
- **Decisão arquitetural (ADR)**: `TrainingGoal` permanece um tipo único com campos opcionais por tipo, em vez de migrar para union discriminada — decisão explícita para não arriscar tocar a lógica já validada dos 5 tipos originais (regra do projeto de não mexer em lógica de negócio existente sem necessidade comprovada). `validateGoalInput`/`createGoal` funcionam como validadores discriminados sobre esse modelo único.
- **Novos módulos de progresso** (mantendo `training-goal-progress.ts` abaixo do limite de 800 linhas): `training-goal-volume-progress.ts` (janela fixa de semanas como o tipo de frequência já existente, soma volume real via `sessionVolumeKg`, suporta semanas consecutivas ou acumuladas, nunca conta a semana corrente como falha), `training-goal-cycle-progress.ts` (estado binário a partir de `TrainingCycle.completedAt` — não de `status`, já que arquivar um ciclo concluído muda o status para `archived` mas não deve "desconcluir" a meta), `training-goal-pr-progress.ts` (PR binário via as flags já existentes `isWeightPr`/`isRepsPr`/`isVolumePr` de `exercise-records.ts`, ignorando qualquer PR anterior à data de início da meta).
- **Novo `src/lib/training-goal-completion.ts`**: `evaluateGoalCompletion(goal, now?)` puro e somente-leitura — nunca persiste, nunca chama `completeGoal` (conclusão continua sempre manual). Reaproveita o motor de progresso em vez de duplicar leitura de dados brutos. Regras de segurança: só avalia metas `active`; `custom` nunca é avaliada automaticamente; ciclo só conta se `completedAt` for posterior à criação da meta (evita concluir por um ciclo já encerrado no passado antes da meta existir); semanas parciais nunca contam (herdado do motor de progresso).
- **Meta customizada**: progresso 100% manual via `updateGoalManualProgress` (0–100, clamped, só para metas `custom` ativas/pausadas) — sem baseline inferido, sem projeção, sem cálculo automático de nenhum tipo.
- **UI**: `GoalForm` ganhou campos condicionais por tipo (volume semanal-alvo + toggle de consecutividade; seletor de ciclo via `getTrainingCycles()`; seletor de tipo de recorde reaproveitando o picker de exercício existente). `GoalCard` ganhou o controle "Marcar progresso" (input numérico + Salvar), visível apenas para metas `custom` ativas/pausadas.
- 48 testes novos (`training-goal-volume-progress.test.ts` 6, `training-goal-cycle-progress.test.ts` 4, `training-goal-pr-progress.test.ts` 5, `training-goal-completion.test.ts` 11, + extensões em `training-goals.test.ts` e `training-goal-progress.test.ts`) — 461/461 no total, sem nenhuma regressão nos 413 testes pré-existentes. QA manual no dev server: criação dos 4 novos tipos pelo formulário real, controle de progresso manual testado ponta a ponta (0%→40%, marco de 25% registrado), conclusão de ciclo refletida corretamente no card, sem erros de console, desktop e mobile. Lint, typecheck e build limpos.

#### Sprint 18 (v2) — Goals, Milestones & Progress Forecasting (escopo reduzido) — 2026-07-18

Relatório completo em `SPRINT-18.md`. Primeira camada de metas pessoais de treino — transforma evolução histórica em objetivos explícitos, respondendo "qual é meu próximo objetivo e quão perto estou dele?" sem prometer resultados nem prazos garantidos.

- **Auditoria**: nenhuma meta quantitativa existia — `TrainingCycle.goal` (Sprint 17) é apenas um rótulo de categoria do ciclo, sem valor-alvo. `Campaign` (`src/lib/campaigns.ts`) já é um sistema de metas de contagem fixa com templates e **recompensa de XP** — mantido intacto como sistema conceitualmente separado, decisão confirmada com o usuário antes de implementar (Metas de treino não concede XP e não usa templates fixos).
- **Novo `src/lib/training-goals.ts`**: modelo persistente `TrainingGoal` (título, tipo, status, datas, campos específicos por tipo), storage `lrpg-fit:training-goals`. 5 tipos neste corte: `exercise_weight`, `exercise_reps`, `estimated_1rm`, `weekly_sessions`, `consistency`. CRUD completo — criar (com validação por tipo), editar, pausar, retomar, concluir (sempre manual, nunca automático), reabrir, arquivar (de active/paused/completed), restaurar (sempre para `paused`, nunca reativa sozinho), importar com deduplicação por id.
- **Novo `src/lib/training-goal-milestones.ts`**: registro histórico de marcos (25/50/75/100%) por meta, `recordMilestoneReached` idempotente por goalId+percentual — um marco batido permanece registrado mesmo que o valor caia depois (ex.: um deload reduzindo a carga não apaga o marco de 50% já conquistado).
- **Novo `src/lib/training-goal-progress.ts`**: motor puro de progresso, `calculateGoalProgress(goal, now?)`. Baseline por tipo: exercício usa o melhor registro anterior ou igual à data de início (senão o primeiro registro após a criação, com `baselineInferred` sinalizando a origem); frequência/consistência conta semanas completas desde o início, nunca tratando a semana corrente incompleta como falha. Projeção linear (`linear_recent_trend`) só aparece com amostra mínima e ritmo positivo, sempre como faixa de semanas (nunca uma data) com confiança (`low`/`medium`/`high`) e amostra explícitas; caso contrário `insufficient_data` com explicação. Reaproveita `calculateEstimated1RM` (Epley, `exercise-records.ts`) e `getWeekStart`/`getWeekEnd` (`weekly-plan.ts`/`training-load.ts`) — nenhuma fórmula duplicada.
- **Meta de repetições** (`exercise_reps`): conclusão exige carga E repetições atingidas na mesma série (`weight_kg >= alvo && reps >= alvo`), nunca extrapolando via 1RM estimado — uma série pesada com poucas repetições conta pelo valor real de repetições, não por uma estimativa derivada do 1RM.
- **UI**: nova aba "🎯 Metas" em `/plano` (sem rota nova), visualmente distinta da aba Campanhas — estado vazio, `GoalForm` progressivo por tipo (reaproveita `ExercisePickerModal` da Sprint 12 para seleção de exercício), `GoalCard` (barra de progresso, marcos, projeção, ações de ciclo de vida), `GoalsSection` agrupando Ativas/Pausadas/Concluídas/Arquivadas. `ActiveGoalsCard` novo no Dashboard com até 3 metas ativas.
- **Backup**: `lrpg-fit:training-goals` e `lrpg-fit:goal-milestones` adicionados a `STORAGE_KEYS`/`ARRAY_KEYS`, com teste de compatibilidade com backups anteriores à Sprint 18 (chaves ausentes) e rejeição de dado malformado.
- **Escopo conscientemente reduzido**, confirmado com o usuário antes de implementar: metas de volume semanal, conclusão de ciclo, recorde pessoal e customizada; vínculo formal com ciclos de treino; integração em Planner/`SessionExerciseCard`/resumo de sessão/Insights/Perfil; transferência de meta entre ciclos — ficam para uma Sprint 18.1 futura.
- 56 testes novos (`training-goals.test.ts` 28, `training-goal-milestones.test.ts` 8, `training-goal-progress.test.ts` 17, +3 em `backup.test.ts`) — 413/413 no total. QA manual no dev server (criar meta de carga → progresso 0% com baseline inferida → nova sessão → progresso recalculado, marcos 25%/50% registrados → mesmo estado refletido no card do Dashboard) sem erros de console. Build, lint, typecheck limpos. Screenshots desktop/mobile via Playwright em `docs/screenshots/sprint18/`. XP, badges, PRs, prontidão, ajustes de sessão, ciclos, campanhas e navegação principal intocados.

#### Sprint 17.1 (v2) — Cycle Reviews, Comparisons & Lifecycle Management — 2026-07-18

Relatório completo em `SPRINT-17.1.md`. Completa o ciclo de vida do sistema de ciclos da Sprint 17 — revisões subjetivas, classificação manual de semana, comparação entre dois ciclos e arquivamento/restauração — sem reescrever o núcleo já validado.

- **Revisões** (`src/lib/training-cycle-reviews.ts` + `training-cycle-review-analytics.ts`): modelo `CycleReview` (fases `mid_cycle`/`end_cycle`/`manual`, escalas 1–5 de progresso/recuperação/satisfação percebidos + nota livre), storage `lrpg-fit:cycle-reviews`. `isMidCycleReviewAvailable` detecta a metade do trajeto planejado sem bloquear o ciclo. Analytics puros calculam médias e variação entre revisão de meio de ciclo e final, sem inferir causalidade.
- **Classificação de semana** (`src/lib/training-cycle-weeks.ts` + `training-cycle-week-summary.ts`): tipos `normal`/`recovery`/`test`/`transition` por ciclo+semana (storage `lrpg-fit:cycle-week-annotations`, upsert único, semana "normal" sem nota não é persistida). `buildCycleWeekBreakdown` gera uma linha por semana (incluindo a corrente parcial); `buildWeekTypeTrendNote` explica quedas de volume coincidentes com semanas especiais em vez de tratá-las como regressão.
- **Comparação entre ciclos** (`src/lib/training-cycle-comparison.ts`): `compareCycles` puro (recebe ciclo+resumo já calculados dos dois lados, nunca recalcula) — métricas com status `higher`/`lower`/`equal`/`not_comparable`, comparação restrita a exercícios/grupos musculares compartilhados (exclusivos listados à parte), mensagens narrativas limitadas (máx. 8), nunca declara "vencedor". Amostra mínima de 4 sessões para uma comparação confiável; abaixo disso a narrativa avisa dados insuficientes em vez de comparar.
- **Arquivamento** (`archiveCycle`/`restoreCycle`/`getArchivedCycles` em `training-cycles.ts`): novo status `'archived'`; ciclo ativo precisa ser encerrado antes de arquivar; restaurar volta para `'completed'`, nunca reativa. **Exclusão permanente não implementada de propósito** — nenhum outro domínio do app tem essa funcionalidade, apenas o reset total de dados.
- **UI**: `CycleReviewForm`, `CycleReviewPrompt`, `CycleWeeksSection`, `CycleComparisonSection`, `CycleHistorySection` (substituindo a lista única por "Ciclos concluídos"/"Ciclos arquivados") dentro de `/plano`; `CurrentCycleCard` no Dashboard; `CycleEvolutionSection` em Insights (reaproveita o componente de comparação); `CycleStatsSection` no Perfil. Nenhuma rota nova.
- **Backup**: `lrpg-fit:cycle-reviews` e `lrpg-fit:cycle-week-annotations` adicionados a `STORAGE_KEYS`/`ARRAY_KEYS`, com teste explícito de compatibilidade com backups da Sprint 17 (sem os campos novos) e de rejeição de dado malformado.
- **Bug corrigido durante o QA visual**: `buildCycleWeekBreakdown` não respeitava o `completedAt` real do ciclo ao fechar a última semana de calendário, contando sessões ocorridas depois do encerramento (inconsistente com `buildCycleSummary`). Corrigido com corte em `min(weekEnd, endDate)`; teste de regressão adicionado.
- 357/357 testes no total (106 novos desde a Sprint 17). Build, lint e typecheck limpos. QA funcional completo via Browser pane + screenshots desktop/mobile via Playwright em `docs/screenshots/sprint17-1/`. XP, badges, PRs, 1RM, progressão, prontidão, ajustes de sessão, carga semanal e navegação principal intocados.

#### Sprint 17 (v2) — Training Cycles & Long-Term Progression (escopo reduzido) — 2026-07-18

Relatório completo em `SPRINT-17.md`. Primeira camada de organização de longo prazo: ciclos/blocos de várias semanas, construídos sobre os motores das Sprints 11–16 em vez de recalcular métricas.

- **Auditoria**: nenhum conceito de ciclo/bloco/programa existia no app; `training-load.ts` (Sprint 16) é estritamente semanal. `getWeekStart` estava duplicado de forma independente em `daily-missions.ts` — não consolidado nesta sprint (fora de escopo), registrado como débito técnico.
- **Novo `src/lib/training-cycles.ts`**: modelo persistente `TrainingCycle` (nome, objetivo, data de início, duração planejada opcional, status, notas), storage `lrpg-fit:training-cycles`, invariante de "apenas um ciclo ativo por vez" garantida em `createCycle`, `completeCycle` preserva dados e carimba `completedAt`.
- **Novo `src/lib/training-cycle-summary.ts`**: motor puro `buildCycleSummary` — filtra o histórico já existente pelo intervalo de datas do ciclo e reaproveita `training-load.ts` (volume/sets/reps por sessão, grupos musculares primários), `exercise-records.ts` (1RM estimado, volume), `workout-readiness.ts` (prontidão média). Deriva: sessões totais/planejadas/livres, volume total e médio semanal, PRs, prontidão média, ajustes aplicados, evolução por exercício (`improving`/`stable`/`stagnant`/`regressing`, comparando primeira × última execução no ciclo) e tendência de volume (`increasing`/`stable`/`decreasing`/`mixed`/`insufficient_data`, ignorando a semana corrente ainda incompleta para não gerar falso "decreasing").
- **`training-load.ts`**: apenas `export` adicional em helpers já existentes (`sessionVolumeKg`, `sessionTotalSets`, `sessionTotalReps`, `getSessionPrimaryMuscleGroups`, `ALL_MUSCLE_GROUPS`) para reuso pelo motor de ciclos — zero mudança de comportamento.
- **UI**: nova aba "📈 Ciclo" dentro de `/plano` (sem rota nova, respeitando a navegação travada) — estado vazio com CTA, formulário de criação (nome, objetivo, data, duração, notas), card do ciclo ativo com métricas e grupos musculares, fluxo de encerramento com observação opcional, histórico de ciclos concluídos expansível reaproveitando o mesmo card de resumo.
- **Backup**: `lrpg-fit:training-cycles` adicionado a `STORAGE_KEYS`/`ARRAY_KEYS`.
- **Escopo conscientemente reduzido**, confirmado com o usuário antes de implementar: revisão de meio de ciclo, comparação entre dois ciclos, classificação manual de tipo de semana (recuperação/teste/transição), arquivamento/restauração e seções dedicadas em Insights/Perfil/Histórico ficaram fora deste primeiro corte.
- 28 testes novos (`training-cycles.test.ts`, `training-cycle-summary.test.ts`) + seed de round-trip em `backup.test.ts` — 279/279 no total. QA manual no dev server (criar → ativo → concluir → histórico → refresh) sem erros de console, sem overflow horizontal em mobile (375px). Build, lint, typecheck limpos. XP, badges, PRs, prontidão, ajustes de sessão, plano semanal e navegação principal intocados.

#### Sprint 16 (v2) — Training Load Management & Weekly Planning Intelligence — 2026-07-14

Motor semanal puro em `src/lib/training-load.ts` (`buildTrainingWeek`, `getWeekSummaries`, `getWeeklyAggregateStats`): volume atribuído apenas ao grupo muscular primário (sem double-counting), detecção de concentração (<24h entre sessões do mesmo grupo), comparação semana-a-semana, status semanal, prioridades determinísticas (máx. 3). `session-plan-changes.ts`: storage de skip/restore manual de sessões planejadas. Componentes: `WeeklyTrainingCard` (Dashboard), `WeeklyLoadSection` (Insights), `WeeklyStatsSection` (Perfil), `WeeklyLoadOverview` (Plano). 45 testes novos, 251/251 no total. XP/badges/PRs/readiness/ajustes intocados.

#### Sprint 15 (v2) — Adaptive Session Control & Readiness Validation — 2026-07-14

**Auditoria da Sprint 14**
- `readiness-check-ins.ts`, `workout-readiness.ts`, componentes e fluxo da sessão auditados e confirmados íntegros.
- QA visual da Sprint 14 permanecia pendente; documentado em `SPRINT-15.md`.

**Novo módulo: `lib/session-adjustments.ts`**
- `SessionAdjustmentMode`: `'original' | 'conservative' | 'custom'`.
- `SessionAdjustment`: tipo completo com `weightReductionPercentage`, `setsReduction`, `restIncreaseSeconds`, `disableProgressionTargets`, `prioritizeTechnique`, `source`, `appliedAt`.
- `AppliedSessionAdjustmentSnapshot`: subconjunto imutável gravado no histórico.
- `SessionAdjustmentConfig`: config centralizada sem números mágicos (todos os presets derivados de `DEFAULT_SESSION_ADJUSTMENT_CONFIG`).
- `readinessToPreset`: alta → original; moderada → consolidação (+30s descanso, técnica, sem progressão); baixa → conservador (−10%, −1 série, +30s).
- `roundWeightDown`: arredondamento sempre para baixo ao incremento mais próximo; zero-weight preservado; sem arredondamento para cima.
- `applyAdjustmentToExercise`: aplica ajuste ao alvo de exercício; preserva originais; mínimo 1 série; zero-weight preservado.
- `buildAdjustmentSummary`, `validateAdjustment`, `toSnapshot`, `isOriginalAdjustment`, `computeAdjustmentStats`, `isValidAdjustmentSnapshot`, `adjustmentModeLabel`.

**`useSessionStore` atualizado**
- Campo `sessionAdjustment: SessionAdjustment` adicionado ao estado persistido.
- Ação `setSessionAdjustment` adicionada.
- Sessão sempre inicia com `ORIGINAL_ADJUSTMENT`; encerrada com reset completo.

**`SessionAdjustmentPanel` (novo componente)**
- Painel inline exibido na fase de treino, após o card de prontidão.
- Sem ajuste: mostra status "plano original", sugestão derivada da prontidão, botões "Aplicar sugestão" / "Personalizar".
- Com ajuste ativo: mostra modo, lista de alterações ativas, botões "Editar ajustes" / "Desfazer".
- Personalização: 4 controles (redução de carga 0/5/10/15%, séries 0/−1, descanso +0/15/30/45/60s, toggles para progressão e técnica).
- Nenhum ajuste é aplicado automaticamente; usuário sempre controla.

**`SessionExerciseCard` atualizado**
- Aceita `adjustedTarget?: AdjustedExerciseTarget | null`.
- Quando há diferença, exibe meta original riscada e meta ajustada abaixo.
- Progressão suprimida indicada textualmente ("Meta de progressão preservada para a próxima sessão.").
- Default do `AddSetForm` usa o peso ajustado quando disponível.
- Inputs continuam livres — o usuário pode registrar qualquer valor.

**`WorkoutSummaryModal` atualizado**
- Aceita `appliedAdjustment?` e `readinessLevel?`.
- Exibe seção "Estratégia da sessão" com modo, detalhes e prontidão inicial relacionada.

**`CompletedWorkout` atualizado**
- Campo `appliedSessionAdjustment?: AppliedSessionAdjustmentSnapshot` adicionado (opcional, backward-compatible).

**`ReadinessOverviewCard` (Dashboard) enriquecido**
- Aceita `adjustmentStats?: AdjustmentHistoryStats | null`.
- Exibe seção "Estratégias recentes" quando há dados dos últimos 7 dias.

**Testes**
- 52 testes novos em `session-adjustments.test.ts` (9 suítes).
- Total: 216/216 testes, 9 arquivos de teste.

**Gates**
- Lint: ✅ 0 warnings/errors
- Typecheck: ✅ 0 errors
- Testes: ✅ 216/216
- Build: ✅ sem erros

**Não regressão confirmada**
- XP, badges, PRs, recomendações da Sprint 13, prontidão da Sprint 14, navegação e histórico antigo intocados.

#### Sprint 14 (v2) — Readiness, Recovery & Adaptive Workout Guidance — 2026-07-14

**Auditoria inicial**
- `workout-recovery.ts` (Sprint 11) fornecia `recoveryPercent` por grupo muscular mas não havia integração com percepção subjetiva do usuário.
- Único dado subjetivo era `DailyLogEntry.energyLevel` no diário — não ligado à sessão de treino.
- Nenhum check-in pré-treino existia; progressão da Sprint 13 não tinha contexto de "hoje o usuário está preparado para perseguir essa meta?".

**Novo módulo: `lib/readiness-check-ins.ts`**
- `WorkoutReadinessCheckIn`: `{ id, workoutId?, createdAt, energy, soreness, sleepQuality, motivation, notes? }` com ratings 1–5.
- `saveCheckIn`, `getCheckIns`, `getCheckInById`, `getTodayCheckIns`, `getRecentCheckIns`, `importCheckIns` com validação por campo e deduplicação por `id`.
- Chave `lrpg-fit:readiness-check-ins` adicionada a `STORAGE_KEYS` e `ARRAY_KEYS` em `backup.ts`.
- `CompletedWorkout.checkInId?` adicionado para link opcional check-in → sessão (compatível com histórico antigo).

**Novo módulo: `lib/workout-readiness.ts`**
- `calculateReadiness(input)`: engine puro — combina 4 fatores objetivos (recuperação muscular 40%, frequência semanal 25%, tendência de performance 25%, volume semanal 10%) com 4 fatores subjetivos (energia, dor muscular invertida, sono, motivação) quando check-in disponível. Com check-in: 50% subjetivo + 50% objetivo. Sem check-in: 100% objetivo com confiança reduzida.
- Níveis: `high ≥ 72`, `moderate ≥ 45`, `low < 45`, `insufficient_data` (sem check-in e sem histórico).
- Confiança: `high` (check-in + ≥3 sessões), `medium` (um dos dois), `low` (nenhum).
- `getProgressionContext(level)`: integração contextual com Sprint 13 — não modifica a meta original, apenas adiciona "Meta liberada" / "Meta com cautela" / "Hoje não perseguir".
- `calculateSessionOutcome`: compara prontidão inicial × performance final → `above_expectation | aligned | below_expectation | insufficient_data`.
- `computeReadinessStats`: agrega check-ins em médias e distribuição de níveis.
- Thresholds centralizados em `ReadinessConfig` / `DEFAULT_READINESS_CONFIG` — sem números mágicos.

**Componentes novos**
- `ReadinessCheckIn.tsx`: formulário mobile-first com botões de rating 1–5, labels de escala, notas opcionais. Opções: "Avaliar prontidão" ou "Pular check-in".
- `ReadinessCard.tsx`: exibe nível, headline, explicação, fatores com ícone de impacto (+/−/·), ajustes sugeridos, botão "Editar check-in".
- `ReadinessOverviewCard.tsx` (Dashboard): distribuição de prontidão dos últimos 7 dias; estado vazio quando sem check-ins.
- `ReadinessInsightsSection.tsx` (Insights): médias subjetivas, barras de distribuição por nível, insights determinísticos com amostra mínima configurável.

**Integrações**
- Página de sessão: 3 fases (check-in → resultado com ReadinessCard + botão "Iniciar treino" → lista de exercícios). Pular check-in vai direto para o treino com avaliação objetiva. Editar check-in disponível enquanto sessão não concluída.
- `SessionExerciseCard`: nova prop `readinessHint?: string | null` — mostra orientação contextual apenas quando prontidão não é alta e o exercício tem status relevante (regressing/stagnant).
- `WorkoutSummaryModal`: prop `sessionOutcomeMessage?: string | null` — exibe resultado comparativo apenas quando prontidão foi avaliada.
- Dashboard: `ReadinessOverviewCard` na coluna direita.
- Insights: `ReadinessInsightsSection` após `TrainingIntelligenceSection`.
- Perfil: seção "Prontidão" com total de check-ins, distribuição e médias de energia/sono.

**Testes**
- 39 testes novos em `workout-readiness.test.ts` cobrindo: todos os níveis de prontidão, fatores subjetivos/objetivos, confiança, ajustes, integração com progressão, outcome de sessão, computeReadinessStats, backup e compatibilidade com histórico antigo.
- Total: 164 testes, 8 arquivos, todos passando.

**Não regressão confirmada**
- XP: intocado.
- Badges: intocados.
- PRs: intocados.
- Recomendações Sprint 13: intactas (apenas interpretação contextual adicionada).
- Workout Planner Sprint 11: intocado.
- Sessões antigas: abertas sem quebra (`checkInId` opcional).
- Backup antigo: importado sem erro (nova chave simplesmente ausente).
- Backup novo: round-trip correto.
- Nenhuma rota criada; navegação não alterada.
- Build, lint, typecheck: limpos.

#### Sprint 13 (v2) — Progressive Overload & Training Intelligence — 2026-07-14

**Auditoria inicial**
- `lib/progression.ts` existia com lógica básica de uma regra: se todas as séries atingiram 10 reps, aumenta o peso; caso contrário, sugere mais 1 rep. Sem análise multi-sessão, sem detecção de estagnação/regressão, sem confiança.
- `lib/exercise-records.ts` já tinha `getStagnantExercises` e `getTopGrowthExercises` mas baseados apenas no delta entre sessão mais antiga e mais recente (não em sequência consecutiva), e sem expor isso para a UI de treino.
- `SessionExerciseCard` recebia `suggestion: ProgressionSuggestion` e mostrava apenas `suggestion.note` em texto plano — sem "próxima meta" visual, sem confiança, sem diferenciação entre tipos de recomendação.
- `ExerciseHistoryModal` mostrava `suggestion.note` em um `stat-cell` — sem bloco dedicado, sem nível de confiança, sem contexto do tipo de progressão sugerido.
- Dashboard não tinha card de "próximos desafios" — só `RecentRecordsCard` (PRs passados).
- Insights não tinha seção de inteligência de treino — só `ExerciseGrowthSection` (crescimento bruto de carga desde a primeira sessão).
- Perfil não tinha stats de inteligência (exercícios evoluindo/estagnados, PRs da semana, comparação de volume).

**Novo módulo: `lib/workout-intelligence.ts`**
- `WorkoutRecommendation`: tipo central com `type` (5 valores), `suggestedWeight`, `suggestedReps`, `confidence` (low/medium/high), `reason`.
- `ExerciseStatus`: `'improving' | 'stable' | 'stagnant' | 'regressing' | 'insufficient_data'`
- `generateRecommendation(exerciseId, config?)`: engine principal — detecta regression (queda consecutiva por N sessões), stagnation (mesmo peso por N sessões), e progride via `increase_weight` / `increase_reps` / `maintain` / `deload`. Confiança sobe com o número de sessões (1 → low, 2 → medium, 3+ → high). Incrementos de peso: +1kg (<20kg), +2.5kg (20–60kg), +5kg (>60kg). Config injetável para stagnationThreshold/regressionThreshold (default 5/3).
- `getExerciseStatus(exerciseId)`: status por exercício usando os mesmos detectores internos.
- `getAllExerciseIntelligence()`: agrega status + recomendação para cada exercício único do histórico.
- `getTopChallenges(limit)`: filtra exercícios com `suggestedWeight` e ordena por status (improving > stable > stagnant > regressing).
- `getWeeklyIntelligenceSummary()`: compara semana atual vs anterior (PRs, volume em kg), conta exercícios por status.
- Toda lógica é pura — sem efeitos colaterais. UI apenas consome, nunca calcula.

**Testes: `lib/workout-intelligence.test.ts`**
- 30 testes cobrindo: sem histórico, sessão única, 2 e 3+ sessões, bodyweight, deload (queda >10%), maintain (queda pequena), stagnation com reps atingidas, stagnation sem reps atingidas, threshold configurável, séries vazias, getExerciseStatus (todos os 5 estados), getAllExerciseIntelligence, getTopChallenges, getWeeklyIntelligenceSummary, suggestWeightIncrease (3 faixas de incremento).
- Suíte completa: 125 testes, 7 arquivos, 100% verde.

**Componentes criados**
- `src/components/dashboard/NextChallengesCard.tsx` — card "Próximos Desafios" mostrando até 5 exercícios com ícone de status + meta formatada (peso × reps), com empty state quando sem histórico ponderado.
- `src/components/insights/TrainingIntelligenceSection.tsx` — seção de inteligência nos Insights, agrupando exercícios por status em cards coloridos (improving/stable/stagnant/regressing), com contagem e metas sugeridas.
- `src/components/profile/IntelligenceStatsSection.tsx` — grid 2×2 no Perfil: exercícios evoluindo, exercícios estagnados, PRs desta semana, variação de volume vs semana anterior.

**Componentes modificados**
- `SessionExerciseCard.tsx`: substituído `suggestion: ProgressionSuggestion` por `recommendation: WorkoutRecommendation`. Adicionada linha "Próxima meta: Xkg × Y" com ícone de confiança (🎯 high / 📊 medium / 💡 low), separada do campo "Última vez". AddSetForm pré-preenchido via `recommendation.suggestedWeight` e `recommendation.suggestedReps`.
- `ExerciseHistoryModal.tsx`: bloco dedicado de "Próxima sessão" com tipo de recomendação, meta formatada, e `reason`. Substituído `suggestProgression` por `generateRecommendation`.
- `sessao/page.tsx`: substituído `suggestProgression` por `generateRecommendation` (mesma assinatura simplificada, sem precisar do `targetWeightKg` do plano — a inteligência infere do histórico).

**Pages modificadas**
- `dashboard/page.tsx`: `NextChallengesCard` inserido após `RecentRecordsCard`.
- `insights/page.tsx`: `TrainingIntelligenceSection` inserido após `ExerciseGrowthSection`; `getAllExerciseIntelligence()` computado no `useEffect` junto com `computeInsights()`.
- `perfil/page.tsx`: `IntelligenceStatsSection` inserido como nova seção "Inteligência de treino" após "Recordes"; dados computados no `useEffect` já existente.

**Não alterado**
- Fórmula de XP (`lib/workout.ts`) — intocada.
- Badges — intocadas.
- Navegação — intocada.
- `lib/exercise-records.ts` — intocado (stagnation detection do módulo novo usa algoritmo diferente/mais preciso mas não substitui o existente).
- Backup (`lib/backup.ts`) — intocado.
- Compatibilidade com histórico antigo — garantida: campos novos são opcionais, lógica lê apenas `sets` existentes.

**QA**
- Dashboard: `NextChallengesCard` renderiza empty state "Complete alguns treinos para ver seus próximos desafios" — correto sem histórico.
- Insights: seção `TrainingIntelligenceSection` não renderiza quando não há grupos ativos — correto.
- Perfil: `IntelligenceStatsSection` renderiza apenas quando `weekSummary !== null` — correto.
- TypeScript: `npx tsc --noEmit` — zero erros.
- Build: `npx next build` — limpo, zero warnings.
- Testes: `npx vitest run` — 125/125 passando.

#### Sprint 9 (v2) — Dashboard: Estabilidade de Hydration e Consolidação Visual — 2026-07-12

**Auditoria**
- Dashboard já estava componentizado desde o Sprint 1 (`src/components/dashboard/`) — não havia monólito para quebrar. Toda a lógica de dados (XP, nível, missões, plano semanal, badges) já vinha de `useCharacterStore`/`useBadgeStore`/`lib/*` via `useEffect`, com skeletons já em uso (`SkeletonCard`) para os dados assíncronos. O único ponto fora do padrão era `DashboardHero.tsx`.
- **Causa raiz da dívida #425/#418/#423** (dois bugs distintos, não um só — ver [[hydration-debug-playbook]] atualizado):
  1. **Mismatch real (erro no console)**: `getGreeting()` (`new Date().getHours()`) e `today` (`new Date().toISOString()`) eram calculados **direto no render** de `DashboardHero.tsx`. `/dashboard` e `/treinos` são prerenderizados estaticamente (`○ Static` no build do Next 14) — o HTML fica congelado na hora/timezone do build (Vercel), divergindo do relógio local do navegador do usuário. O mesmo bug existia, sem nunca ter sido notado, em `WorkoutsHero.tsx` (`/treinos`), que reusa `lib/greeting.ts` desde o Sprint 8.
  2. **Flash de mock/zerado (sem erro, mas visualmente incorreto)**: `useCharacterStore` usa `persist` (Zustand v5). O binding React usa `useSyncExternalStore` com `getServerSnapshot` apontando para o estado pré-hidratação (`character: null`) — o primeiro render do cliente nunca diverge do SSR (por isso nenhum mismatch de personagem chegava a aparecer), mas mostra Nv 1 / 0 XP (fallback `MOCK_CHARACTER`) até o próximo render, quando o valor real da store assume. Confirmado por inspeção do código-fonte do zustand: gatear isso só com `store.persist.hasHydrated()` não funciona, porque a store reidrata de forma síncrona no import do módulo — `hasHydrated()` já é `true` no primeiro render committed.
- Uma branch anterior não mergeada (`claude/festive-ritchie-518fb3`) tinha um commit chamado "fix: calcular saudação do Dashboard após mount", mas só inlinhava a função sem adicionar mount-gating — não resolvia o bug. Descartada como referência.

**Solução implementada**
- `src/hooks/useHasHydrated.ts` (novo, reutilizável): `useMounted()` para valores client-only (hora/data) e `useHasHydrated(store)` para stores Zustand com `persist`, lendo `store.persist.hasHydrated()` + `onFinishHydration`.
- `src/lib/greeting.ts`: adicionado `useGreeting()` (hook) ao lado de `getGreeting()` (função pura já existente) — retorna `""` até montar, elimina o mismatch nos dois consumidores (`DashboardHero`, `WorkoutsHero`) a partir de um único ponto, sem duplicar a lógica de mount-gating.
- `src/components/dashboard/DashboardHero.tsx`: `getGreeting()` → `useGreeting()`; `today` (usado só para destacar o dia atual na barra semanal) passa a ser calculado apenas após montar, com `""` como valor estável no primeiro render.
- `src/components/workouts/WorkoutsHero.tsx`: mesma troca (`getGreeting()` → `useGreeting()`), fechando a mesma dívida em `/treinos`.
- `src/stores/useCharacterStore.ts`: `skipHydration: true` no `persist` — a reidratação deixa de ser automática no import do módulo e passa a ser disparada explicitamente, tornando `hasHydrated()` um sinal confiável para gatear UI (começa `false` nos dois lados, só vira `true` após o rehydrate real no cliente). **Nenhuma chave de storage, contrato de ação ou lógica de XP/nível foi alterada** — só o momento da hidratação.
- `src/components/layout/StoreHydrationBoundary.tsx` (novo, client component): dispara `useCharacterStore.persist.rehydrate()` uma única vez em `useEffect`, montado no layout raiz de `(dashboard)` — cobre todas as rotas que leem a store (Dashboard, Treinos, Perfil, Insights, Diário, Nutrição, Plano, Sessão), evitando implementar hidratação duplicada por tela.
- `src/app/(dashboard)/dashboard/page.tsx`: `DashboardHero` passa a ser gateado por `useHasHydrated(useCharacterStore)`, mostrando `SkeletonCard` (altura equivalente ao card real) em vez do personagem mock até os dados persistidos chegarem.

**Não alterado** (conforme regra da sprint): cálculo de XP/nível/PR, critérios de badge, estrutura de dados persistidos, chaves de `localStorage`, fluxo de reward toast/level-up (o guard existente contra repetição do modal continua intacto e foi revalidado).

**QA (Playwright + msedge, contra `next build && next start` — ver [[browser-pane-screenshot-workaround]])**
- 3 timezones (`Asia/Tokyo`, `America/Sao_Paulo`, `UTC`) em `/dashboard`: saudação correta por timezone, **0 erros de console** em todas.
- `/treinos`: mesma verificação de timezone, **0 erros de console**.
- Cenários: usuário novo (vazio, onboarding), usuário populado (Nv 12, atributos, XP, missões), refresh duplo (persistência confirmada, sem repetir LevelUpModal), level-up genuíno (`prevLevel < level`, modal aparece corretamente uma única vez), mobile 390px, desktop 1440px, e regressão nas demais rotas que leem `useCharacterStore` (`/perfil`, `/insights`, `/diario`, `/nutricao`, `/plano`, `/configuracoes`) — 0 erros em todas.
- Screenshots em `docs/screenshots/sprint9/`: `hydration-Asia-Tokyo.png`, `hydration-America-Sao_Paulo.png`, `hydration-UTC.png`, `dashboard-populated-mobile.png`, `dashboard-empty-desktop.png`, `dashboard-after-refresh.png`.
- `npm run lint`, `npx tsc --noEmit` e `npm run build` limpos.

**Pendências documentadas (não resolvidas nesta sprint)**
- Consolidação visual em `dashboard.css`: os componentes do Dashboard já usam 100% tokens (`var(--color-*)`) — **0 hardcodes hex/rgba** — mas ainda usam `style={{...}}` inline em vez de classes dedicadas, ao contrário de `diary.css`/`nutrition.css`/`workouts.css`. Não migrado nesta sprint para não expandir o escopo/risco de uma mudança já grande o suficiente; fica como item de backlog visual (não é dívida de hydration).
- Sem framework de testes automatizado no projeto (mantém-se o padrão dos sprints anteriores — QA via Playwright manual/scriptado substitui suíte automatizada).
- `.claude/launch.json` ganhou uma segunda configuração (`fitness-rpg-prod`, porta 3100, `next start`) para permitir QA contra build de produção local sem interferir no `npm run dev` já configurado.

**Deploy**: aguardando commit/push — ver próximos passos.

#### Sprint 8 (v2) — Hub de Treinos Premium — 2026-07-12

**Auditoria inicial**
- `treinos/page.tsx` concentrava toda a orquestração (271 linhas): dados de `MOCK_WORKOUTS` + `lib/custom-workouts.ts` (CRUD direto em `localStorage`, não é store Zustand), sessão ativa via `useSessionStore`, recomendação via `lib/recommendations.ts`. Componentes já existiam em `src/components/workouts/` (`WorkoutCard`, `WorkoutFilters`, `ActiveSessionBanner`, `WorkoutQuickStart`, `WorkoutBuilderModal`, `ExerciseLibrary`) com CSS já tokenizado em `workouts.css` desde o Sprint 2.
- Risco identificado e corrigido: `.workout-row__icon-btn` (duplicar/editar/excluir) usava `display: none` fora do `:hover`, tornando essas ações **inacessíveis via teclado** — corrigido com `:focus-within` em `components.css`, validado via Playwright (foco no botão "Iniciar" + Shift+Tab alcança "Excluir").

**Componentes criados**
- `WorkoutsHeader` (título, contagem, ações Biblioteca/Criar) e `WorkoutsHero` (saudação via `useCharacterStore`, stats de treinos cadastrados/exercícios na biblioteca, recomendação embutida via `WorkoutQuickStart` já existente) em `src/components/workouts/`.
- `WorkoutEmptyState` — empty state ilustrado (ícones, mensagem, CTA) substituindo o antigo `create-tile` tracejado para o caso de zero treinos cadastrados.
- `lib/greeting.ts` extraído de `DashboardHero.tsx` (DRY — mesma saudação por horário agora compartilhada entre Dashboard e Treinos).

**Enriquecimento**
- `WorkoutCard` ganhou "última execução" (leitura read-only de `lib/workout-history.ts`, sem alterar a lib) — computado uma vez em `page.tsx` e passado via prop `lastCompletedAt`.
- `treinos/page.tsx` reduzido para dados + composição, seguindo o padrão Dashboard/Diário/Nutrição. Nenhuma store, cálculo de XP/PR ou formato de dado alterado.

**QA**
- `npm run lint`, `npx tsc --noEmit` e `npm run build` limpos.
- Playwright (Browser pane + msedge): criar/editar/duplicar/excluir treino personalizado, iniciar treino (navega para `/sessao`), guard de sessão ativa já em andamento (diálogo "descartar e iniciar"), persistência após reload, responsividade sem overflow horizontal em 1280px/768px/390px. Nenhum erro de console em nenhum cenário.
- Screenshots desktop (1280px) + mobile (390px), estado populado e vazio, em `docs/screenshots/sprint8/`.
- Push `699862a` → auto-deploy Vercel **Ready**. Validado em produção (`https://fitness-life-rpg.vercel.app/treinos`): hero, stats, recomendação e empty state idênticos ao ambiente local, sem erros de console. Screenshot `docs/screenshots/sprint8/producao-treinos-desktop.png`.

#### Sprint 7 (v2) — Sessão Ativa: QA Real e Fechamento da Pendência da Sprint 6 — 2026-07-11

**Contexto**
- A Sprint 6 fechou o checklist de QA de todas as rotas, exceto `/sessao` (sessão ativa): a tela só existe com `useSessionStore` (Zustand `persist`) populado, e não é alcançável por navegação estática — ficou pendente como item aberto.

**Auditoria**
- Revisão de `src/components/session/` e `src/components/workouts/` (código já redesenhado na Sprint 2) contra o critério de hardcodes visuais do `QA_CHECKLIST.md`: único hardcode real encontrado foi `style={{ opacity: 0.5, cursor: "default" }}` inline em `ExercisePickerModal.tsx` para o item já adicionado à sessão — migrado para regra `.picker-row:disabled` em `workouts.css`, reaproveitando o atributo `disabled` já presente no botão.
- Os inline styles `style={{ marginBottom: "2px" }}` em `SessionHeader.tsx`/`ActiveSessionBanner.tsx` **não** foram alterados: é o mesmo padrão já usado no Dashboard piloto (`TodaySection`, `LastWorkout`, `DashboardHero`, etc.), aceito desde a Sprint 1 — não é uma regressão desta tela.

**QA**
- Estado de sessão ativa reproduzido via seed direto do `localStorage` (`lrpg-fit:active-session`) no mesmo shape serializado pelo `persist` do Zustand (`{ state: { activeSession, activeSets, elapsedSeconds }, version: 0 }`), com Playwright (msedge) — sem precisar navegar pelo fluxo real de início de treino.
- Cenário: 3 exercícios (2 com séries completas, 1 pendente), timer em andamento, banner de sessão ativa em `/treinos`.
- Screenshots capturados (desktop 1280px + mobile 390px) em `docs/screenshots/sprint7/`: sessão ativa com séries, diálogo de "exercícios sem séries", e `WorkoutSummaryModal` com XP/breakdown pós-treino.
- `npm run build` e `npm run lint` limpos; nenhum erro de console na navegação real via Browser pane com o mesmo seed.

#### Sprint 6 (v2) — Configurações/Backup + QA Visual Completo — 2026-07-11

**Arquitetura**
- `configuracoes/page.tsx` reduzido para dados + composição. Componentes extraídos para `src/components/settings/`: `SettingsHeader`, `PreferencesLinkCard`, `StorageStatusSection`, `BackupExportSection`, `BackupImportSection`, `DataResetSection`.
- Novo arquivo de estilo de domínio: `src/styles/settings.css`. Reaproveita classes já centralizadas em `components.css` (`.card`, `.btn`/`.btn--danger`, `.alert--success`/`.alert--danger`, `.stat-grid`/`.stat-cell`, `.section-label`) em vez de duplicar padding/radius/cor.
- Lógica de `lib/backup.ts` (export/import/validação de schema/reset) preservada sem alteração, conforme regra de feature freeze do `CLAUDE.md` — a página apenas consome as funções já existentes.

**Visual**
- Zero hex/rgba e zero inline styles de cor/espaçamento no escopo (antes: página inteira em inline styles com `rgba(29,185,84,…)` verde Spotify legado, `#dc3545`, `rgba(220,53,69,…)`, `rgba(255,193,7,…)` hardcoded). Todos os estados (sucesso, alerta, perigo) agora usam `--color-success`/`--color-warning`/`--color-danger` via `.alert`/`.btn--danger`.
- Card de link para Preferências alinhado ao padrão `.card--interactive` com `--color-accent` para título/chevron, eliminando o verde Spotify legado que ainda restava nesta rota.
- Painéis de confirmação (importar/resetar) padronizados com `.settings-confirm--warning`/`--danger`, mesma linguagem visual do restante do design system.

**QA**
- `npm run build` e `npm run lint` limpos.
- Validado via Playwright (msedge): fluxo de exportar backup (alerta de sucesso tokenizado exibido), fluxo de confirmação de reset (botão "Apagar tudo" habilita apenas ao digitar "resetar", cancelar fecha o painel sem apagar dados), desktop (1280px) e mobile (390px) sem overflow horizontal.
- Checklist de screenshot por rota completo: `/dashboard`, `/treinos`, `/perfil`, `/insights`, `/diario`, `/nutricao`, `/configuracoes` capturados em desktop+mobile com dados populados — `docs/screenshots/sprint6/`. `/treinos/sessao` não recapturado (estado de sessão ativa via Zustand `persist` não reproduzido por seed estático; validado manualmente na Sprint 2).
- Push `70dfd0d` → auto-deploy Vercel **Ready** em https://fitness-life-rpg.vercel.app. Validado em produção: `/configuracoes` renderiza idêntico ao ambiente local, exportar backup exibe alerta de sucesso tokenizado, fluxo de reset abre/cancela corretamente sem apagar dados, sem erros de console. Screenshot `docs/screenshots/sprint6/producao-configuracoes-desktop.png`.

**Pendências conhecidas**
- Validação de schema de backup com arquivo inválido não reexercitada nesta sprint (lógica inalterada desde a Sprint 1); recomenda-se um teste manual de upload antes do deploy final.
- Sem framework de testes automatizado no repositório (decisão mantida desde a Sprint 2); QA segue via script Playwright ad-hoc.

#### Sprint 5 (v2) — Diário e Nutrição — 2026-07-11

**Arquitetura**
- `diario/page.tsx` reduzido de **375 para 145 linhas**. Componentes extraídos para `src/components/diary/`: `DiaryHeader`, `EntryForm`, `EntriesSection`, `LogCard`, `EnergyStars`, `MoodPicker`, `TagChip`, além de `format.ts` (helpers `formatDiaryDate`/`formatDiaryTime`, puros, sem JSX).
- `nutricao/page.tsx` reduzido de **384 para 51 linhas**. Componentes extraídos para `src/components/nutrition/`: `NutritionHeader`, `StreakBanner`, `GoalSection`, `TodayLogSection`, `CalorieRing`, `MacroBar`, `NumberInput`, `HistorySection`.
- Novos arquivos de estilo de domínio: `src/styles/diary.css` e `src/styles/nutrition.css`. Ambos reaproveitam classes já centralizadas em `components.css` (`.card`, `.btn`, `.badge-pill--xp`, `.alert--success`, `.input`/`.textarea`, `.page`) em vez de duplicar padding/radius/cor.
- Lógica de negócio (`daily-log.ts`, `nutrition.ts`, `auto-tags.ts`, `badges.ts`, `reward-events.ts`) preservada sem alteração — apenas a camada visual foi reescrita, conforme regra de feature freeze do `CLAUDE.md`.

**Visual**
- Zero hex/rgba e zero inline styles de cor/espaçamento no escopo (antes: 33 em Diário + 22 em Nutrição = 55 ocorrências, registradas como pendência da Sprint 3). Verde Spotify (`#1db954`/`rgba(29,185,84,…)`) eliminado das duas rotas.
- Diário: estrelas de energia, seletor de humor e tags usam `--color-accent` (chartreuse) como estado ativo — consistente com a regra de "chartreuse é acento" do `CLAUDE.md`; XP exibido via `.badge-pill--xp` já usado em outras rotas.
- Nutrição: paleta de macros **remapeada** para bater com a já usada em Insights (`MACRO_COLORS` de `theme-colors.ts` — proteína azul, carboidrato dourado, gordura rosa) em vez da paleta ad-hoc da página antiga (proteína vermelha, carboidrato azul, gordura dourada). Anel de calorias usa `--color-info` (mesmo tom do gráfico semanal de kcal em Insights) e vira `--color-danger` acima da meta.
- Ambas as páginas usam `.page`/`.page--tight` para layout, alinhando largura máxima e espaçamento com as demais rotas migradas.

**QA**
- `npm run build` e `npm run lint` limpos.
- Validado via Playwright (msedge): estado vazio e estado populado (3 entradas de diário com tags, 3 registros de nutrição, streak de 3 dias) em desktop (1440px) e mobile (390px) — sem overflow horizontal, cores batendo com os tokens de domínio, sidebar intacta. Fluxo interativo testado (seleção de humor + salvar entrada do diário; edição e salvamento de metas de nutrição) sem erros de console.
- Screenshots em `docs/screenshots/sprint5/`.

**Pendências conhecidas**
- Sem framework de testes automatizado no repositório (decisão mantida desde a Sprint 2); QA segue via script Playwright ad-hoc.

#### Sprint 4 (v2) — Insights — 2026-07-11

**Arquitetura**
- `insights/page.tsx` reduzido de **767 para 80 linhas** (dados + composição). Componentes extraídos para `src/components/insights/`: `InsightsHeader`, `SummarySection`, `NarrativeSection`, `WeekVolumeSection`, `DayFrequencySection`, `ExerciseLoadSection`, `CategorySection`, `PrsSection`, `AttributesSection`, `TagsSection`, `NutritionSection`, além de `ChartCard` (helpers compartilhados `ChartHeader`/`EmptyChart`/estilo de tooltip/grid/eixo do Recharts).
- Novo arquivo de estilo de domínio: `src/styles/insights.css` (hero, cards de gráfico, narrativa, lista de PRs, barras de tag, cards de nutrição).
- Novos tokens `--color-chart-primary/secondary/tertiary/quaternary` em `tokens.css` (aliases para accent/level/streak/info). Equivalentes em hex para o Recharts (que exige string literal, não `var()`, nos props `fill`/`stroke`) centralizados em `CHART_COLORS` — `src/lib/theme-colors.ts`, mesmo arquivo que já concentrava `PIE_PALETTE`/`MACRO_COLORS`/`attributeColor` desde a Sprint 1.
- Prop `goalCalories` removido de `NutritionSection` (era recebido mas nunca lido no componente original — dead code, sem alteração de comportamento).

**Visual**
- Zero hex/rgba e zero inline styles de cor/espaçamento fora de tokens na rota e nos componentes extraídos (antes: 42 ocorrências, registradas como pendência da Sprint 1). Objeto local `C` (paleta duplicada com hex fixo, incluindo tons de verde Spotify residual) removido por completo.
- Hero com glow radial chartreuse (mesma linguagem do Dashboard/Perfil), metric cards reaproveitando `.metric-card` (idêntico ao Dashboard), cards de gráfico com `.card` + `ChartHeader` padronizado, narrativa da semana em card `--color-accent-subtle`, PRs em lista com destaque `--color-streak`, atributos com `.progress-track`/`.progress-fill` (mesmo padrão do Perfil), tags do diário com barras proporcionais, nutrição com CTA quando vazia e cards de macro tokenizados.
- Únicos números "soltos" restantes são dimensões numéricas exigidas pela API do Recharts (altura do `ResponsiveContainer`, `barSize`, `radius` das barras, `fontSize` dos ticks dos eixos) — não são valores de design tokenizáveis, mesma exceção já aplicada nas Sprints 2–3 a bibliotecas de terceiros.

**QA**
- `npm run build` e `npm run lint` limpos.
- Validado via Playwright (msedge): estado vazio (0 treinos) e estado populado (5 treinos, 2 PRs, 3 entradas de diário, 2 semanas de nutrição, atributos variados) em desktop (1280px) e mobile (390px) — sem overflow horizontal, cores nos gráficos batendo com os tokens de domínio (accent/level/streak/info), navegação da sidebar intacta.
- Screenshots em `qa-screenshots/sprint4/` (`insights-desktop.png`/`insights-mobile.png` vazio; `insights-populated-desktop.png`/`insights-populated-mobile.png` com dados).

**Pendências conhecidas**
- Sem framework de testes automatizado no repositório (decisão mantida desde a Sprint 2); QA segue via script Playwright ad-hoc.

#### Sprint 3 (v2) — Perfil, Atributos, Badges e Feedbacks de Progressão — 2026-07-11

**Arquitetura**
- `perfil/page.tsx` reduzido de **313 para 132 linhas** (dados + composição). Componentes extraídos para `src/components/profile/`: `ProfileHero` (identidade, avatar, edição de nome, pills, stats), `LevelProgressCard` (nível, barra de XP, próximo marco), `AttributesGrid`, `BadgesGrid`, `RewardsHistory`, `ProfileLinks`.
- `LevelUpModal` reescrito sobre `ModalShell` (35 linhas; antes 120 com styled-jsx e keyframes inline) — ganha foco preso, Escape, scroll lock e retorno de foco. `RewardToast` reescrito com classes (79 linhas).
- Novos arquivos de estilo de domínio: `src/styles/profile.css` e `src/styles/progression.css`. Bloco "Legado v1" removido de `components.css` (`.profile-hero`/`.attr-card` migrados e refinados; `.workout-row` mantido, apenas re-seccionado). `AVATAR_COLORS` centralizado em `theme-colors.ts`.

**Visual**
- Zero hex/rgba e zero inline styles de estilo (restam apenas CSS custom properties tokenizadas, padrão das Sprints 1–2) em Perfil, componentes de perfil, LevelUpModal e RewardToast (antes: 43 ocorrências de cor no escopo). Verde Spotify (`rgba(29,185,84,…)`) zerado no escopo, incluindo o mapa de cores de avatar.
- Perfil: nome em Fraunces no hero, resumo de nível com tile deep forest + barra chartreuse + "faltam N XP" (próximo marco), atributos em grid 2/3/5 colunas com cor por atributo do mapa central, badges ordenados (desbloqueados por data desc primeiro; bloqueados com 🔒 + label "Bloqueada" + critério + progresso real x/y quando derivável dos mesmos dados dos critérios), histórico de recompensas (reward-events) com estado vazio, quick links tokenizados.
- LevelUpModal: eyebrow em `--color-level`, número em Fraunces, CTA chartreuse, animação curta com `prefers-reduced-motion`. RewardToast: `role="status"`/`aria-live="polite"`, botão fechar ≥32px, borda semântica por tipo de evento, centralizado sobre o conteúdo no desktop (compensa a sidebar).

**Correções funcionais (comprovadas em QA — documentadas)**
- LevelUpModal repetia após refresh: o Dashboard gravava `rpg_last_seen_level` a partir do personagem mock (nível 1) antes da store reidratar e reabria o modal ao reidratar. Detecção agora só roda com a store hidratada (`storeCharacter`), leitura movida para dentro do efeito. Validado: abre 1× no level-up, não repete em 2 refreshes.
- RewardToast: fechar 2× rápido (clique + timeout concorrente) descartava também o toast seguinte da fila → guard síncrono `exitingRef`.
- Barra de XP: percentual com `Math.floor` (não mostra "100%" faltando 1 XP) e largura limitada a 100% com XP acima do esperado; leituras de localStorage do Perfil movidas para `useEffect` (higiene de hydration).

**QA**
- Suíte Playwright (msedge) **20/20 PASS**: modal abre no level-up e não repete em refresh; Escape fecha e destrava scroll; 2 eventos próximos exibem toasts em sequência; duplo clique no fechar não quebra a fila; Perfil reflete nível/XP/badges/recompensas e persiste após refresh; progressbar com aria; sem overflow horizontal em 390/360; XP acima do esperado limitado a 100%; console limpo.
- Fluxo real validado no navegador: treino completo (95 XP → finalizar → +55 XP) → level up 1→2 → atributos 5→5.4/5.2 → badges `first-workout` e `level-2` concedidos 1× → toast → LevelUpModal no Dashboard → Perfil atualizado. Edição de nome e avatar persistem (localStorage + store).
- Screenshots em `docs/screenshots/sprint3/` (13 estados: Perfil 1440/1280/768/390/360, vazio desktop/mobile, dados extensos com nome longo + nível 42, LevelUpModal desktop/mobile, RewardToast desktop/mobile).
- Build, lint e typecheck limpos.

**Pendências conhecidas**
- Feedback de level-up existe em 3 superfícies (callout no resumo do treino → toast transitório → modal no Dashboard); hierarquia documentada como intencional (o modal só aparece no Dashboard; o toast cobre o caminho via /treinos). Consolidar em uma única superfície é decisão de produto para depois do redesign.
- Badges de nutrição/plano/campanha não mostram progresso parcial no Perfil (dados desses domínios não são carregados na página; apenas o critério é exibido).
- Projeto segue sem framework de testes (decisão da Sprint 2 mantida); a suíte de QA Playwright vive no scratchpad da sessão, não no repositório.

#### Sprint 2 (v2) — Treinos e Sessão Ativa — 2026-07-10

**Arquitetura**
- `treinos/page.tsx` reduzido de **875 para 271 linhas**; `sessao/page.tsx` de **750 para 346 linhas** (ambas viraram dados + composição; a rota de Sessão mantém deliberadamente a lógica de finalização — XP/PR/atributos/badges/histórico — no mesmo lugar de antes, sem mover lógica de negócio).
- Componentes extraídos para `src/components/workouts/`: `WorkoutCard`, `WorkoutFilters` (+ `filterByTime`), `ActiveSessionBanner`, `WorkoutQuickStart`, `WorkoutBuilderModal` (com `ExerciseTargetRow` interno), `CreateExerciseModal`, `ExerciseLibrary`, `ExerciseHistoryModal`.
- Componentes extraídos para `src/components/session/`: `SessionHeader`, `SessionExerciseCard`, `AddSetForm`, `ExercisePickerModal`, `WorkoutSummaryModal`.
- Novos componentes compartilhados: `ModalShell` (overlay + painel com Escape, foco, scroll-lock com contador para modais aninhados, `role="dialog"`/`aria-modal`) e `ConfirmDialog` — substituem todos os `window.confirm` e overlays ad-hoc do escopo.
- Novos arquivos de estilo de domínio: `src/styles/workouts.css` e `src/styles/session.css`; classes de modal adicionadas a `components.css`; `.fab-create` (morta) removida.

**Visual**
- Zero hex/rgba hardcoded nas duas rotas e em todos os componentes extraídos (antes: 74 em Treinos, 70 em Sessão). Verde Spotify (`#1db954`/`rgba(29,185,84,…)`) zerado no escopo, incluindo `toMockWorkoutShape` (agora usa `categoryColor(...).fill`).
- Treinos: headline Fraunces, sessão ativa em banner prioritário no topo (pulso + Continuar), início rápido com recomendação real (`getWorkoutRecommendations`), filtros tokenizados com `aria-pressed`, seções separadas "Meus treinos" × "Templates", CTA "Criar treino" como botão primário compacto + tile tracejado no estado vazio (sem grandes superfícies chartreuse).
- Sessão: header compacto (nome do treino, timer tabular chartreuse, barra de progresso por exercício, séries totais), cards de exercício com meta 🎯 + sugestão de progressão, séries com ícone ✓ (estado não depende só de cor), inputs ≥44px com labels e `inputMode` numérico, resumo pós-treino com stats reais (duração/exercícios/séries), XP em Fraunces, callouts de level-up/PR e dois destinos (Dashboard/Treinos).

**Correções funcionais (idempotência/segurança — documentadas)**
- Duplo clique em "Finalizar" salvava o treino 2× no histórico → guard síncrono (`finishedRef`); validado com triple-click (1 entrada).
- Duplo clique na confirmação do resumo aplicaria XP/atributos/badges 2× → guard `confirmedRef` + estado de processamento no botão.
- "Cancelar" encerrava a sessão sem confirmação → `ConfirmDialog` de descarte.
- Iniciar treino com sessão ativa descartava a sessão silenciosamente → diálogo de conflito com opção de voltar.
- Finalizar com exercícios sem séries agora pede confirmação explícita.
- Botões editar/excluir/duplicar da linha de treino eram invisíveis em touch (`display:none` até hover) → visíveis com alvo ≥40px via `@media (hover: none)`.
- Exclusões (treino e exercício) migradas de `window.confirm` para diálogo acessível com retorno de foco.

**QA**
- Fluxo completo validado no navegador: iniciar → registrar séries → refresh (sessão recuperada com séries e tempo) → finalizar → resumo → Dashboard refletindo o treino ("Último treino") → histórico com 1 entrada → sessão removida do storage.
- Console limpo (apenas logs de dev do Fast Refresh). Sem overflow horizontal em 390px; inputs de série com ~47px de altura no mobile.
- Screenshots em `docs/screenshots/sprint2/` (13 estados: Treinos 1440/1280/390, filtro ativo, sessão ativa, modal de criação, Sessão 1440/390, séries registradas, desempenho anterior, confirmação de finalização, resumo, estado vazio). **Não existe timer de descanso no código** — o screenshot "descanso ativo" não se aplica (nada foi removido; a feature nunca existiu).
- Build, lint e typecheck limpos.

**Pendências conhecidas**
- Peso/reps padrão do formulário de série usam a meta do treino custom apenas quando o histórico existe no primeiro render (as metas carregam em efeito) — quirk pré-existente da v1, mantido para não remontar o formulário.
- Projeto segue sem framework de testes (sem script `test`); criar infraestrutura de testes é decisão separada (não entrou para não adicionar dependências fora do escopo do redesign).
- `elapsedSeconds` no banner de Treinos mostra o último valor persistido (o tick só roda na rota de Sessão) — comportamento herdado da store.
- `/dashboard` em produção emite erros de hydration do React (#425/#418/#423) — pré-existente da Sprint 1 (saudação/data calculadas no SSR em UTC divergem do cliente; nenhum arquivo de Dashboard foi tocado nesta sprint). `/treinos` e `/sessao` estão com console limpo em produção.

**Deploy**
- Push `99f62e5` → auto-deploy Vercel **Ready** (43s) em https://fitness-life-rpg.vercel.app. Validado em produção: `/treinos` renderiza, série registrada em sessão real, cancelamento com confirmação limpa o storage, sem overflow horizontal em 390px, Dashboard continua funcionando. Screenshot `docs/screenshots/sprint2/15-producao-treinos-desktop.png`.

#### Sprint 1 (v2) — Consolidação da fundação visual + navigation shell + Dashboard piloto — 2026-07-10

**Design system**
- `src/styles/tokens.css` reescrito com a paleta aprovada: canvas `#121212`, surface `#1c1c1c`, acento chartreuse `#c8f169`, deep forest `#043f2e`, semânticas (success/warning/danger/info), domínio (xp/level/streak), tipografia (escala + tracking + tabular), spacing 4px, radius semânticos, sombras, layout e z-index. Aliases legados mantidos para as rotas das Sprints 2–6.
- Fraunces adicionada via `next/font/google` (pesos 400/600) como `--font-display`; Inter mantida como `--font-ui`. `themeColor` do PWA atualizado de `#1db954` para `#121212`.
- `tailwind.config.ts` expandido: cores, fontes, radius, sombras e larguras expostos como utilities referenciando as variáveis CSS (zero hex duplicado).
- `components.css` consolidado (cards, botões incl. danger/loading/icon, forms completos, toggle, alerts, metric card, xp-bar, badges, skeleton, empty state) — todos os verdes Spotify hardcoded substituídos por tokens.
- `theme-colors.ts` (mapa centralizado de cores dinâmicas): verde Spotify → chartreuse.

**Navegação (ADR — decisão travada)**
- Navegação oficial: **sidebar fixa desktop + drawer com overlay mobile**, base `AppSidebar.tsx`. Decisão encerrada; não reabrir.
- `AppSidebar` reescrito sem inline styles (classes em `shell.css`), preservando rotas/estados. Acessibilidade adicionada: Escape fecha o drawer, scroll lock no body, foco vai ao botão de fechar ao abrir e retorna ao hamburger ao fechar, `aria-controls`/`aria-expanded`/`aria-hidden`, hit areas ≥40px, `prefers-reduced-motion` respeitado.
- Layout do grupo `(dashboard)` tokenizado (`.app-shell`/`.app-main`).
- **Código morto removido:** `BottomNav.tsx` e `TopBar.tsx` (sem imports desde o Sprint 23 da v1).

**Style Guide**
- Nova rota `/style-guide` (isolada, estática, sem tocar em dados): foundations (cores, tipografia, spacing, radius, sombras), botões, cards, forms, feedback, navegação e padrões do Dashboard. `robots: noindex`.

**Dashboard piloto**
- `dashboard/page.tsx` reduzido de **889 para ~150 linhas** (dados + composição). Componentes extraídos para `src/components/dashboard/`: `DashboardHero`, `QuickActions`, `MetricsGrid`, `RecommendationCard`, `MissionsSection`, `WeeklyPlanCard`, `TodaySection`, `RecentBadges`, `NextMilestone` (+ `LastWorkout` retokenizado).
- Visual: headline em Fraunces, tile de nível em deep forest, XP bar chartreuse, pills de dia da semana com iniciais (substituindo emojis), métricas com números tabulares, grid 2 colunas no desktop, sem gradientes decorativos. Lógica de negócio intocada (mesmos hooks/efeitos/stores).

**QA**
- Screenshots em `docs/screenshots/sprint1-v2/` (style guide desktop/mobile, dashboard 1440/1280/1024/390/360, drawer aberto, onboarding, estado vazio, estado com dados, treinos como rota de regressão).
- Console limpo em todas as rotas (`/dashboard`, `/treinos`, `/perfil`, `/insights`, `/plano`, `/diario`, `/nutricao`, `/configuracoes`, `/style-guide`).
- Drawer validado: abrir/fechar por botão, overlay e Escape; scroll lock; retorno de foco; sem overflow horizontal em 390/360.
- Build, lint e typecheck limpos.

**Hardcodes**
- Ocorrências de hex/rgba em `src/**/*.ts(x)`: **619 → 519** (hex puro: 327 → 286). Zerado no escopo da sprint (shell, Dashboard, componentes compartilhados). Restante concentrado nas rotas das Sprints 2–6 (`treinos` 74, `sessao` 70, `insights` 42, `diario` 33, `perfil` 26, `nutricao` 22, `plano` 19, `configuracoes` 14) e em casos justificáveis (`theme-colors.ts` centralizado, `mock/data.ts`, metadata do PWA).

**Pendências conhecidas (para Sprints 2+)**
- `/treinos` exibe mistura de chartreuse (via tokens) com verde Spotify hardcoded (filtro "Todos", cores locais) — migração completa na Sprint 2.
- `LevelUpModal`, `OnboardingModal` (parcial), `RewardToast` e telas restantes ainda têm valores locais.
- Micro-tamanhos de fonte (0.6–0.65rem) usados em labels pequenos ainda não têm token dedicado.

---

## [v1] — Histórico consolidado (encerrado como aprendizado, não como código descartado)

> Resumo condensado. Detalhamento completo de cada sprint disponível na consolidação original do projeto.

### O que foi construído
- Infraestrutura Supabase completa (tabelas, RLS, funções SQL) — posteriormente não usada ativamente, já que o app virou local-first.
- App Next.js 14 com autenticação, depois substituída por modo mock/local.
- Core de treino: templates, sessão ativa, timer, séries, XP, detecção de PR.
- Sistema de progressão: badges, atributos, reward events, diário com tags automáticas.
- Dashboard, Insights, Nutrição, Perfil.
- Sistema de backup (export/import/validação/reset).
- Deploy v1.0.0 na Vercel.
- Funcionalidades pós-deploy: plano semanal/campanhas, personalização/onboarding, PWA/offline, workout builder, revisão semanal/consistência.
- Redesign visual parcial (Sprint 18–19): linguagem Spotify aplicada em Perfil e Treinos, com melhora visual real — mas Insights e Dashboard ficaram para trás, e a navegação (BottomNav) nunca estabilizou apesar de 4 tentativas.

### Diagnóstico da falha
O projeto não falhou por falta de código ou de ideias — falhou por **sequenciamento**: features novas continuaram sendo adicionadas antes da base visual e de navegação estarem sólidas. Prompts amplos demais aumentaram a chance de implementação parcial. Faltaram critérios de aceite visual explícitos (screenshot obrigatório) antes de fechar sprints.

### O que foi mantido para a v2
- Todas as stores e lógica de negócio (treinos, XP, atributos, badges, diário, nutrição, backup).
- Conceito de progressão gamificada aplicado a dados reais de treino.
- Paleta cromática do redesign Spotify (chartreuse/verde), agora formalizada via tokens em `DESIGN.md`.

### O que foi descartado
- BottomNav (todas as versões).
- Fluxo de autenticação/Supabase ativo.
- Qualquer CSS/classe visual legada não migrada para os novos tokens.
