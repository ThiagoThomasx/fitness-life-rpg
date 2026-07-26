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

#### Sprint 29 Parte 1 — Health Platform Feasibility & ADR — 2026-07-26

Responde, com evidências técnicas, se o produto deve virar app nativo antes
de qualquer integração real com Health Connect/Samsung Health/Apple Health.
Ver `SPRINT-29.md`, `HEALTH-PLATFORM-FEASIBILITY.md`,
`docs/adr/ADR-HEALTH-PLATFORM.md` e `HEALTH-PROVIDER-INTERFACE.md`.

- **Auditoria de plataforma**: confirmado Next.js puro (sem Capacitor/
  Android/iOS), PWA já em produção (`manifest.webmanifest`, `sw.js` manual),
  Supabase presente no código mas desativado no fluxo ativo, 100%
  local-first via `localStorage`.
- **Pesquisa técnica**: Health Connect (requisitos de versão Android,
  permissões, background sync), Samsung Health (converge para Health
  Connect), Apple HealthKit (exige app nativo, sem acesso via navegador em
  nenhuma hipótese), PWA (sem API Web de saúde), Capacitor (plugins de
  terceiros disponíveis, exige toolchain nativa completa).
- **Decisão (ADR)**: manter o produto como web app, com importação de
  arquivos como estratégia principal (Opção B da matriz de feasibility).
  Não adotar Capacitor nem integração nativa produtiva nesta fase.
- **Novo**: `health-data/provider.ts` (interface `HealthDataProvider`),
  `health-data/mock-provider.ts` (`MockHealthProvider`, dados sintéticos),
  `health-data/provider-import.ts` (`importFromProvider` — ponte única entre
  um provider e a pipeline real de importação, sem atalho para storage).
  Nenhum provider real implementado; nenhum provider alimenta
  Readiness/Recovery/Fatigue/Coach diretamente.
- 15 testes novos (`mock-provider.test.ts`, `provider-import.test.ts`),
  1408/1408 no total. Lint/typecheck/build limpos.

#### Sprint 28 Parte 4 — Health Data Integration: Readiness, Recovery, Fatigue, Coach, Backup & QA — 2026-07-26

Conecta a camada de Health Data (Partes 1-3) aos motores existentes de
forma opcional — nenhum deles passa a depender de Health Data, e o
comportamento sem nenhum registro de saúde permanece idêntico ao anterior à
Sprint 28 (verificado por teste em cada integração). Encerra a Sprint 28.
Ver `SPRINT-28-PART4.md` para o relatório completo.

- **Novo**: `health-data/consumer-context.ts` — Health Context Adapter,
  única porta de entrada que Readiness/Recovery/Fatigue/Coach usam para
  consumir Health Data, com gating por qualidade/conflito/amostra/
  obsolescência.
- **Readiness** (`workout-readiness.ts`): campo opcional
  `WorkoutReadinessResult.healthContext` — puramente informativo, nunca
  entra na fórmula de score.
- **Recovery** (`workout-recovery.ts`): `getRecoveryHealthContext` — contexto
  sistêmico de "hoje", chamado uma vez por tela (não por treino).
- **Fatigue** (`analytics/fatigue.ts`): 4 novos detectores de padrão — sono
  abaixo da baseline por 3 dias seguidos, FC de repouso elevada por 3 dias
  seguidos, atividade externa acima da baseline por 3 dias seguidos, e
  combinação (carga em alta + sono baixo + FC elevada).
- **Coach** (`coach/rules.ts`): 4 novas regras `Coach.Health.SleepDeficit`,
  `Coach.Health.RestingHrElevated`, `Coach.Health.HighExternalActivity`,
  `Coach.Health.RecoveryMismatch` — reaproveitam os padrões de Fatigue,
  linguagem sempre factual (nunca diagnóstica), disclaimer discreto.
- **Backup/restore/reset**: `lrpg-fit:health-data-records` adicionada a
  `STORAGE_KEYS`; `resetHealthData()`; nova seção "Apagar Dados de saúde"
  em Configurações. Backups anteriores à Sprint 28 continuam restaurando
  normalmente.
- **UI mínima**: seção "Dados objetivos" no `ReadinessCard` (sono/FC vs.
  baseline); badge "Baseado em dados de saúde" no `CoachRecommendationCard`.
- 34 testes novos, 1393/1393 no total, lint/typecheck/build limpos. QA
  manual real (check-in de prontidão + fluxo de reset) sem regressão.

#### Sprint 28 Parte 3 — Daily Aggregation, Conflicts, Quality, Baselines & Trends — 2026-07-26

Adiciona a camada analítica sobre a fundação das Partes 1-2: agregação
diária, detecção de conflito entre fontes, qualidade agregada por dia,
baseline e tendências — tudo derivado sob demanda, nada persistido. Ver
`SPRINT-28-PART3.md`, `HEALTH-DATA-AGGREGATION.md`, `HEALTH-CONFLICTS.md`,
`HEALTH-BASELINES.md` e `HEALTH-TRENDS.md` para o relatório completo.

- **Novo em `src/lib/health-data/`**: `stats.ts` (mean/median/desvio padrão
  — não existia utilitário de estatística compartilhado no projeto),
  `aggregation-shared.ts` (prioridade de fonte, mapeamento métrica→campo do
  resumo), `aggregation.ts` (`DailyHealthSummary`, estratégia explícita por
  métrica), `conflicts.ts` (limiar percentual/absoluto por métrica,
  severidade proporcional), `quality-aggregation.ts` (qualidade do dia,
  combina qualidade por registro + conflitos), `baseline.ts`
  (média/mediana/desvio, amostra mínima por métrica: 7 dias para
  sono/FC/passos, 5 para as demais), `trends.ts` (reaproveita `classifyTrend`
  de `trend-math.ts`, o mesmo motor de Body Progress/Wellness — nenhum
  classificador novo), `analytics-queries.ts` (camada de consulta única:
  `getSummaryRange`, `getDailySummary`, `getLatestSummary`, `getConflicts`,
  `getQuality`, `getMetricBaseline`, `getMetricTrend`).
- **UI**: `HealthDataInsightsPanel` — dentro da seção "Dados de saúde" já
  existente em Configurações, não um dashboard novo. Seletor de período
  (reaproveita `PERIOD_OPTIONS` do Analytics de treino), resumo do dia mais
  recente, conflitos expansíveis, seletor de métrica com baseline e
  tendência.
