# Roadmap de Sprints — Redesign Visual & Navegação

Abordagem: **híbrida**. Mantém toda a lógica e dados da v1 (treinos, XP, atributos, badges, diário, nutrição, backup). Reconstrói apenas navegação e sistema visual, usando paleta do `DESIGN.md` adaptada para fundo escuro.

**Regra de ouro:** nenhuma feature do backlog congelado (seção final deste arquivo) entra em código antes da Sprint 6 ser aceita.

---

## Sprint 1 — Consolidação da Fundação Visual + Navigation Shell ✅
**Objetivo:** consolidar a fundação já existente (tokens, navegação via `AppSidebar`) em um design system aplicável, com Style Guide e Dashboard piloto.
**Critério de aceite:** style guide navegável; navegação tokenizada e acessível; Dashboard piloto usando 100% dos tokens novos; build/lint/typecheck limpos; QA desktop + mobile com screenshots.

> Decisão de navegação **encerrada**: sidebar fixa (desktop) + drawer com overlay (mobile), base `AppSidebar.tsx`. Não reabrir; não recriar BottomNav; não substituir por tab bar.

- [x] Consolidar `src/styles/tokens.css` (paleta chartreuse/deep-forest, tipografia, spacing, radius, sombras, layout, motion) — ver `DESIGN.md`
- [x] Adicionar Fraunces (display) via `next/font`; manter Inter (UI)
- [x] Expandir integração Tailwind com os tokens (`tailwind.config.ts`, via variáveis CSS)
- [x] Criar página `/style-guide` isolada com foundations, componentes e padrões de Dashboard
- [x] Tokenizar navigation shell (`AppSidebar` + `shell.css`): remover inline styles, melhorar acessibilidade (Escape, scroll lock, retorno de foco, aria)
- [x] Reconstruir Dashboard como piloto: componentes extraídos para `src/components/dashboard/`, rota reduzida a dados + composição
- [x] Remover código morto (`BottomNav.tsx`, `TopBar.tsx`)
- [x] Alinhar documentação com o código real (stores, chaves `lrpg-fit:*`, navegação)
- [x] Build, lint e typecheck limpos; QA desktop + mobile com screenshots

## Sprint 2 — Treinos e Sessão Ativa ✅
**Objetivo:** migrar a tela mais usada do app para o novo sistema visual.
**Duração estimada:** 3–4 dias
**Critério de aceite:** fluxo completo (iniciar → série → finalizar) visualmente consistente com o Dashboard.

- [x] Lista de treinos e templates no novo padrão (seções Meus treinos × Templates, filtros tokenizados, banner de sessão ativa, início rápido com recomendação)
- [x] Sessão ativa (timer, séries) redesenhada (header compacto com progresso, cards de exercício, inputs touch-friendly, ✓ em séries)
- [x] Modal de resultado/XP alinhado ao design system (stats reais, XP em Fraunces, callouts de level-up/PR)
- [x] Histórico de treino e detecção de PR mantidos, só reestilizados (lógica de XP/PR/atributos/badges intocada; guards de idempotência adicionados contra duplo clique)

## Sprint 3 — Perfil (Atributos, Badges) ✅
**Objetivo:** Perfil consistente com Dashboard e Treinos.
**Duração estimada:** 2–3 dias
**Critério de aceite:** Perfil aprovado lado a lado com as duas telas anteriores.

- [x] Header de personagem, atributos e badges no novo padrão (componentes em `src/components/profile/`, estilos em `profile.css`/`progression.css`)
- [x] Remoção de qualquer resquício de estilo antigo (bloco "Legado v1" removido de `components.css`; LevelUpModal/RewardToast tokenizados; verde Spotify zerado no escopo)

## Sprint 4 — Insights ✅
**Objetivo:** corrigir a tela que ficou genérica em dois redesigns anteriores da v1.
**Duração estimada:** 3–4 dias
**Critério de aceite:** gráficos usando os tokens de cor; qualidade de layout equivalente ao Dashboard.

- [x] Padronizar cores/tipografia nos gráficos Recharts (tokens `--color-chart-*` em `tokens.css`; equivalentes JS em `CHART_COLORS`/`PIE_PALETTE`/`MACRO_COLORS` de `theme-colors.ts`, único ponto de hex para bibliotecas de gráfico)
- [x] Reorganizar cards de insight (volume semanal, evolução de carga, distribuição por categoria, PRs recentes, tags do diário) — componentizados em `src/components/insights/`, estilos em `insights.css`

## Sprint 5 — Diário e Nutrição ✅
**Objetivo:** últimas duas telas migradas para o novo sistema.
**Duração estimada:** 2–3 dias
**Critério de aceite:** ambas revisadas visualmente, sem CSS legado.

- [x] Diário no novo padrão (tags automáticas mantidas) — 375→145 linhas, componentizado em `src/components/diary/`, estilos em `diary.css`
- [x] Nutrição no novo padrão (metas de macros, logs) — 384→51 linhas, componentizado em `src/components/nutrition/`, estilos em `nutrition.css`; paleta de macros unificada com Insights (`MACRO_COLORS` de `theme-colors.ts`)

## Sprint 6 — QA Visual Completo + Configurações/Backup + Deploy
**Objetivo:** consolidar tudo, validar cada rota e publicar.
**Duração estimada:** 2–3 dias
**Critério de aceite:** screenshot de cada rota aprovado; build/lint limpos; backup/reset testados e confirmados acessíveis.

- [x] Página de Configurações/Backup revisada visualmente — componentizada em `src/components/settings/`, estilos em `settings.css`, zero hex/rgba soltos
- [x] Checklist de screenshot por rota (ver `QA_CHECKLIST.md`) — `docs/screenshots/sprint6/`
- [x] Deploy na Vercel com release notes

