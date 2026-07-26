# Health Data — Baselines (Sprint 28 Parte 3)

## Objetivo

Calcular uma linha de base (média, mediana, desvio padrão) por métrica, a
partir dos resumos diários já agregados de um período. Ver
`src/lib/health-data/baseline.ts`.

## Nunca gerar baseline com amostra insuficiente

`computeMetricBaseline` retorna `null` quando o número de dias com valor
válido está abaixo do mínimo exigido pela métrica. Nunca um baseline de
baixa confiança silencioso — a UI mostra explicitamente "amostra
insuficiente" nesse caso, com o mínimo exigido.

## Mínimos por métrica

| Métrica | Mínimo (dias) | Justificativa |
|---|---|---|
| `sleep_duration` | 7 | Sono varia por dia da semana (fins de semana vs. dias úteis) — menos de uma semana não captura esse padrão. |
| `resting_heart_rate` | 7 | Mesmo raciocínio: variação semanal (estresse de trabalho, treino, descanso). |
| `steps` | 7 | Mesmo raciocínio: rotina difere por dia da semana. |
| `weight` | 5 | Peso muda devagar — 5 dias já é representativo, não precisa de uma semana cheia. |
| Demais (`sleep_quality`, `active_calories`, `activity_duration`, `distance`, `wellness_*`) | 5 | Piso de peso usado como padrão, na ausência de um limiar específico definido pelo produto para essas métricas. |

## Cálculo

A partir dos valores de dias com dado válido dentro do período (extraídos
via `summaryMetricValue`, `aggregation-shared.ts`):

- `value` — média (`stats.ts#mean`)
- `median` — mediana (`stats.ts#median`)
- `standardDeviation` — desvio padrão populacional (`stats.ts#standardDeviation`)
- `sampleSize` — número de dias com valor válido (não o número de dias do
  período — dias sem dado não contam)

## Qualidade do baseline

Não reutiliza `sampleConfidence` de `analytics/helpers.ts` — aqueles
limiares (0/1-2/3-5/6+) são calibrados para contagem de **sessões de
treino**, uma escala incompatível com os 7–365 dias relevantes aqui (quase
todo baseline teria amostra "high" mesmo apenas no mínimo exigido). Em vez
disso:

```text
sampleSize >= minSamples × 2  → high
caso contrário                → medium
```

Uma amostra apenas no mínimo exigido é `medium`; o dobro do mínimo (mais uma
janela extra de dados) já é `high`. Nunca `low`, porque abaixo do mínimo o
baseline nem é gerado (retorna `null`).

## Reuso

Baseline opera sobre `DailyHealthSummary[]`, não sobre `HealthDataRecord[]`
diretamente — reaproveita a mesma agregação usada por conflitos e qualidade,
em vez de reimplementar a escolha de fonte/intervalo. `getMetricBaseline`
(`analytics-queries.ts`) é o ponto de entrada esperado pela UI e por
consumidores futuros.
