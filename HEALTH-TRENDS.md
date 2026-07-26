# Health Data — Tendências (Sprint 28 Parte 3)

## Objetivo

Classificar a direção recente de uma métrica de saúde (crescente, estável,
decrescente, irregular ou dado insuficiente) a partir dos resumos diários de
um período. Ver `src/lib/health-data/trends.ts`.

## Reaproveitamento do motor existente

Não foi criado um novo classificador de tendência. `computeMetricTrend`
extrai a série `{ date, value }` de `DailyHealthSummary[]` (via
`summaryMetricValue`) e delega a classificação a `classifyTrend`
(`src/lib/trend-math.ts`, Sprint 19) — o mesmo motor já usado por Body
Progress (peso, medidas) e Wellness. Health Data é o terceiro domínio a
reaproveitar esse motor, não um quarto classificador paralelo.

`classifyTrend` usa regressão linear simples sobre uma janela recente (5
pontos por padrão), com detecção de irregularidade por inversão de direção:

```text
sampleSize < 3            → insufficient_data
|variação| <= 2%          → stable
>= 50% de inversões        → irregular
inclinação > 0             → increasing
inclinação < 0             → decreasing
```

## Evidência

Cada tendência retorna um `evidence` textual em pt-BR, nunca apenas um rótulo:

```text
"Sono: tendência crescente nos últimos 30 dias (6 amostra(s)) (+36.0)."
"Passos: dados insuficientes nos últimos 7 dias (2 dia(s) com registro)."
"FC de repouso: variação irregular nos últimos 30 dias (6 amostra(s)), sem direção clara."
```

`changeAbsolute` é a variação estimada na janela recente
(`slopePerEntry × (tamanho da janela − 1)`), na unidade canônica da
métrica — não uma variação percentual, para não confundir com o `%` já
usado pelo módulo de Analytics de treino (`comparePeriods`).

## Nunca causalidade

Assim como o resto do módulo Analytics, a tendência descreve **o formato da
série**, nunca atribui causa. "Sono crescente" não implica melhora de
qualidade de vida — só que o valor medido está subindo na janela recente.

## Reuso

`getMetricTrend` (`analytics-queries.ts`) é o ponto de entrada esperado pela
UI e por consumidores futuros (Readiness/Recovery/Fatigue/Coach — Parte 4).
Eles recebem apenas o resultado pronto, sem precisar montar a série ou
conhecer `trend-math.ts` diretamente.
