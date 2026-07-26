# Health Data — Conflitos entre fontes (Sprint 28 Parte 3)

## Objetivo

Detectar quando duas fontes diferentes reportam valores incompatíveis para a
mesma métrica no mesmo dia (ex.: Manual diz 8000 passos, Samsung diz
12300). Ver `src/lib/health-data/conflicts.ts`.

## O que este motor NÃO faz

Não resolve o conflito automaticamente. Não decide qual fonte está certa.
Apenas **registra** o conflito, com evidência (quais fontes, quais valores,
quanto divergem) para a UI mostrar e para consumidores futuros decidirem o
que fazer. Resolução por prioridade de fonte é trabalho da Parte 4.

## Como um conflito é detectado

1. Registros são agrupados por `métrica + dia`.
2. Dentro de cada grupo, pega-se o registro mais recente de cada fonte
   (`latestPerSource`) — não todos os registros, para não confundir múltiplas
   leituras da mesma fonte ao longo do dia com "fontes discordantes".
3. Se há menos de duas fontes, não há conflito possível.
4. Compara-se o menor e o maior valor representativo. Se a divergência
   ultrapassa o limiar da métrica, é um conflito.

## Limiares por métrica

| Métrica | Tipo de limiar | Valor |
|---|---|---|
| `steps` | Percentual | 20% |
| `sleep_duration` | Percentual | 25% |
| `active_calories` | Percentual | 25% |
| `activity_duration` | Percentual | 25% |
| `distance` | Percentual | 25% |
| `weight` | Percentual | 5% |
| `resting_heart_rate` | Absoluto | 8 bpm |
| `sleep_quality` | Absoluto | 2 (escala 1–5) |
| `wellness_energy` / `wellness_soreness` / `wellness_motivation` | Absoluto | 2 (escala 1–5) |

Métricas em escala 1–5 usam limiar absoluto (percentual não faz sentido
numa escala pequena e não-linear); as demais usam percentual, calibrado para
não sinalizar ruído normal de medição entre sensores.

## Severidade

```text
ratio = divergência / limiar

ratio >= 4  → high
ratio >= 2  → medium
ratio <  2  → low
```

Quanto mais a divergência excede o limiar de detecção, maior a severidade —
um conflito "low" já passou do limiar, mas por pouco; um "high" é uma
discrepância grande demais para ser ruído de medição.

## Formato

```ts
interface HealthDataConflict {
  metric: HealthMetricType
  date: string          // YYYY-MM-DD
  recordIds: string[]
  sources: HealthDataSource[]
  reason: string         // ex.: "Passos: manual (8000 count) vs json_import (12300 count) — divergência de 54%"
  severity: 'low' | 'medium' | 'high'
}
```

## Reuso

`detectConflicts` é chamado internamente por `aggregation.ts` (todo
`DailyHealthSummary` já vem com `conflicts` preenchido) e diretamente por
`analytics-queries.ts#getConflicts(period)` para a UI listar conflitos de um
período sem precisar construir resumos diários completos.