## Sprint 7 — Sessão Ativa e Fluxo de Treino: QA Real e Produção ✅
**Objetivo:** fechar a pendência da Sprint 6 — recapturar `/sessao` (sessão ativa) com estado real via seed de `localStorage` no shape do Zustand persist, já que não há como chegar nessa tela por navegação estática.
**Duração estimada:** 0.5–1 dia
**Critério de aceite:** screenshot de `/sessao` (desktop+mobile) com exercícios/séries reais, do aviso de exercício incompleto e do modal de resumo pós-treino; build/lint limpos; produção validada.

- [x] Auditoria de hardcodes visuais em `src/components/session/` e `src/components/workouts/` — encontrado 1 hardcode real (opacity/cursor inline em `ExercisePickerModal.tsx`), migrado para `.picker-row:disabled` em `workouts.css`
- [x] Script Playwright (msedge) seedando `lrpg-fit:active-session` para reproduzir sessão ativa com 2 exercícios completos + 1 pendente
- [x] Screenshots desktop+mobile de `/sessao`, do diálogo de exercícios incompletos e do `WorkoutSummaryModal` (XP, breakdown, level-up/PR) em `docs/screenshots/sprint7/`
- [x] Banner de sessão ativa em `/treinos` revalidado com sessão em andamento
- [x] Build e lint limpos

## Sprint 8 — Hub de Treinos Premium ✅
**Objetivo:** elevar `/treinos` ao mesmo padrão visual e organizacional de Perfil, Insights, Diário, Nutrição, Configurações e Sessão Ativa, sem adicionar funcionalidades novas.
**Duração estimada:** 1 dia
**Critério de aceite:** fluxo de treinos 100% funcional, página totalmente componentizada, CSS dedicado, zero hardcodes visuais, QA Playwright, build/lint/typecheck limpos, deploy validado.

- [x] Auditoria da arquitetura atual (dados, fluxos, componentes, pontos de acoplamento)
- [x] `WorkoutsHeader` e `WorkoutsHero` (saudação, stats, recomendação) extraídos para `src/components/workouts/`
- [x] `WorkoutEmptyState` ilustrado para o caso de zero treinos cadastrados
- [x] `WorkoutCard` enriquecido com "última execução" (leitura read-only de `lib/workout-history.ts`)
- [x] Correção de acessibilidade: ações de treino (duplicar/editar/excluir) alcançáveis via teclado (`:focus-within`)
- [x] `treinos/page.tsx` reduzido a dados + composição
- [x] QA Playwright (CRUD, iniciar treino, sessão ativa, persistência, responsividade) — `docs/screenshots/sprint8/`
- [x] Build, lint e typecheck limpos; deploy Vercel validado

Esta sprint encerra a modernização do fluxo principal do produto. As próximas sprints podem focar em evolução (novas funcionalidades, analytics, sincronização, IA, backend, recursos premium).

