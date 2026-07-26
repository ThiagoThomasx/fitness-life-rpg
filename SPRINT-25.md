# Sprint 25 — Analytics 2.0: Engines + Dashboard Analytics UI

**Objetivo:** motor de analytics agregado (Performance, Consistência, Balanceamento Muscular, Fadiga, Progresso, Insights) sobre dados já existentes, mais a UI que expõe tudo isso dentro da rota `/dashboard`. Sem novo domínio funcional, sem nova rota, sem lógica de negócio nova — só composição de motores já existentes e uma superfície de leitura em cima.

## Escopo executado (Partes 1-4)

- **Parte 1 — Fundação** (`d5a7da8`): `types.ts` (vocabulário compartilhado: `AnalyticsPeriod`, `DateRange`, `TrendDirection`, `MetricEvolution`, `AnalyticsInsight`) e `helpers.ts` (`resolvePeriodRange`, `filterByDateRange`, `comparePeriods`, `sampleConfidence`).
- **Parte 2 — Performance & Consistência** (`e830b7d`): `performance.ts` (5 métricas agregadas vs. período anterior, exercícios em maior evolução/estagnados) e `consistency.ts` (aderência, streaks, semanas perfeitas, melhor/pior mês).
- **Parte 3 — Balanceamento Muscular & Fadiga** (`b66db19`): `muscle-balance.ts` (distribuição por grupo, negligenciados/excessivos, push/pull e superior/inferior) e `fatigue.ts` (prontidão + recuperação + tendência de carga, 3 detectores de padrão).
- **Parte 4A — Progresso & Insights** (`1b23fbb`): `progress.ts` (resumo de período) e `insights.ts` (5 detectores observacionais), mais `dashboard.ts` (`buildDashboardAnalytics`, ponto de entrada único).
- **Parte 4B — UI + QA + Documentação** (este commit): seção "Analytics" dentro do Dashboard, QA manual real (dev server + browser), e os documentos listados abaixo.

Ver `ANALYTICS-ENGINE.md`, `PERFORMANCE-ANALYTICS.md`, `CONSISTENCY-ENGINE.md`, `MUSCLE-BALANCE.md`, `INSIGHTS-ENGINE.md` para o detalhe de cada motor.

## Arquivos de motor (`src/lib/analytics/`)

`types.ts`, `helpers.ts`, `performance.ts`, `consistency.ts`, `muscle-balance.ts`, `fatigue.ts`, `progress.ts`, `insights.ts`, `dashboard.ts` — 9 arquivos de motor + 9 arquivos de teste (`*.test.ts`) espelhando cada um.

## UI construída (Parte 4B)

Nova seção "Analytics" dentro da rota `/dashboard` existente (`src/app/(dashboard)/dashboard/page.tsx`) — **não** uma rota nova nem item de navegação novo (decisão de navegação travada no Sprint 1, CLAUDE.md regra 6). Componentes novos em `src/components/dashboard/analytics/`:

- `AnalyticsSection.tsx` — orquestrador: filtro de período (6 opções) + sub-navegação de 6 painéis (mesmo padrão `.filter-pill` já usado em `ExerciseChartsSection`), `useMemo` keyed em `period`, guard de hydration (`mounted`) porque `buildDashboardAnalytics` lê `localStorage`.
- `PerformancePanel.tsx` — evolução das 5 métricas + gráfico de barras de variação percentual (recharts) + maior evolução/exercícios estagnados.
- `ConsistencyPanel.tsx` — aderência, streaks, semanas perfeitas, melhor/pior mês em `.stat-cell`.
- `MuscleBalancePanel.tsx` — gráfico de barras de distribuição por grupo muscular + razões push/pull e superior/inferior como par de `.stat-cell` (não radar — ver decisão abaixo).
- `FatiguePanel.tsx` — prontidão, tendência de carga, recuperação por grupo muscular, padrões observacionais.
- `HighlightsPanel.tsx` — resumo de período (`ProgressReport`) + exercícios esquecidos + melhor mês.
- `InsightsPanel.tsx` — lista de `AnalyticsInsight` como cards observacionais com evidência.
- `analytics-ui.ts` — vocabulário de apresentação compartilhado (labels/badges/formatação), sem lógica de negócio.

Nenhuma store foi tocada; nenhum novo campo de `localStorage` foi introduzido — a UI só lê via `buildDashboardAnalytics`.

## Decisões de UI (CLAUDE.md judgment calls)

- **Seção, não rota nova**: a rota `/dashboard` já tinha o padrão de compor múltiplos cards de domínios diferentes numa página — Analytics entra como mais uma seção no final da página, seguindo o mesmo layout de `.card` + `.section-label`.
- **Sub-navegação com `.filter-pill`**: reaproveita o componente/classe já usado para o filtro de período de `ExerciseChartsSection`, aplicado a um segundo eixo (qual painel mostrar) em vez de introduzir um componente de tabs novo — evita duplicar CSS.
- **Gráficos só onde agregam valor real**: linha/barra de variação percentual (Performance) e barra de distribuição muscular (Músculos) — ambos mostram algo que não é óbvio de um número isolado. Nenhum gráfico foi adicionado para "Consistência"/"Recuperação"/"Insights"/"Destaques" — os dados desses painéis já são diretos o suficiente em `.stat-cell`/cards de texto; um gráfico ali seria decorativo.
- **Radar descartado**: push/pull e superior/inferior têm só 2 eixos cada — um radar de 2 pontos é visualmente vazio e menos honesto que duas `.stat-cell` lado a lado. Ver `MUSCLE-BALANCE.md`.
- **Sem score único**: nenhum número combinado tipo "saúde geral: 78/100" foi criado — cada indicador (`.stat-cell`) é independente, seguindo a proibição explícita da brief.
- **"Destaques" adaptado à spec real do motor**: o exemplo da brief menciona "maior queda" e "melhores semanas", mas os motores atuais não produzem essas métricas (só "maior evolução"/"estagnados" e "melhor/pior MÊS"). A UI usa o que os motores realmente retornam em vez de inventar um cálculo novo — documentado no cabeçalho de `HighlightsPanel.tsx`.
- **Sem testes de componente React**: mesma convenção já registrada nas Sprints 22-24 ("projeto nunca usou React Testing Library... só motor puro testado, UI verificada via QA manual no browser") — `RTL` não está instalado e os 9 motores puros já têm 100% de cobertura de teste; a UI foi verificada via QA manual real (ver abaixo) em vez de introduzir uma dependência de teste nova só para esta sprint.

