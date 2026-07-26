# Health Data — Agregação diária (Sprint 28 Parte 3)

## Objetivo

Transformar `HealthDataRecord[]` (registros brutos, possivelmente de várias
fontes no mesmo dia) em `DailyHealthSummary` — um resumo por dia, **derivado
sob demanda, nunca persistido**. Ver `src/lib/health-data/aggregation.ts`.

## Por que não persistir o resultado

Registros brutos mudam (novo import, exclusão, correção). Um resumo diário
persistido ficaria stale a cada mudança, exigindo um mecanismo de
invalidação. Como o volume de dados é pequeno (dados de saúde pessoais, não
telemetria), recalcular sob demanda é mais simples e sempre correto —
princípio 4.1 do prompt da sprint.

## Prioridade de fonte

Quando uma métrica não pode ser somada entre fontes (a maioria), a
agregação escolhe a fonte de maior prioridade presente naquele dia:

```text
manual > wellness > workout > body_progress > csv_import > json_import
       > health_connect > samsung_health > apple_health > google_fit
```

Fontes de entrada direta vêm antes de importações em lote, que vêm antes de
integrações de dispositivo (ainda não ativas). Ver
`aggregation-shared.ts#SOURCE_PRIORITY`.

## Estratégia por métrica

| Métrica | Estratégia | Por quê |
|---|---|---|
| `steps` | Maior valor dentro da fonte vencedora | Contador cumulativo de um único dispositivo — nunca somar duas fontes; a leitura mais tardia do dia já inclui as anteriores. |
| `active_calories` | Maior valor dentro da fonte vencedora | Mesmo raciocínio de `steps` — evita contar o total diário duas vezes. |
| `distance` | Soma dos valores da fonte vencedora | Eventos independentes (caminhadas/corridas) — cada registro é uma atividade distinta, não um total cumulativo. |
| `sleep_duration` | União de intervalos não sobrepostos da fonte vencedora | Duas leituras do mesmo período de sono (ex.: 23h–07h e 00h30–06h) não podem virar 14h somadas — o intervalo comum é contado uma vez. |
| `activity_duration` | Mesmo que `sleep_duration` | Duas sessões de atividade no mesmo dia são eventos distintos; sobreposição indicaria o mesmo evento relatado duas vezes. |
| `resting_heart_rate` | Mediana entre **todas** as fontes do dia | Resistente a outlier de um sensor ruim, sem depender de uma fonte só (diferente das demais métricas, que dependem de uma única fonte por design). |
| `weight` | Registro mais recente do dia, entre todas as fontes | Peso muda ao longo do dia (hidratação, refeições) — nunca uma média; o valor mais recente é o mais representativo. |
| `sleep_quality` | Mais recente da fonte vencedora | Pontual, não cumulativo. |
| `wellness_energy` / `wellness_soreness` / `wellness_motivation` | Média da fonte vencedora | Normalmente uma única entrada por dia; a média cobre o caso raro de múltiplas entradas sem escolher arbitrariamente uma. |

## Fluxo interno

```text
records (todas as métricas, todos os dias)
  → groupByDate (aggregation.ts)
    → groupByMetric (por dia)
      → METRIC_AGGREGATORS[metric] (por métrica)
    → detectConflicts (conflicts.ts) → filtrado por dia (getConflictsForDay)
    → computeDailyQuality (quality-aggregation.ts)
  → DailyHealthSummary[] (mais recente primeiro)
```

`buildDailySummaryForDate(records, date)` é o atalho para um único dia
(usado por `getDailySummary`/`getQuality` na camada de consulta).

## Reuso

- `stats.ts` — `mean`, `median`, `sumMergedIntervalsMs` (novo, não existia
  nenhum utilitário de estatística compartilhado no projeto antes desta
  parte).
- `conflicts.ts` e `quality-aggregation.ts` — chamados internamente; a UI e
  outros consumidores nunca precisam invocá-los separadamente para montar um
  resumo diário.
