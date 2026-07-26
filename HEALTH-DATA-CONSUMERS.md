# Health Data Consumers — Readiness, Recovery, Fatigue & Coach (Sprint 28 Parte 4)

Documento de referência rápida para quem for tocar qualquer um dos quatro
motores que consomem Health Data. Para o relatório completo da sprint, ver
`SPRINT-28-PART4.md`.

## Regra central

```text
dados suficientes e confiáveis?
→ sim: enriquecer (contexto, evidência, sinal adicional)
→ não: comportamento idêntico a antes da Sprint 28
```

Nenhum consumidor deve:

- alterar uma fórmula de score existente por causa de Health Data;
- penalizar a ausência de dado;
- substituir um input subjetivo (energia, dor, sono percebido, motivação);
- persistir um sinal derivado de Health Data;
- emitir linguagem diagnóstica ou de prescrição médica.

## O único ponto de acesso: `health-data/consumer-context.ts`

```ts
buildHealthContext(date, period = '30d', now = new Date()): HealthContext
buildTodayHealthContext(period = '30d', now = new Date()): HealthContext | undefined
getRecentConflicts(period, now): HealthDataConflict[]
```

`HealthContext` traz `sleepMinutes`, `restingHeartRate`, `steps`,
`activityMinutes` — cada um um `HealthMetricSignal` com `value`,
`baselineValue`, `delta`, `trend`, `quality`, `sampleSize`, `reliable` e
`reasons: string[]`. Um sinal só é `reliable: true` quando:

1. o dia tem valor válido para a métrica;
2. a qualidade agregada do dia não é `low`;
3. não há conflito de severidade `medium`/`high` para aquela métrica naquele dia;
4. existe baseline (amostra mínima da métrica atingida — ver `HEALTH-BASELINES.md`);
5. o dado não é obsoleto (defasagem de até 2 dias em relação a `now`).

**Nenhum consumidor deve reimplementar esses critérios.** Se um motor
precisar de um dado que o adapter não expõe, a extensão deve entrar no
adapter, não no consumidor.

## Readiness (`workout-readiness.ts`)

```ts
interface WorkoutReadinessResult {
  // ...campos existentes, inalterados
  healthContext?: HealthContext
}
```

Populado por `buildTodayHealthContext('30d', now)` nas duas saídas de
`calculateReadiness` (com e sem histórico). Nunca lido por
`computeRawScores`/`computeFinalScore`. Testado: `score`/`level` idênticos
com e sem Health Data presente.

## Recovery (`workout-recovery.ts`)

```ts
getRecoveryHealthContext(now = new Date()): HealthContext | undefined
```

Chamado **uma vez por tela** (não por item de uma lista rankeada) —
`rankWorkoutsByRecovery`/`getWorkoutRecoveryInfo` continuam sem qualquer
referência a Health Data. É contexto sistêmico, nunca recuperação muscular
por grupo.

## Fatigue (`analytics/fatigue.ts`)

Quatro detectores adicionados a `computeFatigueSignals`, mesma convenção dos
três pré-existentes (retornam `AnalyticsInsight | null`, nunca inventam
achado sem amostra):

| id prefix | condição | janela recente | baseline |
|---|---|---|---|
| `fatigue:health_sleep_deficit` | sono ≥60min abaixo da baseline por 3 dias seguidos | 3 dias | 30 dias, **excluindo** a janela recente |
| `fatigue:health_resting_hr_elevated` | FC repouso ≥5bpm acima da baseline por 3 dias seguidos | 3 dias | idem |
| `fatigue:health_high_external_activity` | passos ≥30% ou atividade ≥25% acima da baseline por 3 dias seguidos | 3 dias | idem |
| `fatigue:health_recovery_mismatch` | carga em alta + os dois primeiros simultaneamente | — | — |

**Por que a baseline exclui a janela recente**: se a baseline de 30 dias
incluísse os próprios dias "recorrentes" sendo avaliados, a média seria
puxada por eles e o próprio desvio que o padrão tenta detectar ficaria
diluído (bug real, corrigido com teste de regressão — ver
`baselineReferenceDate` em `fatigue.ts`).

Dias com qualidade baixa ou conflito médio/grave são **excluídos** da janela
recente inteira (`recentReliableDays`), nunca apenas rebaixados — um dia
não confiável simplesmente não conta para "3 dias seguidos".

## Coach (`coach/rules.ts`)

Quatro regras novas, todas lendo `signals.recovery.patterns` (já populado
via `computeFatigueSignals` dentro de `buildDashboardAnalytics`) — nenhuma
acessa `health-data/` diretamente:

- `Coach.Health.SleepDeficit`
- `Coach.Health.RestingHrElevated`
- `Coach.Health.HighExternalActivity`
- `Coach.Health.RecoveryMismatch`

Prioridade/confiança reaproveitam `priority.ts` sem alteração
(`sampleSize: 3` para os quatro achados — mesma escala 0/1-2/3-5/6+ já
usada pelas demais regras). Nenhum `CoachSignals.healthData` dedicado foi
criado — decisão consciente para não duplicar o que já chega pronto em
`signals.recovery.patterns` (ver `SPRINT-28-PART4.md` §4.5 para o raciocínio
completo).

## Extensão futura

Para adicionar um quinto sinal objetivo:

1. Adicionar o sinal ao `HealthContext` do adapter, se ainda não existir.
2. Adicionar um detector em `analytics/fatigue.ts`, seguindo o padrão
   `recentReliableDays` + `baselineReferenceDate`.
3. Adicionar uma regra em `coach/rules.ts` que só lê
   `signals.recovery.patterns` pelo prefixo do id do padrão.
4. Adicionar a descrição da regra em `coach/explanations.ts`
   (`COACH_RULE_DESCRIPTIONS`) — testado por
   `explanations.test.ts` (`has a human-readable description for every
   registered rule id`).
