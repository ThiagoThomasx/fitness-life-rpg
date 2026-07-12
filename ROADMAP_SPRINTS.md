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

---

## Feature Freeze (vigente até a Sprint 6 aceita)

**Importante:** as features abaixo **já estão implementadas e permanecem no app** — o freeze significa que não recebem expansão funcional nem features novas durante o redesign, apenas ajustes mínimos de compatibilidade visual/estrutural:

- Plano semanal e Campanhas (`/plano`)
- Onboarding / Personalização local (`OnboardingModal`, `/preferencias`)
- PWA / Offline (manifest, service worker)
- Workout Builder (treinos e exercícios customizados, em `/treinos`)
- Recompensas, badges e backup

Nenhuma feature **nova** entra em código antes da Sprint 6 ser aceita. Redesign não implica remoção funcional. Qualquer expansão futura deve virar sua própria sequência de sprints pequenas — não uma sprint única "ampla" (erro recorrente na v1).
