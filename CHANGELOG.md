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