- Nenhuma integração com Readiness/Recovery/Fatigue/Coach ainda — fica para
  a Parte 4, conforme escopo da sprint.
- 48 testes novos, 1359/1359 no total, lint/typecheck/build limpos.

#### Sprint 28 Parte 2 — Manual Health Entry & Import Pipeline — 2026-07-26

Adiciona a camada de entrada e importação sobre a fundação da Parte 1: uma
seção "Dados de saúde" em Configurações com formulário dinâmico por
métrica, e importação de JSON/CSV com prévia obrigatória, deduplicação e
persistência atômica. Ver `SPRINT-28-PART2.md`, `HEALTH-DATA-IMPORT.md` e
`HEALTH-DATA-MANUAL-ENTRY.md` para o relatório completo.

- **UI** (`src/components/settings/`): `HealthDataSection`,
  `HealthDataManualEntryForm` (sono usa início/fim — duração derivada
  automaticamente, nunca calculada manualmente pelo usuário),
  `HealthDataImportPanel` (prévia em `ModalShell` com contagens,
  exemplos e motivo de cada rejeição/duplicata), `HealthDataRecordList`.
- **Novo em `src/lib/health-data/`**: `import-json.ts` (schema canônico
  estrito), `csv-parser.ts` (tokenizador CSV próprio — sem biblioteca nova),
  `import-csv.ts`, `import-preview.ts`, `import-apply.ts` (atomicidade via
  snapshot/rollback, mesmo padrão de `backup.ts`), `manual-entry.ts`.
- **Peso**: entrada manual e importação continuam redirecionando para
  `createBodyProgressEntry` — nunca duplicado em `health-data-records`.
  Isso expôs a necessidade de ajustar a chave de deduplicação de peso
  (`metric+data`, ignorando `source`, já que Body Progress não distingue
  fonte) e de corrigir `createBodyProgressEntry` (`lib/body-progress.ts`),
  que antes engolia silenciosamente falhas de escrita em `localStorage` —
  sem essa correção, o rollback atômico da importação nunca seria
  acionado quando o peso redirecionado falhasse ao persistir.
- QA manual real no browser: entrada manual, peso confirmado em Body
  Progress, importação JSON com reimportação idempotente (duplicados
  detectados), importação CSV com linhas mistas válidas/inválidas, mobile
  375px sem overflow. Rollback sob falha de escrita coberto por teste
  automatizado.
- 55 testes novos, 1311/1311 no total, lint/typecheck/build limpos.

#### Sprint 28 Parte 1 — Health Data Foundation: schema, validação e storage — 2026-07-26

Primeira parte de uma nova camada local e agnóstica de fonte para dados de
saúde (passos, sono, peso, FC de repouso, calorias, atividade, bem-estar),
preparada — só no tipo — para futuras integrações de plataforma
(Health Connect/Samsung Health/Apple Health/Google Fit), sem integrá-las de
verdade nesta parte. Ver `SPRINT-28.md`, `HEALTH-DATA-FOUNDATION.md`,
`HEALTH-DATA-SCHEMA.md` e `HEALTH-DATA-QUALITY.md` para o relatório
completo.

- **Novo domínio** `src/lib/health-data/`: `types.ts` (`HealthDataSource`,
  `HealthMetricType`, `HealthDataRecord`), `validation.ts` (faixas
  plausíveis por métrica, validação de intervalo de sono),
  `normalization.ts` (conversão de unidade → unidade canônica),
  `quality.ts` (nível + razões, nunca score único), `deduplication.ts`
  (chave determinística `source+externalId` → `metric+source+recordedAt`
  → hash), `storage.ts` (CRUD + importação atômica sobre
  `lrpg-fit:health-data-records`), `body-progress-adapter.ts` e
  `queries.ts`.
- **Decisão**: peso continua com fonte de verdade única em Body Progress —
  Health Data deriva registros sob demanda via adapter, nunca duplica.
- **Decisão**: `localStorage` (não IndexedDB), consistente com o resto do
  projeto. Ainda não integrado a `backup.ts` — planejado para a Parte 4.
- 61 testes novos, 1256/1256 no total, lint/typecheck/build limpos.

#### Sprint 27 — Adaptive Planning 2.0: From Coach Recommendation to Reviewable Plan Change — 2026-07-26

Fecha o loop que a Sprint 26 deixou aberto: o Coach detecta e sugere, mas
nunca aplica. Esta sprint adiciona a camada de proposta concreta, revisável
e versionada — aprovação explícita do usuário sempre obrigatória antes de
qualquer mutação. Ver `SPRINT-27.md`, `ADAPTIVE-PLANNING.md`,
`ADAPTIVE-PROPOSALS.md`, `ADAPTIVE-VERSIONING.md` e
`ADAPTIVE-AUDIT-TRAIL.md` para o relatório completo.

- **Novo domínio** `src/lib/adaptive-planning/` (14 módulos): diff engine
  genérico (primeiro do repositório — os outros domínios só fazem
  version-bump + clone completo), applicability engine, builders
  especializados para os 8 tipos de proposta (`reduce_volume`,
  `increase_volume`, `reschedule_workout`, `insert_recovery`,
  `adjust_frequency`, `replace_exercise`, `review_progression`,
  `maintain_plan`), motor de execução atômico e idempotente, e audit trail
  append-only.
- **Execução real, mas sempre atrás de aprovação explícita**: `execution.ts`
  exige `status === 'accepted'` antes de mutar qualquer dado, reaplicar uma
  proposta já `applied` é um no-op seguro, e falha em qualquer etapa marca
  a proposta como `failed` sem deixar estado parcialmente escrito.
- **UI**: botão "Criar proposta" nas recomendações do Coach elegíveis
  (volume/recuperação), modal de revisão antes/depois com avisos e decisão
  (aceitar/rejeitar/revisar depois), seção "Ajustes recentes" no Dashboard,
  reset granular em Configurações.
- **Bug real encontrado e corrigido em QA manual**: a heurística de
  reduzir/aumentar volume não reconhecia a frase real da única regra de
  volume do Coach ("Redistribua parte do volume de X..."), então "Criar
  proposta" nunca gerava nada na prática — corrigido com teste de
  regressão fixado na frase exata da regra.
- **Correção separada**: flake pré-existente em `program-instantiation.test.ts`
  (`toDateOnly` misturava `toISOString()` UTC com cálculo de weekday em
  horário local) — estabilizado.
- 1195/1195 testes (mais de 100 novos cobrindo o domínio inteiro),
  lint/typecheck/build limpos.

