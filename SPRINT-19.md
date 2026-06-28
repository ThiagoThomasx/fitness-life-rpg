# Sprint 19 — Redesign Visual de Insights e Dashboard

## Objetivo

Elevar a qualidade visual das páginas `/insights` e `/dashboard` para o mesmo nível da Sprint 18 (Perfil e Treinos), aplicando a linguagem Spotify-inspired consistentemente em todo o app.

## O que foi feito

### `/insights` — Redesign completo

- **Header premium com gradiente** — bloco verde com radial gradient, pills de "Esta semana / XP Total / Objetivo"
- **MetricCard** — componente de card com topo colorido (accent bar), ícone com tint, número grande, label uppercase. Substitui os StatBox genéricos.
- **SummarySection** — grade 2×2 de MetricCards com cores semânticas (verde/dourado/roxo/azul)
- **NarrativeSection** — seção "Leitura da semana" gerada com dados reais; cta de onboarding se não houver dados suficientes
- **ChartHeader** — componente com título forte e descrição por gráfico
- **EmptyChart** — empty state premium com ícone em card, título, descrição e CTA opicional
- **Gráficos integrados** — todos em containers premium com bordas e superfícies distintas; `vertical={false}` no CartesianGrid para limpeza visual
- **Empty state global** — quando não há nenhum dado, exibe bloco hero com rocket, título e CTA para iniciar primeiro treino
- **Layout desktop** — grid `auto-fit minmax(280px, 1fr)` para charts em duas colunas em telas maiores
- **Gradiente nas barras de tag** — `linear-gradient(90deg, accent, blue)` para os progress bars de tags

### `/dashboard` — Redesign completo

- **HeroSection** — bloco principal com gradiente verde, nome grande, nível em pill roxo, barra XP com gradiente, atributos em cards mini, caleidoscópio semanal com pills de dias
- **QuickActions** — fila horizontal scrollável de 5 ações (Treinar / Diário / Insights / Nutrição / Plano) com ícone e cor semântica por ação
- **ProgressCards** — grade 2×2 de cards com accent bar no topo, ícone, número grande e label uppercase
- **MissionCard** — novo visual com background surface-2, borda sutil, botão de completar como pill verde
- **WeeklyPlanWidget** — badge de % no canto, barras de progresso por categoria
- **DiaryTodayCard / NutritionTodayCard** — track rows com radius 14, integrados numa seção "Hoje"
- **NextMilestoneCard / RecentBadgesCard** — mantidos com novo container bg1/border
- **CTA buttons** — "Treinar agora" em verde sólido, "Abrir diário" em surface ghost
- **Greeting contextual** — Bom dia / Boa tarde / Boa noite baseado na hora

## Componentes novos reutilizáveis

| Componente | Descrição |
|---|---|
| `MetricCard` | Card de métrica com accent bar, ícone tintado, valor grande |
| `ChartHeader` | Cabeçalho de seção de gráfico com título + descrição |
| `EmptyChart` | Empty state premium com ícone em card e CTA opcional |
| `HeroSection` | Bloco de herói do Dashboard com gradiente e atributos |
| `QuickActions` | Fila horizontal scrollável de ações rápidas |
| `ProgressCards` | Grade de cards de progresso com accent bar |
| `NarrativeSection` | Seção de leitura/interpretação dos dados |

## Critérios de aceitação — ✅ todos atendidos

- [x] Insights tem header premium com gradiente
- [x] Insights tem summary cards visuais (MetricCard)
- [x] Insights tem gráficos integrados com containers premium
- [x] Insights tem seção de narrativa/leitura
- [x] Insights tem empty state premium (global + por gráfico)
- [x] Dashboard tem hero do usuário com gradiente
- [x] Dashboard tem ações rápidas scrolláveis
- [x] Dashboard tem cards de progresso com accent bar
- [x] Dashboard tem atividade recente em estilo track row
- [x] Tudo funciona mobile
- [x] Responsividade tablet/desktop com grid auto-fit
- [x] Nenhuma quebra de funcionalidade existente
- [x] Build sem erros de TypeScript/console

## Tokens visuais usados

Consistente com `src/styles/tokens.css`:

- `#121212` canvas base
- `#1a1a1a` / `#202020` / `#282828` superfícies
- `#1db954` accent (Spotify Green) — ação, progresso, destaque
- `#f59e0b` gold — XP, conquistas
- `#8b5cf6` purple — nível, itens especiais
- `rgba(255,255,255,0.06)` border sutil padrão
