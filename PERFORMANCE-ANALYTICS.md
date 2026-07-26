# Performance Analytics — `src/lib/analytics/performance.ts`

Motor de evolução agregada de desempenho (Sprint 25 Parte 2). Ver `ANALYTICS-ENGINE.md` para o princípio geral do módulo.

## As 5 métricas

`computePerformanceEvolution(period, now?)` retorna um `MetricEvolution[]` (uma entrada por métrica) comparando a janela atual do período com a janela imediatamente anterior de duração igual:

| Métrica (`PerformanceMetricKey`) | Agregação | Por quê |
|---|---|---|
| `load` | Média, entre as sessões do período, da MAIOR carga (kg) de qualquer série da sessão ("top set"). Sessões sem nenhuma série com peso > 0 são ignoradas. | Incluir 0 puxaria a média para baixo sem sinal real de carga (ex.: sessão só de peso corporal). |
| `volume` | SOMA de `sessionVolumeKg` (`training-load.ts`) no período. | Volume é cumulativo por natureza — mesma convenção de `getWeekSummaries`. |
| `1rm` | Média do `estimated1RMKg` já persistido em `ExerciseRecord` (não recalculado). Registros sem 1RM são ignorados. | Reaproveita o valor já calculado no histórico em vez de reimplementar a fórmula de 1RM. |
| `reps` | `sessionTotalReps` somado / `sessionTotalSets` somado no período (média de reps por SÉRIE, não por sessão). | Sessões de tamanhos muito diferentes não distorcem a média. |
| `frequency` | Contagem de sessões (treinos concluídos) no período. | Soma simples, igual a `volume`. |

## Formato de explicação textual

Todo `MetricEvolution.explanation` segue o formato literal exigido pela spec: **"A média dos últimos N dias foi X% maior/menor que os N dias anteriores."** — nunca só uma seta ou ícone (`formatEvolutionExplanation`). Casos especiais tratados explicitamente:

- Amostra insuficiente (`sampleConfidence === 'insufficient'`) → "Dados insuficientes nos últimos N dias para calcular esta métrica."
- Período anterior com atividade zero mas período atual com atividade → "Sem atividade no período de N dias anterior para calcular uma variação percentual — houve atividade no período atual." (direção é clara, mas não há base percentual válida).
- `direction === 'stable'` → menciona a variação real (dentro de ±5%) em vez de esconder o número.
- Período `'all'` → todas as 5 métricas retornam `insufficient_data` com explicação própria (`buildInsufficientEvolution`) — não existe "período anterior a tudo" para comparar.

## `stability`

`MetricEvolution.stability` (`'stable' | 'volatile' | 'unknown'`) é um proxy grosseiro derivado da própria comparação de período — não uma classificação estatística real de variância ponto a ponto (isso já existe por exercício individual em `exercise-intelligence.ts`, fora do escopo deste rollup agregado). `'unknown'` quando a amostra é insuficiente; `'stable'` quando a comparação já caiu dentro da tolerância; `'volatile'` caso contrário.

## Exercícios em maior evolução / estagnados

`getTopEvolvingExercises`/`getStagnantExercisesInPeriod` delegam inteiramente para `getTopGrowthExercises`/`getStagnantExercises` (`exercise-records.ts`), que **não aceitam parâmetro de período** — operam sempre sobre `getWorkoutHistory()` completo. `period` é aceito na assinatura só por consistência de API com o resto do motor; o resultado reflete sempre o histórico completo até que `exercise-records.ts` ganhe suporte nativo a `DateRange`. Isso é uma limitação conhecida e documentada no código-fonte, não um bug — duplicar a lógica de earliest-vs-latest por exercício aqui criaria uma segunda fonte de verdade que poderia divergir da usada em Perfil/Insights.