#### Sprint 26 — Coach Mode Foundation: Deterministic Training Coach — 2026-07-26

Motor de interpretação determinístico (sem IA/LLM) que combina sinais já
produzidos pelos motores existentes (Analytics 2.0, Exercise Intelligence,
Readiness, Recovery, Program Adherence) em recomendações explicáveis, mais a
UI que expõe tudo dentro da rota `/dashboard` já existente. Ver
`SPRINT-26.md`, `COACH-ENGINE.md`, `COACH-RULES.md`, `COACH-SIGNALS.md` e
`COACH-EXPLAINABILITY.md` para o relatório completo.

- **9 motores puros** em `src/lib/coach/` (`types`, `helpers`, `signals`,
  `rules`, `priority`, `explanations`, `recommendations`, `decisions`,
  `engine`) — nenhum cálculo de negócio duplicado; `signals.ts` só adapta o
  que `analytics/dashboard.buildDashboardAnalytics` e mais dois motores
  (`exercise-intelligence`, `exercise-records`) já produzem.
- **9 regras determinísticas** cobrindo recuperação, carga, consistência,
  aderência ao programa, frequência, balanceamento muscular, volume,
  progressão/estagnação e recordes — cada achado cita evidência numérica
  real, nunca texto inventado.
- **Nova seção "Coach"** dentro do Dashboard (não rota nova, não item de
  navegação novo — decisão de navegação permanece travada): cards por
  recomendação agrupados por prioridade, explicações expansíveis
  (título/resumo/evidências/período/regra/sugestão), ações só de navegação,
  decisões Aceitar/Ignorar persistidas em `lrpg-fit:coach-decisions`
  (adicionada a `STORAGE_KEYS`/backup/reset).
- **Bug real encontrado e corrigido**: o motor de balanceamento muscular
  (Sprint 25) pode classificar o MESMO grupo como negligenciado e excessivo
  simultaneamente com amostra pequena (bases de cálculo diferentes) — o
  Coach agora suprime a recomendação "negligenciado" quando o grupo já está
  marcado como excessivo, evitando uma contradição visível ao usuário.
- QA manual real (dev server, dados reais, fluxo completo de decisão
  testado por interação, persistência confirmada após reload, mobile/
  tablet/desktop sem overflow) — zero erros de console.
- 1091/1092 testes (1 falha pré-existente não relacionada), lint/typecheck/
  build limpos.

#### Sprint 25 — Analytics 2.0: Engines + Dashboard Analytics UI — 2026-07-25

Motor de analytics agregado (Performance, Consistência, Balanceamento
Muscular, Fadiga, Progresso, Insights) sobre dados já existentes, mais a UI
que expõe tudo dentro da rota `/dashboard` já existente. Sem nova rota, sem
lógica de negócio nova. Ver `SPRINT-25.md`, `ANALYTICS-ENGINE.md`,
`PERFORMANCE-ANALYTICS.md`, `CONSISTENCY-ENGINE.md`, `MUSCLE-BALANCE.md` e
`INSIGHTS-ENGINE.md` para o relatório completo.

- **9 motores puros** em `src/lib/analytics/` (`types`, `helpers`,
  `performance`, `consistency`, `muscle-balance`, `fatigue`, `progress`,
  `insights`, `dashboard`) — cada um compõe módulos `lib/*` já existentes,
  nenhuma matemática de negócio recalculada. Ponto de entrada único:
  `buildDashboardAnalytics(period)`.
- **Nova seção "Analytics"** dentro do Dashboard (não rota nova, não item de
  navegação novo — decisão de navegação permanece travada): filtro de
  período (6 opções) + 6 sub-painéis (Destaques, Performance, Consistência,
  Músculos, Recuperação, Insights), gráficos recharts só onde agregam valor
  real (variação percentual por métrica, distribuição por grupo muscular).
- **Sem score único** — cada indicador é um `.stat-cell` independente,
  seguindo a proibição explícita da brief de não fabricar um número
  combinado arbitrário.
- **Bug real encontrado e corrigido**: `FatiguePanel` mostrava "Recuperado"
  para grupos musculares nunca treinados — corrigido para "Sem histórico"
  (mudança de apresentação, `workout-recovery.ts` intocado).
- QA manual real (dev server, dados reais, estado vazio, 6 abas × 6
  períodos, screenshots desktop/mobile via Playwright+msedge) — zero erros
  de console, zero overflow horizontal.
- 1046/1047 testes (1 falha pré-existente não relacionada), lint/typecheck/
  build limpos.

#### Sprint 24 — Product Reliability Part 2: Visual QA, Accessibility & Interaction Testing — 2026-07-25

Fecha as pendências deixadas pela Sprint 23. Ver `SPRINT-24.md`,
`VISUAL-QA-REPORT.md`, `ACCESSIBILITY-REPORT.md` e `INTERACTION-TESTS.md`
para o relatório completo.

- **QA visual real**: resolvido o travamento de screenshot do Browser pane
  via Playwright+msedge — 5 breakpoints × 12 rotas, zero overflow horizontal
  encontrado, verificação programática + captura visual.
- **Bug corrigido**: `WeeklyStatsSection.tsx` (Perfil) tinha hydration
  mismatch real (mesma classe da Sprint 9) — visível como erro no dev
  overlay, não só warning de console. Corrigido com `useMounted()`.
- **Acessibilidade**: `ModalShell` ganhou `aria-describedby` (prop
  `describedBy`), conectado em `ConfirmDialog` (genérico) + 5 dialogs.
  Focus trap e devolução de foco (Sprint 23) verificados por interação real
  de teclado via Playwright pela primeira vez — resolve a limitação do
  `.click()` do Browser pane.
- **Data safety**: 2 testes novos cobrindo rollback de `importBackup()`
  quando uma escrita falha no meio (quota excedida) — caminho de código já
  existente, nunca antes exercitado por teste.
- 954/954 testes (2 novos), lint/typecheck/build limpos.

#### Sprint 23 — Mobile Polish, Accessibility & Product Reliability — 2026-07-25

Camada transversal de acabamento sobre tudo que já existia (sem novo domínio
funcional) — navegação, acessibilidade, mobile, confiabilidade de dados,
performance. Ver `SPRINT-23.md`, `ACCESSIBILITY-AUDIT.md`, `MOBILE-QA.md` e
`DATA-SAFETY-INVENTORY.md` para o relatório completo.

