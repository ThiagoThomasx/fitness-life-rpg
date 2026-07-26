# Analytics Engine — `src/lib/analytics/`

Visão geral do módulo de Analytics construído na Sprint 25 (Partes 1-4A) e consumido pela UI de Dashboard Analytics (Parte 4B). Este documento cobre arquitetura e mecanismo de período; cada motor tem seu próprio documento dedicado (`PERFORMANCE-ANALYTICS.md`, `CONSISTENCY-ENGINE.md`, `MUSCLE-BALANCE.md`, `INSIGHTS-ENGINE.md`).

## Princípio: "compor, nunca recalcular"

Nenhum motor de Analytics reimplementa matemática que já existe em outro lugar do app. Cada função de `lib/analytics/*` chama módulos `lib/*` já existentes (`workout-history.ts`, `training-load.ts`, `exercise-records.ts`, `exercise-intelligence.ts`, `program-progress.ts`, `workout-readiness.ts`, `workout-recovery.ts`, `personal-record-events.ts`) e só adiciona a lógica de agregação por período que faltava. Isso segue o mesmo padrão já documentado em `workout-detail-engine.ts` (Sprint 22): uma camada de composição pura, sem escrever em `localStorage`, sem duplicar regra de negócio (CLAUDE.md regra 2 — não tocar em lógica de negócio).

`buildDashboardAnalytics` (`dashboard.ts`) é o único ponto de entrada que a UI (Parte 4B) chama — compõe todos os motores das Partes 1-4A numa única chamada, cada um exatamente uma vez.

## Módulos

| Arquivo | Propósito |
|---|---|
| `types.ts` | Vocabulário compartilhado: `AnalyticsPeriod`, `DateRange`, `TrendDirection`, `MetricEvolution`, `AnalyticsInsight`. Só shapes, nenhuma lógica. |
| `helpers.ts` | Funções puras de base: `resolvePeriodRange` (período → `DateRange`), `filterByDateRange`, `comparePeriods` (variação % com tolerância de estabilidade), `sampleConfidence`. |
| `performance.ts` | Evolução agregada de carga/volume/1RM/repetições/frequência vs. período anterior; exercícios em maior evolução/estagnados (ver `PERFORMANCE-ANALYTICS.md`). |
| `consistency.ts` | Aderência ao plano, streaks, semanas perfeitas, melhor/pior mês (ver `CONSISTENCY-ENGINE.md`). |
| `muscle-balance.ts` | Distribuição de séries/volume por grupo muscular, grupos negligenciados/excessivos, razões push/pull e superior/inferior (ver `MUSCLE-BALANCE.md`). |
| `fatigue.ts` | Cruza prontidão subjetiva, recuperação por grupo muscular e tendência de carga em padrões observacionais. |
| `progress.ts` | Resumo de período ("Últimos 30 dias / Treinos: N / Consistência: X% / ...") — composição pura dos motores acima + contagem de recordes no período. |
| `insights.ts` | 5 detectores determinísticos de insight observacional (ver `INSIGHTS-ENGINE.md`). |
| `dashboard.ts` | `buildDashboardAnalytics(period, now?)` — ponto de entrada único, monta `DashboardAnalytics` a partir de todos os motores acima. |

## `AnalyticsPeriod` e filtro de período

```ts
type AnalyticsPeriod = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
```

União fechada com as 6 opções exigidas pela sprint (7 dias, 30 dias, 90 dias, 6 meses, 1 ano, Tudo) — não um enum livre, para impedir um sétimo valor surgir por engano em algum motor e não ser tratado em outro.

`resolvePeriodRange(period, now)` (`helpers.ts`) converte isso num `DateRange` concreto (`{ start, end }`) terminando em `now`. `'all'` usa a época Unix como início — o módulo não tem acesso à data da primeira sessão real do usuário nesse nível, e não é necessário: `filterByDateRange` já inclui tudo a partir de `start: new Date(0)`.

A maioria dos motores compara a janela atual com a janela imediatamente anterior de duração igual (`previousRange` em `performance.ts`) — para `'all'` não existe uma janela "anterior a tudo", então os motores retornam `insufficient_data` explicitamente nesse caso em vez de fabricar uma comparação arbitrária.

## `DateRange` e filtro genérico

`filterByDateRange<T>(items, range, getDate)` (`helpers.ts`) é o único filtro de intervalo de datas usado em todo o módulo — inclusivo nas duas pontas, aceita `getDate` como um extrator (string ISO ou `Date`) para funcionar com qualquer shape de histórico (`CompletedWorkout`, `WorkoutReadinessCheckIn`, `PersonalRecordEvent`, etc.) sem duplicar a lógica de comparação de timestamp em cada motor.

## Mecanismo de comparação percentual

`comparePeriods(current, previous)` (`helpers.ts`) é a única fonte de verdade para "que direção e que percentual" ao comparar dois números — usada por todos os motores que fazem comparação de período. Trata divisão por zero explicitamente (nunca `Infinity`/`NaN`) e aplica uma tolerância de estabilidade de ±5% (`STABILITY_TOLERANCE_PERCENT`) — a mesma constante que `exercise-intelligence.ts` já usa para não classificar ruído como tendência real.

## Não há cache/memoização interna

Nenhum motor (incluindo `buildDashboardAnalytics`) memoiza resultado internamente — são funções puras "burras" de propósito. Memoização real (`useMemo` chaveado por `period`) é responsabilidade da camada React que consome o módulo — ver `AnalyticsSection.tsx` (Parte 4B). Ver cabeçalho de `dashboard.ts` para o raciocínio completo (memoizar uma função pura por `now: Date` na prática nunca bate cache).