## QA manual (dev server + browser real)

Servidor `npm run dev` (config `fitness-rpg` em `.claude/launch.json`), dados reais já seedados em `localStorage` de sprints anteriores (não sintéticos):

- **Todas as 6 sub-abas** (Destaques, Performance, Consistência, Músculos, Recuperação, Insights) renderizadas com dados reais e verificadas via inspeção de DOM/texto — conteúdo distinto e correto por aba, gráficos recharts renderizando (barras de variação e distribuição muscular).
- **Todos os 6 filtros de período** (7 dias, 30 dias, 90 dias, 6 meses, 1 ano, Tudo) clicados em sequência sem erro de console.
- **Estado vazio**: `localStorage` de todas as chaves `lrpg-fit:*` temporariamente limpo (com backup/restore automatizado via script), confirmando que todos os 6 painéis renderizam fallbacks corretos ("Sem dado suficiente ainda", "Nenhum exercício estagnado identificado", etc.) sem crash — dados reais restaurados ao final.
- **Bug real encontrado e corrigido**: `FatiguePanel` mostrava badge "Recuperado" (verde/accent) para grupos musculares nunca treinados (`hoursSinceTrained === null`), o que é enganoso — corrigido para mostrar "Sem histórico" nesse caso específico (mudança de apresentação, não de dado — `workout-recovery.ts` não foi tocado).
- **Screenshots reais** via Playwright+msedge (workaround documentado em memória de sessão desde Sprint 2 — screenshot do Browser pane trava neste ambiente): desktop (1280px) e mobile (390px), painel "Destaques" e painel "Músculos" (com gráfico), total 4 capturas. Confirmado: zero overflow horizontal em mobile, uso de chartreuse restrito a estado ativo dos filtros (nunca fundo de card grande), linguagem visual idêntica ao resto do Dashboard (cards escuros, `.stat-cell`, `.target-card`).
- **Zero erros de console** em toda a sessão de QA (desktop, mobile, estado vazio, todas as combinações de aba×período testadas).

## Testes

9 arquivos de teste novos cobrindo os 9 motores de `lib/analytics/*` (Partes 1-4A). Total após as Partes 1-4A: **1047 testes** (1046 passando + 1 falha pré-existente não relacionada — ver Gates). Nenhum teste de componente React novo (ver decisão acima).

## Gates

```
Lint:      aprovado (0 warnings/errors)
Typecheck: aprovado (0 erros)
Tests:     1046/1047 (1 falha pré-existente: program-instantiation.test.ts
           "next monday is always a Monday" — depende do dia real do
           sistema/relógio, não relacionada a esta sprint)
Build:     aprovado (21 rotas geradas, /dashboard 23.8kB / 275kB First Load JS)
```

## Commits

- Parte 1 — `feat: add analytics foundation (Sprint 25 part 1)` (`d5a7da8`)
- Parte 2 — `feat: add performance and consistency analytics (Sprint 25 part 2)` (`e830b7d`)
- Parte 3 — `feat: add muscle balance and fatigue analytics (Sprint 25 part 3)` (`b66db19`)
- Parte 4A — `feat: add progress report, insights and dashboard analytics engines (Sprint 25 part 4a)` (`1b23fbb`)
- Parte 4B — `feat: add analytics dashboard and insight engine (Sprint 25 part 4)` (este commit)

Nenhum commit enviado ao remoto (`origin/master` segue parado desde a Sprint 20 Parte 1).

## Pendências conscientes

- Exercícios em maior evolução/estagnados (`getTopEvolvingExercises`/`getStagnantExercisesInPeriod`) ignoram o parâmetro `period` — limitação já documentada em `exercise-records.ts` desde antes desta sprint, não resolvida aqui (exigiria adicionar suporte a `DateRange` naquele módulo, fora de escopo).
- Sem "maior queda" nem "melhores semanas" como métricas próprias — os motores atuais não as produzem; a UI usa "estagnados" e "melhor/pior mês" como aproximação honesta (ver decisão acima).
- Sem testes de componente React (convenção mantida do projeto, ver decisão acima) — cobertura de UI é só QA manual.
- Screenshot automatizado cobre 2 dos 6 painéis (Destaques, Músculos) em cada breakpoint — os outros 4 foram verificados via inspeção de DOM/texto real (não só leitura de código), mas não via captura de imagem.

## Próximo passo recomendado

Analytics 2.0 está completo (motor + UI + QA real) e fecha o Sprint 25. Recomendação: revisar o roadmap de features pós-freeze (Coach Mode, Plano/Campanhas expandido, PWA) como próxima sequência de sprints pequenas, já que o redesign visual + as camadas de confiabilidade/analytics dos Sprints 20-25 cobrem a base do produto.