- **Navegação**: recordes pessoais (`PrsSection`, `RecentRecordsCard`,
  `RecordsSection`, `ExerciseRecordsSection`) agora linkam para
  `/exercicios/[id]`/`/historico/[id]` em vez de mostrar texto plano — a
  maioria já tinha o id disponível. `ExerciseRecordsSection` resolvia uma
  pendência documentada desde a Sprint 22 Parte 2 (a rota `/historico/[id]`
  já existia desde a Parte 3, só faltava conectar). `programas/[id]` ganhou
  uma seção "Sessões concluídas" linkando para `/historico/[id]`.
- **Acessibilidade**: `OnboardingModal` reconstruído sobre `ModalShell`
  (antes era um dialog não gerenciado); `ModalShell` ganhou focus trap por
  teclado; `GoalForm`/`BodyProgressForm` com `htmlFor`/`id` pareados em
  todos os campos; os 4 gráficos de `ExerciseChartsSection` que só
  expunham dado via tooltip ganharam resumo textual.
- **Mobile**: `.session-header` (botão "Finalizar" da sessão ativa) virou
  sticky; `env(safe-area-inset-*)` adicionado a hambúrguer/close/rodapé da
  sidebar/reward toast/`.app-main`; alvos de toque elevados de 36-40px
  para 44px.
- **Data safety**: novo reset granular de histórico de treinos
  (`resetWorkoutHistory` + `resetPersonalRecordEvents`, sempre disparados
  juntos para não deixar eventos de recorde órfãos) — único gap real
  encontrado num backup/restore/reset já sólido.
- **Performance**: `ExerciseChartsSection` memoizado — as 5 séries de
  gráfico paravam de recalcular do zero (re-parse do histórico completo)
  a cada render.
- 4 testes novos (952/952 no total). Lint, typecheck e build limpos.
- Não enviado ao remoto (`origin/master` segue parado em Sprint 20 parte 1).

#### Sprint 22 (v2) — Completed Workout Detail & Personal Record Events (parte 3) — 2026-07-25

Fecha a pendência consciente deixada na Parte 2: agora existe uma rota
própria para abrir qualquer `CompletedWorkout` por ID, e a detecção de
recordes (`detectNewExerciseRecords`, Parte 1) finalmente vira um evento
estruturado, persistido e conectado à recompensa — não mais só texto livre
no `RewardEvent`.

- **Novo `src/lib/personal-record-events.ts`**: modelo `PersonalRecordEvent`
  (exercício, tipo de recorde, valor anterior/novo, `workoutId`), storage
  local próprio (`lrpg-fit:personal-record-events`), `detectSessionRecordEvents`
  (wrapper puro sobre `detectNewExerciseRecords`, chamado só em
  `finishWorkout()` — nunca ao abrir páginas, recalcular histórico ou
  restaurar backup) e `addPersonalRecordEvents` (idempotente por
  `workoutId`: reload/segundo clique/restore nunca duplicam).
- **Novo `src/lib/workout-detail-engine.ts`**: `getWorkoutDetail(workoutId)`
  agrega `CompletedWorkout` + check-in de prontidão (recalcula
  `calculateReadiness` a partir do check-in salvo — o `sessionOutcome`
  original não é persistido em nenhum lugar hoje, então não é recuperável
  retroativamente; decisão documentada, não é um bug) + comparação
  planejado×realizado (só quando a sessão veio do Planner) + carga semanal
  (`buildTrainingWeek`) + info de programa + os `PersonalRecordEvent` da
  sessão. `getHighlightSessions` seleciona uma sessão por categoria (maior
  volume/carga/duração/XP/recordes) para "Sessões Destaque" em Insights, sem
  repetir a mesma sessão em duas categorias.
- **`RewardEvent`** (`reward-events.ts`) ganhou campos opcionais
  (`workoutId`, `exerciseId`, `recordType`) — retrocompatível com eventos
  antigos, que só tinham texto livre.
- **`finishWorkout()`/`handleConfirmResult()`** (`sessao/page.tsx`):
  detecção estruturada roda antes de `saveCompletedWorkout` (mesma regra do
  detector estreito já existente); persistência e disparo de toast
  acontecem só na confirmação, substituindo o antigo loop de recompensa
  textual por um estruturado e idempotente. XP e contagem de badges não
  foram tocados — continuam vindo do detector estreito (`isPr`/`prsCount`),
  como antes.
- **Rota `/historico/[id]`** (mesmo padrão de `/exercicios/[id]`):
  cabeçalho, resumo (tempo/volume/séries/reps/exercícios/XP/recompensas),
  recordes da sessão, exercícios (com substituição e link para
  `/exercicios/[id]`), comparação planejado×realizado (reaproveita
  `PlannedWorkoutComparisonView`, já existente), carga de treino
  (planejado×realizado + contribuição semanal), prontidão (reaproveita
  `ReadinessCard`), linha do tempo cronológica real (check-in → início →
  recordes → conclusão).
- **Navegação**: `ExerciseTimelineSection` (link "Ver treino concluído"),
  `plano/treino/[id]` ("Ver no histórico" agora aponta para a sessão real
  em vez de `/treinos`), `WorkoutCard`/`treinos/page.tsx` ("último em" vira
  link quando há sessão concluída), Insights (`WorkoutHighlightsSection`,
  nova seção "Sessões Destaque").
- **`backup.ts`**: `lrpg-fit:personal-record-events` adicionada a
  `STORAGE_KEYS`/`ARRAY_KEYS` — eventos de recorde entram no backup/restore.
- **Testes**: `personal-record-events.test.ts` (detecção, idempotência,
  empate não gera evento) e `workout-detail-engine.test.ts` (agregação,
  readiness, programa, comparação, highlights sem repetição). Sem testes de
  componente React (convenção mantida do projeto — motor puro testado,
  UI verificada via QA manual). Gates: lint ✅, 948/948 testes ✅, build ✅,
  `tsc --noEmit` ✅. QA manual: fluxo completo sessão→histórico verificado
  no navegador (desktop 1280px e mobile 375px, sem overflow horizontal, sem
  erros de console).
- **Pendências conscientes**: badges "5 recordes"/"10 recordes" citadas na
  spec não foram criadas — os marcos existentes (`badge-first-pr`,
  `badge-5-prs` em 5, `badge-15-prs` em 15) já cobrem o mesmo papel via
  `pr_count`, e a spec pediu explicitamente "poucos badges, não exagerar";
  Programa (`programas/[id]`) e Badges ainda não linkam diretamente para
  `/historico/[id]` — próxima iteração, se necessário.