## Sprint 9 — Dashboard: Estabilidade de Hydration e Consolidação Visual ✅
**Objetivo:** fechar a dívida técnica conhecida de hydration mismatch do Dashboard (#425/#418/#423), sem novas funcionalidades.
**Duração estimada:** 0.5–1 dia
**Critério de aceite:** 0 erros de hydration no console em `/dashboard` e `/treinos` (build de produção, múltiplos timezones); sem flash de personagem mock/zerado antes dos dados reais; build/lint/typecheck limpos.

- [x] Causa raiz identificada: dois bugs distintos — saudação/data calculadas direto no render (`DashboardHero`, e o mesmo padrão em `WorkoutsHero`) e flash de `MOCK_CHARACTER` antes da store `persist` reidratar
- [x] `useHasHydrated`/`useMounted` (`src/hooks/useHasHydrated.ts`) e `useGreeting` (`src/lib/greeting.ts`) — hooks reutilizáveis, únicos pontos de solução
- [x] `useCharacterStore` com `skipHydration: true` + `StoreHydrationBoundary` (rehydrate explícito no layout raiz) — sem alterar chaves de storage, contratos ou lógica de XP/nível
- [x] `DashboardHero` e `WorkoutsHero` migrados para os novos hooks; Dashboard gateia o Hero com skeleton até a store reidratar
- [x] QA Playwright (msedge) contra build de produção local, 3 timezones, cenários vazio/populado/refresh/level-up/mobile/regressão nas demais rotas — 0 erros de console
- [x] Build, lint e typecheck limpos

**Fora do escopo desta sprint (backlog documentado):** consolidação de `style={{}}` inline em `dashboard.css` (sem hardcodes hex/rgba — só inconsistência de padrão com outras telas).

## Sprint 10 — QA Sistêmico, Integridade de Dados e Hardening (parcial) ✅
**Objetivo:** auditar o app como sistema completo (stores, backup, XP/recompensas) e corrigir falhas sistêmicas com evidência real, sem expandir escopo funcional. Ver `SPRINT-10.md` para o relatório completo.
**Duração estimada:** 1 dia (execução escopada; especificação original é maior, ver pendências)

- [x] Auditoria de stores, chaves de `localStorage` e fluxos de XP/recompensa
- [x] Corrigido: missões manuais do Dashboard não concediam XP nem toast de recompensa
- [x] Corrigido: importar backup não recarregava/re-hidratava o app (inconsistente com o reset)
- [x] Corrigido: import de backup não era atômico nem validava schema por chave
- [x] Fundação de testes automatizados adicionada (Vitest) — 19 testes cobrindo backup/import/reset/missões
- [x] QA manual dirigido: rotas vazias, export/reset/import, missão→XP, responsividade mobile — sem erros de console
- [x] Lint, typecheck, testes e build limpos
- [x] Fora do escopo desta execução: suíte Playwright completa, teste de volume, matriz de responsividade 5×8, smoke test em produção/deploy (ver `SPRINT-10.md` §7) — pendências não críticas, documentadas

## Hotfix 10.1 — Inicialização segura do personagem ✅
**Objetivo:** corrigir o bug crítico descoberto na Sprint 10 — `character` nunca era inicializado numa instalação nova, então XP de treino/diário/nutrição/missões não acumulava até o usuário renomear o personagem por acidente na Perfil. Feito como hotfix separado a pedido explícito do usuário, que não quis encerrar a Sprint 10 com esse bug em aberto. Ver `SPRINT-10.md` (seção "Hotfix 10.1") para auditoria, decisão arquitetural, testes e QA completos.

- [x] Auditoria: nenhum ponto de criação de personagem existia (onboarding só grava preferências); `MOCK_CHARACTER` já usado como fallback de leitura em toda a UI
- [x] Nova action `initializeCharacter()` em `useCharacterStore` — idempotente, nunca sobrescreve personagem existente
- [x] Chamada em `StoreHydrationBoundary` após `rehydrate()` resolver (pós-montagem, sem risco de hydration mismatch) — cobre qualquer rota de entrada, não só o Dashboard
- [x] Recupera `character: null` legado (backup antigo, storage corrompido) pelo mesmo caminho de uma instalação nova, sem migração separada
- [x] 12 testes novos (10 em `useCharacterStore.test.ts`, 2 em `backup.test.ts`) — 31/31 no total
- [x] QA em instalação realmente limpa: onboarding → personagem semeado → missão concede XP real → reward event registrado → refresh preserva progresso → diário concede XP → Dashboard/Perfil consistentes → zero erros de console/hydration; estado legado `character: null` recuperado sem apagar dados não relacionados
- [x] Lint, typecheck, testes (31/31) e build limpos

## Sprint 11 — Workout Planner & Recovery Intelligence ✅
**Objetivo:** transformar o app de "registrador de treinos" em "planejador de treinos", recomendando automaticamente qual treino faz mais sentido hoje com base em recuperação muscular — cálculo 100% local e determinístico, sem IA. Ver `SPRINT-11.md` para o relatório completo.

- [x] Auditoria: `Exercise.muscle_groups` é texto livre em português sem taxonomia canônica; `lib/recommendations.ts` (preferências) já existia e permanece intocado — novo sistema roda em paralelo
- [x] `src/lib/muscle-groups.ts` — taxonomia canônica (7 grupos), `RECOVERY_HOURS`, normalização de termos livres
- [x] `src/lib/workout-recovery.ts` — cálculo de recuperação por grupo, score por treino (dominado pelo grupo mais fatigado, não pela média), ranking determinístico com desempate, casos especiais (nunca realizado, sessão ativa, sem grupo mapeável)
- [x] Componentes novos: `WorkoutRecommendationCard` (Dashboard), `RecoveryBadge`, `RecoveryIndicator`, `WorkoutStatus`, `WorkoutRecommendationReason`
- [x] `WorkoutCard`, `/treinos` (ranking + selo "⭐ Recomendado hoje") e `/dashboard` (novo card) integrados sem alterar XP/níveis/badges/histórico/backup/sessão ativa
- [x] Bug de hydration mismatch descoberto e corrigido em QA: ordenação por recuperação gateada por `useMounted()` (mesma classe de bug do Sprint 9)
- [x] 32 testes novos (`muscle-groups.test.ts`, `workout-recovery.test.ts`) cobrindo normalização, recuperação por grupo, score, empate, nunca realizado, sessão ativa, grupo não mapeável
- [x] QA Playwright (msedge) com histórico semeado em datas variadas — `docs/screenshots/sprint11/`
- [x] Build, lint, typecheck e testes (63/63) limpos

## Sprint 12 — Progressive Overload & Personal Records ✅
**Objetivo:** acompanhar a evolução física do jogador em cada exercício — detecção automática de recordes (peso, repetições, volume, primeira execução), sugestão de progressão, e visibilidade em Insights/Dashboard/Perfil — sem alterar XP ou badges existentes. Ver `SPRINT-12.md` para o relatório completo.

- [x] Auditoria: detector de PR existente (`sessao/page.tsx`) era estreito (só peso, nunca dispara na primeira execução de um exercício) e alimentava diretamente `calculateXpGain`/`checkAndEarnBadges`; decisão de manter esse caminho 100% intocado e tratar peso/reps/volume/primeira-vez como metadados aditivos, opcionais, em `ExerciseRecord` — sem nova chave de storage, sem bump de `BACKUP_VERSION`
- [x] `src/lib/exercise-records.ts` — `calculateVolumeKg`, `calculateEstimated1RM` (Epley), `detectExercisePrs`, `getExerciseSummary`, `getLastExecutionSummary`, `getRecentRecords`, `getTopGrowthExercises`/`getStagnantExercises`, `getProfileRecordStats`
- [x] `finishWorkout()`/`handleConfirmResult()` (sessão) wireados de forma aditiva: novos campos gravados no histórico, novo toast `'pr'` (🏆 Novo Recorde!) enfileirado junto de badge/level_up/attribute_up — `prsCount`/XP/badges seguem byte-a-byte iguais
- [x] "Última execução" discreta no card de exercício durante a sessão ativa
- [x] Insights enriquecido: `recentRecords` (com tipo de recorde), `topGrowthExercises`/`stagnantExercises` (novo card "Evolução por exercício"), `volumeKg` por ponto de carga (prepara gráficos futuros)
- [x] Novo card "Últimos Recordes" no Dashboard; nova seção "Recordes" no Perfil (total, maior carga, exercício mais evoluído, maior sequência)
- [x] "Tela de Exercícios" do escopo original resolvida enriquecendo o `ExerciseHistoryModal.tsx` já existente (volume, 1RM estimado, tendência, selos de recorde por sessão) em vez de nova rota — decisão confirmada com o usuário para não reabrir a navegação travada
- [x] 32 testes novos (`exercise-records.test.ts`) + 2 testes de round-trip de backup (`backup.test.ts`) cobrindo PR novo, empate, carga menor, mais reps, maior volume, primeira execução, tendência, streak e compatibilidade com histórico antigo sem os novos campos
- [x] QA end-to-end no dev server: sessão real gerou PR de peso + primeira execução, toast disparou, XP (+110) e badge ("Recorde Pessoal") idênticos ao formato pré-existente, Dashboard/Insights/Perfil consistentes — `docs/screenshots/sprint12/`
- [x] Build, lint, typecheck e testes (95/95) limpos

## Sprint 15 — Adaptive Session Control & Readiness Validation ✅
**Objetivo:** transformar as orientações de prontidão em ações práticas opcionais e reversíveis para a sessão atual. Ver `SPRINT-15.md` para o relatório completo.

- [x] Auditoria da Sprint 14: readiness-check-ins.ts, workout-readiness.ts, componentes e fluxo — tudo íntegro; QA visual pendente documentado
- [x] `src/lib/session-adjustments.ts` — engine puro com `readinessToPreset`, `applyAdjustmentToExercise`, `buildAdjustmentSummary`, `validateAdjustment`, `roundWeightDown`, `toSnapshot`, `computeAdjustmentStats`, `isValidAdjustmentSnapshot`; config centralizada sem números mágicos; arredondamento sempre para baixo ao incremento mais próximo
- [x] `SessionAdjustmentMode` (original | conservative | custom) e `SessionAdjustment`, `AdjustedExerciseTarget`, `AppliedSessionAdjustmentSnapshot` como tipos explícitos
- [x] `useSessionStore` atualizado: `sessionAdjustment` persiste no localStorage e é limpo ao iniciar/encerrar sessão
- [x] `SessionAdjustmentPanel` — painel inline na fase de treino: mostra sugestão, aceitar preset, personalizar (4 campos opcionais) e desfazer; nenhum ajuste aplicado automaticamente
- [x] `SessionExerciseCard` atualizado: exibe meta original e meta ajustada lado a lado quando há diferença; progressão suprimida indicada textualmente
- [x] `WorkoutSummaryModal` atualizado: seção "Estratégia da sessão" com modo, detalhes e prontidão inicial relacionada ao outcome
- [x] `CompletedWorkout` atualizado: campo `appliedSessionAdjustment?` opcional (snapshot imutável); backward-compatible com histórico antigo
- [x] `ReadinessOverviewCard` (Dashboard) enriquecido: estatísticas de ajuste dos últimos 7 dias
- [x] 52 testes novos (`session-adjustments.test.ts`) — 216/216 no total, 9 arquivos
- [x] Arredondamento: `roundWeightDown` — sempre para o incremento disponível mais próximo abaixo; nunca arredonda para cima; zero-weight preservado
- [x] Presets: alta → original; moderada → consolidação (sem redução de carga, +30s descanso, técnica); baixa → conservador (−10%, −1 série, +30s)
- [x] XP, badges, PRs, Sprint 14, Sprint 13, navegação e histórico antigo intocados
- [x] Build, lint, typecheck (0 erros) e 216 testes limpos

## Sprint 14 — Readiness, Recovery & Adaptive Workout Guidance ✅
**Objetivo:** conectar planejamento, histórico e progressão ao estado atual do usuário — "Como devo abordar o treino de hoje?" — via check-in pré-treino e engine de prontidão local, determinístico e testado. Ver `SPRINT-14.md` para o relatório completo.

- [x] Auditoria: `workout-recovery.ts` (Sprint 11) já fornecia `recoveryPercent` por grupo muscular; `workout-intelligence.ts` (Sprint 13) fornecia status de progressão; nenhum dado subjetivo pré-treino existia
- [x] `src/lib/readiness-check-ins.ts` — novo módulo: tipo `WorkoutReadinessCheckIn` (energy/soreness/sleepQuality/motivation 1-5), CRUD, validação por campo, importação granular, deduplicação por id
- [x] `lrpg-fit:readiness-check-ins` adicionado ao backup (ARRAY_KEYS); `checkInId?` adicionado a `CompletedWorkout` para link check-in → sessão
- [x] `src/lib/workout-readiness.ts` — engine puro com `calculateReadiness` (4 fatores objetivos + 4 subjetivos, scores ponderados, thresholds em `ReadinessConfig`), `getProgressionContext` (integração com Sprint 13), `calculateSessionOutcome`, `computeReadinessStats`
- [x] `ReadinessCheckIn` — componente de check-in pré-treino mobile-first com botões de rating (1–5), notas opcionais, "Avaliar prontidão" e "Pular check-in"
- [x] `ReadinessCard` — card de resultado (nível, headline, fatores positivos/negativos, ajustes sugeridos, "Editar check-in")
- [x] Página de sessão integrada: 3 fases (check-in → resultado → treino), check-in pular/editar, `readinessHint` contextual por exercício, outcome calculado no `WorkoutSummaryModal`
- [x] `ReadinessOverviewCard` — card no Dashboard com distribuição de prontidão dos últimos 7 dias
- [x] `ReadinessInsightsSection` — seção em Insights com médias subjetivas, barras de distribuição e insights determinísticos
- [x] Seção de prontidão no Perfil (total de check-ins, alta/baixa, energia/sono médios)
- [x] 39 testes novos (`workout-readiness.test.ts`) — 164/164 no total, 8 arquivos
- [x] XP, badges, PRs, Sprint 13, Sprint 11, navegação e histórico antigo intocados
- [x] Build, lint, typecheck e testes limpos

## Sprint 13 — Progressive Overload & Training Intelligence ✅
**Objetivo:** transformar o app em um verdadeiro companheiro de progressão — o usuário sai de cada sessão sabendo exatamente o que tentar na próxima, com que confiança, e por quê — tudo local e determinístico, sem IA. Ver `SPRINT-13.md` para o relatório completo.

- [x] Auditoria: `lib/progression.ts` tinha lógica de uma regra (allSetsHitTarget → +peso, senão +1 rep), sem análise multi-sessão, confiança ou detecção de padrões; `SessionExerciseCard` recebia `ProgressionSuggestion` com apenas `note` em texto plano
- [x] `src/lib/workout-intelligence.ts` — engine novo com `generateRecommendation` (5 tipos × 3 níveis de confiança), `getExerciseStatus`, `getAllExerciseIntelligence`, `getTopChallenges`, `getWeeklyIntelligenceSummary`; detectores puros de regressão, estagnação e melhoria com threshold configurável
- [x] `SessionExerciseCard` migrado de `ProgressionSuggestion` para `WorkoutRecommendation`; linha "Próxima meta" com ícone de confiança abaixo da "Última vez"
- [x] `ExerciseHistoryModal` enriquecido com bloco "Próxima sessão" (tipo, meta, razão) usando `generateRecommendation`
- [x] `NextChallengesCard` — novo card no Dashboard com até 5 exercícios e suas metas, ordenados por status (improving → stable → stagnant → regressing)
- [x] `TrainingIntelligenceSection` — nova seção nos Insights agrupando exercícios por status (evoluindo / estável / estagnado / em queda)
- [x] `IntelligenceStatsSection` — nova seção no Perfil: exercícios evoluindo, exercícios estagnados, PRs esta semana, variação de volume vs semana anterior
- [x] 30 testes novos (`workout-intelligence.test.ts`) — 125/125 no total, 7 arquivos
- [x] XP, badges, backup, navegação e histórico antigo intocados
- [x] Build, lint, typecheck e testes limpos

## Sprint 16 — Training Load Management & Weekly Planning Intelligence ✅
**Objetivo:** organizar a semana de treino — carga, distribuição por grupo muscular, aderência ao plano e prioridades. Ver `SPRINT-15.md`/memória de projeto para o relatório (commit `a8ad12e`).

- [x] `src/lib/training-load.ts` — motor semanal puro (`buildTrainingWeek`, `getWeekSummaries`, `getWeeklyAggregateStats`), volume atribuído apenas ao grupo muscular primário, detecção de concentração, comparação semana-a-semana, prioridades determinísticas
- [x] `src/lib/session-plan-changes.ts` — skip/restore manual de sessões planejadas
- [x] Componentes: `WeeklyTrainingCard` (Dashboard), `WeeklyLoadSection` (Insights), `WeeklyStatsSection` (Perfil), `WeeklyLoadOverview` (Plano)
- [x] 45 testes novos, 251/251 no total. XP/badges/PRs/readiness/ajustes intocados

## Sprint 17 — Training Cycles & Long-Term Progression (escopo reduzido) ✅
**Objetivo:** permitir que o usuário organize semanas isoladas em blocos de treino de várias semanas (ciclos/mesociclos), com criação, acompanhamento, encerramento e histórico — sem prescrever periodização automática. Ver `SPRINT-17.md` para o relatório completo, incluindo o que foi conscientemente deixado fora deste primeiro corte (revisão de meio de ciclo, comparação entre ciclos, tipos de semana, arquivamento).

- [x] Auditoria: nenhum conceito de ciclo/bloco/programa existia; `training-load.ts` (Sprint 16) é estritamente semanal; `getWeekStart` estava duplicado em `daily-missions.ts` (não consolidado nesta sprint, registrado como débito)
- [x] `src/lib/training-cycles.ts` — modelo persistente (`TrainingCycle`, storage `lrpg-fit:training-cycles`), CRUD com invariante de "um único ciclo ativo", `completeCycle`, `importCycles`
- [x] `src/lib/training-cycle-summary.ts` — motor puro de análise (`buildCycleSummary`): reaproveita `training-load.ts`/`exercise-records.ts`/`workout-readiness.ts` por recorte de data em vez de recalcular; volume semanal, aderência, PRs, prontidão média, evolução por exercício (`improving`/`stable`/`stagnant`/`regressing`), volume por grupo muscular, tendência (`increasing`/`stable`/`decreasing`/`mixed`/`insufficient_data`) ignorando a semana corrente incompleta
- [x] `training-load.ts` recebeu apenas `export` adicional em helpers já existentes (`sessionVolumeKg`, `sessionTotalSets`, `sessionTotalReps`, `getSessionPrimaryMuscleGroups`, `ALL_MUSCLE_GROUPS`) para reuso — nenhuma mudança de comportamento
- [x] Nova aba "📈 Ciclo" em `/plano` (sem rota nova): estado vazio, formulário de criação, card do ciclo ativo com métricas, encerrar ciclo (com observação opcional), histórico de ciclos concluídos expansível
- [x] `lrpg-fit:training-cycles` adicionado ao backup (`STORAGE_KEYS`/`ARRAY_KEYS`)
- [x] 28 testes novos (`training-cycles.test.ts`, `training-cycle-summary.test.ts`) + seed de round-trip em `backup.test.ts` — 279/279 no total
- [x] QA manual no dev server: criar ciclo → ativo com métricas zeradas → concluir com observação → aparece no histórico → expandir mostra resumo completo → refresh preserva estado; console limpo; sem overflow horizontal em mobile (375px)
- [x] **Escopo conscientemente reduzido** (confirmado com o usuário antes de implementar): revisão de meio de ciclo, comparação entre dois ciclos, classificação manual de tipo de semana (recuperação/teste/transição), arquivamento/restauração e integração em Insights/Perfil/Histórico dedicado ficaram fora deste corte — tracked para uma sprint 17.1 futura
- [x] Build, lint, typecheck e testes limpos; XP, badges, PRs, prontidão, ajustes de sessão, plano semanal e navegação principal intocados

## Sprint 17.1 — Cycle Reviews, Comparisons & Lifecycle Management ✅
**Objetivo:** completar o ciclo de vida do sistema de ciclos da Sprint 17 — revisões subjetivas, classificação de semana, comparação entre ciclos e arquivamento — sem reescrever o núcleo. Ver `SPRINT-17.1.md` para o relatório completo.

- [x] Auditoria confirmando que nenhuma métrica é persistida (tudo derivado de `training-cycle-summary.ts`) e que `getCompletedCycles()` já isola `'archived'` sem filtro extra
- [x] `src/lib/training-cycle-reviews.ts` + `training-cycle-review-analytics.ts` — revisão de meio de ciclo/final/manual (escalas 1–5: progresso, recuperação, satisfação), médias e variação, sem inferir causalidade
- [x] `src/lib/training-cycle-weeks.ts` + `training-cycle-week-summary.ts` — classificação manual de semana (`normal`/`recovery`/`test`/`transition`), narrativa que explica quedas de volume coincidentes com semanas especiais em vez de tratá-las como regressão
- [x] `src/lib/training-cycle-comparison.ts` — comparação pura entre dois ciclos concluídos (métricas, exercícios e grupos musculares compartilhados/exclusivos, mensagens narrativas limitadas), nunca declara "vencedor"; amostra mínima de 4 sessões para considerar um ciclo comparável com confiança
- [x] Arquivamento/restauração (`archiveCycle`/`restoreCycle`/`getArchivedCycles`) — ciclo ativo precisa ser encerrado antes de arquivar; restaurar nunca reativa. Exclusão permanente **não implementada de propósito** (nenhum outro domínio do app tem essa funcionalidade)
- [x] Componentes novos: `CycleReviewForm`, `CycleReviewPrompt`, `CycleWeeksSection`, `CycleComparisonSection`, `CycleHistorySection` (`/plano`); `CurrentCycleCard` (Dashboard); `CycleEvolutionSection` (Insights, reaproveita a comparação); `CycleStatsSection` (Perfil)
- [x] `lrpg-fit:cycle-reviews` e `lrpg-fit:cycle-week-annotations` no backup, com teste de compatibilidade com backups da Sprint 17 (sem os campos novos)
- [x] Bug de QA corrigido: `buildCycleWeekBreakdown` incluía sessões após o encerramento do ciclo quando este terminava no meio de uma semana de calendário — corrigido com corte em `min(weekEnd, endDate)`, teste de regressão adicionado
- [x] 357/357 testes (106 novos desde a Sprint 17); build, lint e typecheck limpos
- [x] QA funcional completo via Browser pane (criar → revisar meio de ciclo → classificar semana → concluir → revisão final → arquivar → restaurar → comparar com dados insuficientes) + screenshots desktop/mobile via Playwright em `docs/screenshots/sprint17-1/`
- [x] Nenhuma rota nova; XP, badges, PRs, prontidão, ajustes de sessão e carga semanal intocados

## Sprint 18 — Goals, Milestones & Progress Forecasting (escopo reduzido) ✅
**Objetivo:** transformar evolução histórica em objetivos pessoais explícitos — "Qual é meu próximo objetivo e quão perto estou dele?" — sem prometer resultados, sem IA, tudo local e determinístico. Ver `SPRINT-18.md` para o relatório completo, incluindo o que foi conscientemente deixado fora deste primeiro corte.

- [x] Auditoria: nenhuma meta quantitativa existia — `TrainingCycle.goal` é só rótulo de categoria; `Campaign` (`campaigns.ts`) já cobre metas de contagem fixa **com XP**, mantido como sistema separado e sem alteração
- [x] `src/lib/training-goals.ts` — modelo persistente (`TrainingGoal`, storage `lrpg-fit:training-goals`), 5 tipos neste corte (`exercise_weight`/`exercise_reps`/`estimated_1rm`/`weekly_sessions`/`consistency`), CRUD completo (criar/editar/pausar/retomar/concluir/reabrir/arquivar/restaurar/importar), conclusão sempre manual
- [x] `src/lib/training-goal-milestones.ts` — registro histórico de marcos (25/50/75/100%) por meta, idempotente, nunca removido se o valor cair depois (ex.: deload)
- [x] `src/lib/training-goal-progress.ts` — motor puro de progresso: baseline explícito ou inferido (histórico anterior ao início, ou primeiro registro após), progresso por tipo, status (`not_started`/`in_progress`/`on_track`/`behind`/`completed`/`paused`/`insufficient_data`), projeção linear com faixa de semanas (nunca uma data), confiança (`low`/`medium`/`high`) sempre com amostra e método explícitos
- [x] Reaproveita `exercise-records.ts` (`calculateEstimated1RM`, Epley), `workout-history.ts`, `weekly-plan.ts`/`training-load.ts` (`getWeekStart`/`getWeekEnd`) — nenhuma fórmula duplicada
- [x] Nova aba "🎯 Metas" em `/plano` (sem rota nova, visualmente distinta de Campanhas): estado vazio, formulário progressivo por tipo (reaproveita `ExercisePickerModal`), grupos Ativas/Pausadas/Concluídas/Arquivadas
- [x] `ActiveGoalsCard` — novo card no Dashboard com até 3 metas ativas e progresso resumido
- [x] `lrpg-fit:training-goals` e `lrpg-fit:goal-milestones` adicionados ao backup (`STORAGE_KEYS`/`ARRAY_KEYS`), com teste de compatibilidade com backups anteriores à Sprint 18
- [x] 56 testes novos (`training-goals.test.ts` 28, `training-goal-milestones.test.ts` 8, `training-goal-progress.test.ts` 17, +3 em `backup.test.ts`) — 413/413 no total
- [x] QA manual no dev server: criar meta de carga → progresso 0% (baseline = primeiro registro) → nova sessão → progresso recalculado e marcos 25%/50% registrados → card do Dashboard refletindo o mesmo estado; console limpo; screenshots desktop/mobile em `docs/screenshots/sprint18/`
- [x] **Escopo conscientemente reduzido** (confirmado com o usuário antes de implementar): metas de volume semanal, conclusão de ciclo, recorde pessoal e customizada; vínculo com ciclos; integração em Planner/`SessionExerciseCard`/resumo de sessão/Insights/Perfil; transferência entre ciclos — ficaram fora deste corte, tracked para uma sprint 18.1 futura
- [x] Build, lint, typecheck e testes limpos; XP, badges, PRs, prontidão, ajustes de sessão, ciclos, campanhas e navegação principal intocados

---

## Sprint 19 — Body Progress, Measurements & Wellness Trends (parte 1) ✅
**Objetivo:** camada opcional e privada de progresso corporal (peso/medidas) e tendências de bem-estar, respondendo "como meu corpo e bem-estar mudam ao longo do tempo?" sem diagnosticar, classificar corpos ou prometer resultado. Ver `SPRINT-19-v2.md` para o relatório completo, incluindo o que foi conscientemente deixado fora deste primeiro corte.

- [x] Auditoria: nenhum campo de peso corporal existia; sem IndexedDB no projeto; padrão de domínio é módulo funcional (`src/lib/<domínio>.ts`) + `localStorage`, não Zustand store; `readiness-check-ins.ts` já cobria energia/dor/sono/motivação
- [x] **Decisão**: bem-estar estende o `WorkoutReadinessCheckIn` existente (`stress`/`mood`/`sleepHours` opcionais) em vez de criar um domínio "wellness" paralelo — evita duplicar check-in diário
- [x] **Decisão**: fotos de progresso adiadas para uma sub-sprint 19.1 (exigem IndexedDB, inexistente no projeto, e uma estratégia de backup para blobs que o `backup.ts` atual não suporta)
- [x] `src/lib/body-progress.ts` — modelo persistente (`BodyProgressEntry`/`BodyMeasurements`, storage `lrpg-fit:body-progress`), CRUD completo (criar/editar/excluir/importar), todos os campos opcionais
- [x] `src/lib/trend-math.ts` — motor compartilhado de classificação de tendência (regressão linear simples + detecção de irregularidade por inversão de direção), reaproveitado por peso, medidas e bem-estar
- [x] `src/lib/body-progress-trends.ts` — tendência de peso/medidas, comparação de dois períodos (30/90 dias) sem declarar "vencedor"
- [x] `src/lib/wellness-trends.ts` — médias/tendências de bem-estar + associações com treino (sono×energia, estresse×frequência semanal), sempre com amostra mínima e linguagem de associação ("no seu histórico", "coincidiram"), nunca causal ("causou", "porque")
- [x] `lrpg-fit:body-progress` adicionado ao backup (`STORAGE_KEYS`/`ARRAY_KEYS`), com teste de compatibilidade com backups anteriores à Sprint 19
- [x] `BodyProgressForm`/`BodyProgressSection` (Perfil, com histórico/editar/excluir e confirmação de exclusão), `BodyProgressCard` (Dashboard), `BodyWellnessSection`/`BodyPeriodComparisonCard` (Insights, gráfico de peso via Recharts + tendência de medidas + associações)
- [x] `ReadinessCheckIn` ganhou seção opcional de bem-estar (estresse/humor) recolhida por padrão
- [x] 50 testes novos (`body-progress.test.ts` 19, `trend-math.test.ts` 7, `body-progress-trends.test.ts` 8, `wellness-trends.test.ts` 7, `readiness-check-ins.test.ts` 6, +3 em `backup.test.ts`) — 511/511 no total, sem regressão
- [x] QA manual no dev server: criar registro com peso+medida → aparece em Dashboard/Perfil/Insights → editar prefil correto → excluir com confirmação → estado vazio retorna corretamente; console limpo (à exceção de um warning de hidratação pré-existente em `WeeklyStatsSection.tsx`, não tocado nesta sprint); mobile verificado
- [x] **Escopo conscientemente reduzido**: fotos de progresso/IndexedDB/privacidade de fotos (Sprint 19.1); comparação por ciclo atual/anterior (só 30/90 dias implementados); exportação CSV/Markdown; novos tipos de meta de peso/medida em `training-goals.ts` — vínculo com meta é só por `cycleId`/data
- [x] Build, lint, typecheck e testes limpos; XP, badges, PRs, ciclos, campanhas, metas e navegação principal intocados

---

## Sprint 19 — Private Progress Photos, IndexedDB & Local Data Safety (parte 2) ✅
**Objetivo:** infraestrutura local (IndexedDB) para fotos privadas de progresso, vinculadas a registros corporais, sem nenhum envio a servidor ou análise automática. Ver `SPRINT-19-PART2.md` para o relatório completo.

- [x] Auditoria confirmada: zero uso de IndexedDB no projeto; `backup.ts` era JSON-only; decisões confirmadas com o usuário antes de implementar (escopo reduzido, ownership de foto, Canvas API nativa, `fake-indexeddb` para testes)
- [x] **Decisão**: foto pertence a exatamente um registro corporal (Opção A) — sem contagem de referências nem reuso entre registros
- [x] **Decisão**: compressão/redimensionamento via Canvas API nativa (`toBlob()`), sem dependência de imagem nova; PNG só é preservado se o input já era PNG, resto normaliza para JPEG
- [x] `src/lib/body-progress-photo.ts` — modelo (`BodyProgressPhoto`/`BodyProgressPhotoRecord`/`BodyPhotoConfig`/`BodyPhotoValidationError`) + `photoIds?: string[]` opcional em `BodyProgressEntry`
- [x] `src/lib/body-progress-photo-db.ts` — wrapper IndexedDB (`lrpg-fit-photos` v1, store `photos`, índices `by-entryId`/`by-takenAt`/`by-category`), nunca lança, trata quota excedida e IndexedDB indisponível
- [x] `src/lib/body-progress-photo-validation.ts` + `body-progress-photo-processing.ts` — validação de arquivo e decodificação/redimensionamento/thumbnail via canvas
- [x] `src/lib/body-progress-photo-link.ts` — vínculo com `BodyProgressEntry`, referências quebradas tratadas como `metadata: null` (nunca lança), exclusão em cascata opcional
- [x] UI: seção de upload no `BodyProgressForm` (modo edição), aviso de privacidade único (`PhotoPrivacyNotice`), galeria por registro, modal de detalhe (editar categoria/excluir), modal de comparação lado a lado (2 colunas desktop / empilhado mobile) com seletor de datas
- [x] Reset granular (`PhotoResetSection`, apenas fotos) + `resetAllData()` agora assíncrono, também limpa fotos
- [x] Backup: `BackupPayload.media.bodyPhotosIncluded` sempre `false` (só a contagem é exportada); `exportBackup`/`downloadBackup` assíncronos; aviso de privacidade na seção de exportação
- [x] 53 testes novos (`body-progress-photo-db.test.ts` 18, `body-progress-photo-validation.test.ts` 10, `body-progress-photo-processing.test.ts` 10, `body-progress-photo-link.test.ts` 11, +4 em `body-progress.test.ts`) — 564/564 no total, sem regressão
- [x] QA visual (desktop 1280px + mobile 375px) via Playwright/msedge: estado vazio, aviso de privacidade, upload, registro com foto, galeria no histórico, modal de detalhe, confirmação de exclusão, comparação — screenshots em `docs/screenshots/sprint19-part2/`
- [x] **Bug real encontrado e corrigido durante QA**: cancelar a edição de um registro não recarregava a lista, então fotos adicionadas (que persistem direto no IndexedDB/localStorage, independente do botão "Salvar") não apareciam até um reload manual — corrigido em `BodyProgressSection.handleCancelEdit`
- [x] **Escopo conscientemente reduzido**: exportação/importação ZIP completa e UI de "espaço usado em MB" adiadas para Sprint 19.3
- [x] Build, lint, typecheck e testes limpos; nenhuma imagem enviada, analisada ou incluída em `localStorage`/backup JSON; body-progress/backup/reset da Parte 1 continuam funcionando sem alteração

---

## Sprint 19 — Wellness Associations in Training Cycles (parte 3B) ✅
**Objetivo:** consolidar bem-estar por ciclo de treino (médias, cobertura, tendência interna, associações restritas ao intervalo do ciclo) e integrar ao resumo de ciclo, revisão e comparação — sem tocar Dashboard/Insights/Perfil. Ver `SPRINT-19-PART3B.md` para o relatório completo.

- [x] Auditoria confirmada: `WorkoutReadinessCheckIn` é a única fonte de bem-estar; `wellness-associations.ts` já nunca compara bem-estar contra prontidão (só contra frequência/volume/ajustes), então não havia associação circular a filtrar; ciclos arquivados preservam `completedAt`
- [x] `src/lib/training-cycle-wellness.ts` — `getCycleDateRange`/`filterCheckInsForCycle`, `buildCycleWellnessSummary` (médias sem tratar campo ausente como zero, cobertura, tendência por metade do ciclo com direção `irregular` via coeficiente de variação, seleção de até 3 associações) e `compareCycleWellness` (nunca declara vencedor, sinaliza amostra insuficiente por lado e diferença de duração)
- [x] **Decisão**: semanas parciais na borda do ciclo são resolvidas construindo os agregados semanais só a partir de sessões já filtradas pelo intervalo do ciclo, em vez de um adaptador de corte de semana separado
- [x] **Decisão**: `averageReadiness` do resumo de bem-estar reaproveita `buildCycleSummary` em vez de duplicar a fórmula de prontidão
- [x] UI: `CycleWellnessSection.tsx` (novo, card "Bem-estar durante o ciclo" com expansão "Ver detalhes"), integrado em `CycleSection.tsx` (ciclo ativo) e `CycleHistorySection.tsx` (histórico); bloco somente leitura "Contexto do ciclo" em `CycleReviewForm.tsx` (não preenche respostas, não é persistido); seção "Bem-estar" adicionada a `CycleComparisonSection.tsx`
- [x] 29 testes novos (`training-cycle-wellness.test.ts`) — 603/603 no total, sem regressão
- [x] QA manual no dev server: estado vazio do bloco de bem-estar, seção de bem-estar na comparação de ciclos, contexto de revisão corretamente ausente quando não há check-ins
- [x] **Escopo conscientemente reduzido**: screenshots formais desktop/mobile e auditoria de acessibilidade dedicada adiadas por falta de dados de bem-estar reais no ambiente de QA (cobertos pelos 29 testes automatizados com dados sintéticos)
- [x] Build, lint, typecheck e testes limpos; Dashboard, Insights, Perfil, XP, badges e lógica de prontidão intocados

---

## Feature Freeze (vigente até a Sprint 6 aceita)

**Importante:** as features abaixo **já estão implementadas e permanecem no app** — o freeze significa que não recebem expansão funcional nem features novas durante o redesign, apenas ajustes mínimos de compatibilidade visual/estrutural:

- Plano semanal e Campanhas (`/plano`)
- Onboarding / Personalização local (`OnboardingModal`, `/preferencias`)
- PWA / Offline (manifest, service worker)
- Workout Builder (treinos e exercícios customizados, em `/treinos`)
- Recompensas, badges e backup

Nenhuma feature **nova** entra em código antes da Sprint 6 ser aceita. Redesign não implica remoção funcional. Qualquer expansão futura deve virar sua própria sequência de sprints pequenas — não uma sprint única "ampla" (erro recorrente na v1).