#### Sprint 22 (v2) — Exercise Detail Experience (parte 2) — 2026-07-25

Relatório completo em `SPRINT-22-PART2.md`, referência da rota em
`EXERCISE-DETAIL-EXPERIENCE.md`. Transforma o Exercise Intelligence Engine
(Parte 1) em uma experiência visual real: rota `/exercicios/[id]` como
perfil histórico e analítico do exercício, alimentada 100% pelos motores
puros já existentes — nenhum recorde/tendência/volume/frequência é
recalculado em componente React.

- **Novo `src/lib/exercise-detail-engine.ts`**: `resolveExercise` (biblioteca
  → customizado → histórico → não encontrado; não existe "arquivado" para
  exercícios no código atual, então a disponibilidade é binária
  `active`/`removed`), `getExerciseDataQuality` (explica sem tom de alerta
  por que gráficos/tendências podem faltar), `getExerciseRelatedWorkouts` /
  `getExercisesForProgram` (hierarquia Programa → treino), séries prontas
  para gráfico com filtro de período (`30d`/`90d`/`6m`/`1y`/`all`). Arquivo
  separado de `exercise-intelligence.ts` para manter ambos dentro do limite
  de tamanho do projeto — nada aqui recalcula o que o motor da Parte 1 já
  expõe.
- **Novo `src/lib/exercise-highlights.ts`**: agregação para "Exercícios em
  destaque" em Insights (recordes recentes, em evolução, mais substituídos,
  sem execução recente) — integração mínima pedida na spec, sem iniciar
  Analytics 2.0.
- **`exercise-intelligence.ts`**: `ExerciseHistorySummary` ganhou
  `totalWorkouts` (treinos distintos, separado de `totalExecutions` — nunca
  mistura as duas métricas na mesma célula de resumo).
- **Rota `/exercicios/[id]`** (client component, mesmo padrão de
  `programas/[id]/page.tsx`): cabeçalho, resumo executivo + data quality,
  tendências, recordes pessoais, 5 gráficos (Recharts, reaproveitando o
  padrão já usado em Insights), timeline expansível/paginada com séries por
  execução, substituições (com callout ligado ao mesmo limiar de
  `adaptive-recommendations.ts`), programas/treinos relacionados. Layout
  responsivo via `grid-template-areas` (reordena mobile↔desktop sem duplicar
  DOM): mobile — Cabeçalho, Resumo, Tendências, Recordes, Gráficos,
  Substituições, Timeline, Relacionados; desktop — duas colunas (gráficos +
  timeline / recordes + tendências + substituições + relacionados).
- **Navegação de entrada**: biblioteca (`ExerciseLibrary.tsx`, nome agora é
  link), histórico por exercício (`ExerciseHistoryModal.tsx`, link "ver
  página completa"), comparação planejado×realizado
  (`PlannedWorkoutComparisonView.tsx`, nome do exercício vira link quando há
  ID resolvido), página de programa (`programas/[id]/page.tsx`, nova seção
  "Exercícios deste programa"), Insights (`ExerciseHighlightsSection.tsx`).
- **`fix: correct training load test edge case`**: a falha pré-existente em
  `training-load.test.ts` (documentada desde a Sprint 21) não era um bug de
  `training-load.ts` — o teste chamava `getWeeklyAggregateStats` sem congelar
  o relógio do sistema, então só passava por coincidência quando executado
  dentro da mesma semana ISO do fixture (2026-07-13 a 2026-07-19). Corrigido
  isolando o teste com `vi.useFakeTimers()`/`vi.setSystemTime()`; nenhum
  comportamento de produção foi alterado. Suíte fecha em 929/929.
- **Pendências conscientes**: sem rota para abrir um `CompletedWorkout` livre
  por ID (só treinos vindos do Planner têm rota própria) — recordes e
  timeline não linkam para a execução em si, mostram data/treino como texto;
  sem testes de componente React (o projeto nunca usou React Testing
  Library — convenção mantida: motor puro testado exaustivamente, UI
  verificada via QA manual no navegador); gamificação de novos recordes não
  integrada (mesma decisão de escopo da Parte 1).

#### Sprint 22 (v2) — Exercise Intelligence Engine Foundation (parte 1) — 2026-07-25

Relatório completo em `SPRINT-22-PART1.md`, referência da API em
`EXERCISE-INTELLIGENCE.md`. Fecha a maior pendência de dados deixada pela
Sprint 21: substituições de exercício feitas durante a sessão agora
sobrevivem até `CompletedWorkout`, e um motor puro novo
(`src/lib/exercise-intelligence.ts`) consolida histórico, recordes pessoais,
tendências e substituições recorrentes por exercício — reaproveitando
`calculateVolumeKg`/`calculateEstimated1RM` já existentes, sem duplicar
motores.

- **`ExerciseRecord`** (`workout-history.ts`) ganhou `source?`,
  `plannedExerciseId?` e `substitution?` (opcionais, retrocompatíveis).
  `finishWorkout()` (`sessao/page.tsx`) passa a propagar esses campos em vez
  de descartá-los.
- **`planned-performed-comparison.ts`**: `ResolvedProgramExercise.blockId`
  (novo) permite um Tier 0 de matching pelo vínculo explícito de
  substituição, antes do `exerciseId` — uma substituição agora vira um
  `matched` com `wasSubstitution`/`substitutedFromExerciseName`, em vez de
  "1 removido + 1 adicionado".
- **`recommendation-assembly.ts`**: `recurringSubstitutions` finalmente
  populado com dados reais — a regra `review_exercise` (existia desde a
  Sprint 21 Parte 4A, nunca disparava) agora recebe evidência.
- **UI mínima**: `PlannedWorkoutComparisonView.tsx` mostra "substituído de
  X" quando aplicável. Nenhuma página nova (fica para a Parte 2).

#### Sprint 20 (v2) — Workout Templates, Weekly Programs & Program Builder Foundation (parte 1) — 2026-07-19

Relatório completo em `SPRINT-20-PART1.md`, documentação de domínio em `WORKOUT-TEMPLATES.md` e
`TRAINING-PROGRAMS.md`. Fundação de templates de treino reutilizáveis e programas semanais — primeira vez
que o app ganha uma agenda persistida real (Planner mínimo), já que a auditoria confirmou que `/plano` era
só metas/campanhas/ciclos e nenhum agendamento por data existia antes.

- **Novo `src/lib/workout-templates.ts`**: CRUD com versionamento (`version` incrementa a cada edição sem
  afetar snapshots já capturados por programas), duplicação com IDs independentes, arquivamento preferido a
  exclusão destrutiva, `createTemplateFromWorkout` (transforma um treino existente em template sem copiar
  histórico/PRs).
- **Novo `src/lib/training-programs.ts`**: programa → semanas → sessões, cada sessão com
  `WorkoutTemplateSnapshot` (cópia profunda, capturado no momento da escolha do template — testado
  explicitamente contra mutação do template original depois), avisos estruturais neutros (nunca bloqueiam
  salvamento nem qualificam o programa).
- **Novo `src/lib/planned-workouts.ts`** (Planner mínimo): sessões planejadas por data com status
  pendente/concluído/pulado; origem (`PlannedWorkoutSource`) é sempre contexto opcional para analytics,
  nunca dependência viva de template/programa.
- **Novo `src/lib/program-instantiation.ts`**: prévia sem persistência + 4 estratégias de aplicação
  (manter/substituir/pular/cancelar) com detecção real de conflito por data.
- **UI**: `TemplateLibrary`/`TemplateEditorModal` (`/treinos/templates`), `ProgramLibrary`/
  `ProgramEditorWizard` sobre um `Stepper.tsx` genérico novo (`/programas`), `ProgramInstantiationDialog`
  (data inicial, prévia, conflitos, criação opcional de ciclo via `training-cycles.ts`), `PlannedWeekSection`
  em `/plano`.
- **Backup/reset**: três chaves novas em `STORAGE_KEYS`; backups anteriores à Sprint 20 continuam
  importando (listas vazias, sem migração destrutiva); reset granular por checkbox
  (`TemplatesProgramsResetSection.tsx`), sem apagar Planner/ciclos/histórico.
- **Testes**: 65 testes novos — 714/714 no total, sem regressão nos 649 pré-existentes.
- QA funcional real no dev server (não só testes automatizados): criação/duplicação/arquivamento de
  template, criação de programa via wizard, instanciação com conflito real, resolução por substituição +
  criação de ciclo, e independência confirmada por mutação direta do template original após a
  instanciação. QA visual: 14 screenshots (7 fluxos × desktop/mobile) via Playwright + Edge em
  `docs/screenshots/sprint20-part1/`. Lint, `tsc --noEmit`, testes e `next build` limpos.
- **Escopo conscientemente reduzido**: superset/circuit em blocos de exercício, drag-and-drop, execução
  real de treino a partir do Planner, matriz exaustiva de screenshots por estado, auditoria de
  acessibilidade dedicada — todos documentados como pendência em `SPRINT-20-PART1.md`. IA, prescrição
  automática, progressão de carga e periodização permanecem fora de escopo, como definido no spec original.

#### Sprint 19 (v2) — Consolidation, Export, Backup Compatibility & Release QA (parte 4) — 2026-07-19

Relatório completo em `SPRINT-19-FINAL.md`. Encerramento da Sprint 19: auditoria global confirmou que a Parte 3C já estava implementada e apenas não commitada (commitada isoladamente antes de qualquer código novo desta parte), e que as lacunas reais eram exportação CSV/Markdown (0% implementado) e reset granular além de "tudo"/"fotos".

- **Novo `src/lib/body-wellness-export.ts`**: CSV de progresso corporal, CSV de bem-estar e relatório em Markdown, todos com filtro de período (30/90 dias/tudo). Reaproveita `body-progress-trends.ts`, `wellness-trends.ts` e `wellness-overview.ts` — nenhuma fórmula nova. `readiness_score` no CSV de bem-estar fica sempre vazio, por não recalcular o score fora do contexto de treino original (ver `BODY-WELLNESS-EXPORTS.md`).
- **UI**: `BodyWellnessExportSection.tsx` em Configurações (seletor de período + 3 downloads); `BodyProgressResetSection.tsx` — reset granular do progresso corporal com pergunta explícita sobre apagar as fotos vinculadas, reaproveitando `resetAllBodyProgress` (novo, em `body-progress-photo-link.ts`, composto sobre `deleteEntryAndPhotos` já existente).
- **Testes**: 20 testes novos para os dois arquivos antes sem cobertura (`body-progress-photo.ts`, `body-progress-photo-errors.ts`), 17 para a exportação e 3 para `resetAllBodyProgress` — 649/649 no total, sem regressão nos 629 pré-existentes.
- Lint, `tsc --noEmit`, testes e `next build` limpos. `.gitignore` passou a ignorar `/test-results` (artefato do Playwright).
- **Escopo conscientemente reduzido**: reset granular por categoria completa (treinos/ciclos/metas/check-ins), auditoria de acessibilidade dedicada e QA visual mobile desta parte, UI de integridade de fotos em Configurações — todos documentados como pendência em `SPRINT-19-FINAL.md`. Backup ZIP com fotos, criptografia local e exportação em PDF permanecem fora de escopo, como já definido no spec original da sprint.
- **Sprint 19 encerrada como concluída parcialmente** — núcleo técnico pronto e testado; QA visual/mobile/acessibilidade dedicados ficam para uma sessão futura.

#### Sprint 19 (v2) — Wellness × Training Associations in Insights (parte 3C, fatia 1) — 2026-07-19

Relatório completo em `SPRINT-19-PART3C.md`. Primeira fatia de integração de bem-estar em Insights, com escopo reduzido combinado com o usuário após auditoria: Dashboard e Perfil já tinham cards de readiness/corpo próprios, então esta fatia cobre só a lacuna real — o motor `wellness-associations.ts` (Parte 3A) e o resumo de bem-estar por ciclo (Parte 3B) não estavam conectados a nenhuma UI fora de Plano/Ciclo.

- **Auditoria prévia**: confirmou cards existentes em Dashboard (`ReadinessOverviewCard`, `BodyProgressCard`), Insights (`ReadinessInsightsSection`, `BodyWellnessSection`) e Perfil (estatísticas de readiness, `BodyProgressSection`) — nada foi duplicado ou mesclado.
- **Novo `src/lib/wellness-overview.ts`**: camada de composição pura, sem storage direto e sem fórmulas novas. `buildWellnessAssociationsOverview` reduz as 21 combinações de `computeAllWellnessTrainingAssociations` (7 métricas × 3 dimensões) a no máximo uma associação por métrica de bem-estar, priorizando direção clara e maior confiança, evitando repetir a mesma coincidência sob eixos de treino diferentes. `getActiveCycleWellnessOverview` expõe o resumo do ciclo ativo.
- **UI**: nova `WellnessAssociationsSection.tsx` em Insights — card de associações com linguagem não causal (texto vem literalmente do engine), confiança sempre como rótulo visível (nunca só cor), amostra explícita; reaproveita o `CycleWellnessSection.tsx` já existente para o contexto do ciclo ativo, em vez de duplicá-lo.
- 6 testes novos (`wellness-overview.test.ts`) — 609/609 no total, sem regressão nos 603 testes pré-existentes. QA visual com dados sintéticos via Playwright + Edge (Browser pane trava em `screenshot` neste ambiente): desktop, mobile e estado vazio capturados em `docs/screenshots/sprint19-part3c/`. Lint, typecheck e build de produção limpos.
- **Escopo conscientemente reduzido**: consolidação do Dashboard, sequência de check-ins no Perfil, comparação de períodos de bem-estar e gráficos dedicados por métrica ficam para fatias seguintes; screenshots/acessibilidade pendentes da Parte 3B ainda não foram feitos; auditoria de acessibilidade dedicada desta fatia também adiada.

#### Sprint 19 (v2) — Wellness Associations in Training Cycles (parte 3B) — 2026-07-19

Relatório completo em `SPRINT-19-PART3B.md`. Camada derivada de bem-estar por ciclo de treino: médias, cobertura, tendência interna (primeira vs. segunda metade do ciclo) e associações bem-estar × treino restritas ao intervalo do ciclo, integradas ao resumo de ciclo, à revisão e à comparação entre ciclos.

- **Auditoria prévia**: confirmou que `training-cycle-summary.ts` já filtrava check-ins pelo ciclo para `averageReadiness`; que `archiveCycle` preserva `completedAt` (arquivamento não altera a análise); e que `wellness-associations.ts` (Sprint 19 Parte 3A) já nunca compara bem-estar contra o score de prontidão — não havia associação circular a filtrar no motor em si.
- **Novo `src/lib/training-cycle-wellness.ts`**: `getCycleDateRange`/`filterCheckInsForCycle` (mesma regra de corte de `training-cycle-summary.ts`), `buildCycleWellnessSummary` (médias que nunca tratam campo ausente como zero, cobertura, tendência por metade do ciclo com uma direção `irregular` distinta detectada por coeficiente de variação, seleção de até 3 associações priorizando achados com direção clara) e `compareCycleWellness` (nunca declara vencedor, sinaliza amostra insuficiente por lado e diferença de duração entre ciclos).
- **Decisão**: semanas que atravessam a borda do ciclo são resolvidas construindo os agregados semanais de treino só a partir de sessões já filtradas pelo intervalo do ciclo, em vez de um adaptador de corte de semana separado — mais simples e correto por construção.
- **Decisão**: a prontidão média do resumo de bem-estar reaproveita `buildCycleSummary` em vez de duplicar a fórmula já existente.
- **UI**: novo `CycleWellnessSection.tsx` ("Bem-estar durante o ciclo", com expansão "Ver detalhes"), integrado ao ciclo ativo (`CycleSection.tsx`) e ao histórico (`CycleHistorySection.tsx`); bloco somente leitura "Contexto do ciclo" em `CycleReviewForm.tsx`, oculto quando não há check-ins e nunca persistido com a revisão; nova seção "Bem-estar" em `CycleComparisonSection.tsx`.
- 29 testes novos (`training-cycle-wellness.test.ts`) — 603/603 no total, sem regressão nos 574 testes pré-existentes. QA manual no dev server (dados existentes, sem check-ins de bem-estar): estado vazio correto do bloco, seção de bem-estar na comparação sem quebrar layout, contexto de revisão corretamente ausente com dado zerado. Lint, typecheck e build de produção limpos.
- **Escopo conscientemente reduzido**: Dashboard, Insights e Perfil não tocados; nenhum campo novo de check-in; nenhuma métrica derivada persistida; screenshots formais desktop/mobile e auditoria de acessibilidade dedicada adiadas por falta de dados de bem-estar reais no ambiente de QA desta sessão (cobertos pelos 29 testes automatizados com dados sintéticos).

#### Sprint 19 (v2) — Body Progress, Measurements & Wellness Trends (parte 1) — 2026-07-19

Relatório completo em `SPRINT-19-v2.md`. Primeira camada opcional e privada de progresso corporal (peso/medidas) e tendências de bem-estar, conectando evolução de treino, corpo e bem-estar — sem diagnosticar, classificar corpos, prescrever metas de peso ou afirmar causalidade entre bem-estar e desempenho.

- **Auditoria prévia**: confirmou que nenhum campo de peso corporal existia no projeto (`weight` sempre se referia a carga de treino); nenhum uso de IndexedDB; o padrão de domínio do projeto é módulo funcional (`src/lib/<domínio>.ts` + `localStorage` direto), não Zustand store; `readiness-check-ins.ts` já cobria energia/dor muscular/sono/motivação, faltando apenas estresse e humor.
- **Decisão arquitetural (ADR)**: bem-estar estende `WorkoutReadinessCheckIn` com `stress`/`mood`/`sleepHours` opcionais, em vez de criar um domínio "wellness" paralelo — evita duas entradas diárias parecidas e reaproveita toda a infraestrutura de check-in já validada. Fotos de progresso adiadas para uma sub-sprint 19.1 futura — exigiriam IndexedDB (sem precedente no projeto) e uma estratégia de backup para blobs que `backup.ts` (JSON-only) não suporta hoje.
- **Novo `src/lib/body-progress.ts`**: modelo persistente `BodyProgressEntry`/`BodyMeasurements` (peso, 11 medidas nomeadas + medidas customizadas, notas, vínculo opcional com ciclo), storage `lrpg-fit:body-progress`, todos os campos opcionais — o app funciona normalmente sem nenhum registro.
- **Novo `src/lib/trend-math.ts`**: motor compartilhado de classificação de tendência (regressão linear simples sobre janela recente + detecção de irregularidade por inversão de direção), extraído para evitar duplicar a mesma lógica em `body-progress-trends.ts` e `wellness-trends.ts`. Estabilidade tem prioridade sobre irregularidade na classificação — ruído pequeno em torno de uma linha reta não é tratado como oscilação.
- **Novo `src/lib/body-progress-trends.ts`**: tendência de peso e de qualquer medida (nomeada ou customizada), comparação de dois períodos (`comparePeriods`) que nunca declara um "vencedor" — apenas descreve médias, primeiro/último valor e frequência de cada lado.
- **Novo `src/lib/wellness-trends.ts`**: médias/tendências por campo de bem-estar + duas associações com treino (sono×energia do mesmo dia, estresse médio×frequência semanal), sempre com amostra mínima configurável antes de relatar qualquer associação; mensagens usam exclusivamente linguagem de coincidência ("no seu histórico", "coincidiram"), nunca causal ("causou", "porque") — testado explicitamente.
- **Backup**: `lrpg-fit:body-progress` adicionado a `STORAGE_KEYS`/`ARRAY_KEYS`, com teste de compatibilidade com backups anteriores à Sprint 19 (chave ausente) e rejeição de dado malformado.
- **UI**: `BodyProgressForm` (peso, medidas progressivas com "favoritas" configuráveis via `preferences.ts`, observações, ciclo opcional) e `BodyProgressSection` (Perfil — resumo, histórico, editar/excluir com confirmação) em `src/components/profile/`; `BodyProgressCard` no Dashboard; `BodyWellnessSection` (gráfico de peso via Recharts, tendência de medidas, médias de bem-estar, texto de associação) + `BodyPeriodComparisonCard` (30/90 dias) em Insights. `ReadinessCheckIn` ganhou uma seção opcional recolhida de estresse/humor, sem alterar o fluxo de check-in existente.
- **Escopo conscientemente reduzido**, confirmado com o usuário antes de implementar: fotos de progresso e tudo que depende delas (IndexedDB, galeria, aviso de privacidade, backup com blobs) ficam para a Sprint 19.1; comparação de períodos limitada a janelas fixas de 30/90 dias (ciclo atual vs. anterior não implementado — exigiria resolver data de término de ciclo, hoje derivada apenas via `plannedWeeks`); exportação CSV/Markdown; nenhum tipo novo de meta de peso/medida em `training-goals.ts` — o vínculo com metas é apenas informativo, por `cycleId`/data.
- 50 testes novos (`body-progress.test.ts` 19, `trend-math.test.ts` 7, `body-progress-trends.test.ts` 8, `wellness-trends.test.ts` 7, `readiness-check-ins.test.ts` 6, +3 em `backup.test.ts`) — 511/511 no total, sem nenhuma regressão nos 461 testes pré-existentes. QA manual no dev server: criação de registro com peso e medida → refletido em Dashboard/Perfil/Insights → edição prefilada corretamente → exclusão com confirmação → estado vazio retorna. Console limpo à exceção de um warning de hidratação pré-existente em `WeeklyStatsSection.tsx` (confirmado via `git diff` que o arquivo não foi tocado nesta sprint — fora de escopo corrigir). Lint, typecheck e build limpos.

#### Sprint 19 (v2) — Private Progress Photos, IndexedDB & Local Data Safety (parte 2) — 2026-07-18

Relatório completo em `SPRINT-19-PART2.md`. Fotos privadas de progresso, armazenadas localmente via IndexedDB e vinculadas a `BodyProgressEntry` — item adiado explicitamente na Parte 1.

- **Decisões arquiteturais (ADR)**, confirmadas com o usuário antes de implementar: (1) uma foto pertence a exatamente um registro corporal, sem reuso entre registros; (2) redimensionamento/compressão via Canvas API nativa (`toBlob()`), sem nova dependência de produção; (3) `fake-indexeddb` como devDependency para testar o wrapper de IndexedDB sob Vitest/jsdom.
- **Novo `src/lib/body-progress-photo.ts`**: modelo (`BodyProgressPhoto`, `BodyProgressPhotoRecord`, `BodyPhotoConfig`, `BodyPhotoValidationError`), config padrão documentada (máx. 15 MB original, 1600px imagem principal, 320px miniatura, 6 fotos por registro).
- **Novo `src/lib/body-progress-photo-db.ts`**: único uso de IndexedDB no app (`lrpg-fit-photos` v1, store `photos`, índices `by-entryId`/`by-takenAt`/`by-category`); toda função checa disponibilidade e nunca lança — trata `QuotaExceededError` e IndexedDB indisponível com retornos neutros; toda conexão é fechada em `finally`, mesmo em erro.
- **Novo `src/lib/body-progress-photo-validation.ts`** + **`body-progress-photo-processing.ts`**: validação de arquivo (MIME/tamanho/vazio/limite por registro) e decodificação/redimensionamento/geração de miniatura via `createImageBitmap`/`<canvas>`, sem filtros, retoque ou análise corporal.
- **Novo `src/lib/body-progress-photo-link.ts`**: vínculo entre registro e foto — `resolveEntryPhotos` nunca lança em referência quebrada (`metadata: null`), exclusão de registro com cascata opcional de fotos, reset granular via `stripAllPhotoLinks`.
- **UI**: seção "Fotos de progresso" no `BodyProgressForm` (modo edição), `PhotoPrivacyNotice` (aviso único, persistido em `preferences.ts`), `BodyProgressPhotoGallery`, `PhotoDetailModal` (editar categoria/excluir), `PhotoComparisonModal` (2 colunas desktop, empilhado mobile via `.grid-2-col`), `PhotoResetSection` (reset granular só de fotos).
- **Backup**: `BackupPayload.media.bodyPhotosIncluded` sempre `false` — blobs nunca entram no JSON, só a contagem; `exportBackup`/`downloadBackup`/`resetAllData` tornados assíncronos para compor com o IndexedDB.
- **Bug real encontrado e corrigido durante QA visual**: cancelar a edição de um registro não recarregava a lista de entradas — fotos adicionadas durante a edição (que persistem direto, independente do botão "Salvar") ficavam invisíveis até um reload manual.
- **Escopo conscientemente reduzido**: exportação/importação ZIP completa e UI de "espaço usado em MB" adiadas para a Sprint 19.3.
- 53 testes novos (`body-progress-photo-db.test.ts` 18, `body-progress-photo-validation.test.ts` 10, `body-progress-photo-processing.test.ts` 10, `body-progress-photo-link.test.ts` 11, +4 em `body-progress.test.ts`) — 564/564 no total, sem regressão. QA visual (desktop 1280px + mobile 375px) via Playwright/msedge, screenshots em `docs/screenshots/sprint19-part2/`. Lint, typecheck e build limpos.

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
