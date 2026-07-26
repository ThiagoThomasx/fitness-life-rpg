# Coach Signals — camada de adaptação (Sprint 26)

`src/lib/coach/signals.ts` transforma a saída dos motores de Analytics já
existentes em um shape padronizado (`CoachSignals`) que `rules.ts` consome.
**Nenhum cálculo é refeito aqui** — cada campo de `CoachSignals` vem
diretamente de um motor que já existia antes desta sprint.

## Fonte única: `buildDashboardAnalytics`

`buildCoachSignals(period, now)` chama `analytics/dashboard.buildDashboardAnalytics(period, now)`
exatamente uma vez e reaproveita seus resultados internos. Duas chamadas
adicionais completam o sinal com detalhe por exercício e recordes recentes:

| Chamada adicional | Motor de origem | Por quê |
|---|---|---|
| `getExerciseTrends(exerciseId)` | `exercise-intelligence.ts` | `dashboard.performance.stagnant` já traz a lista de exercícios estagnados, mas sem a tendência de carga (`ExerciseTrend`) que sustenta a evidência da regra de progressão/estagnação. |
| `getRecentRecords(10)` | `exercise-records.ts` | Nenhum motor de Analytics 2.0 expõe recordes recentes — a regra de reforço positivo (`Coach.Records.RecentAchievement`) precisa desse dado bruto. |

## Shape de `CoachSignals`

```ts
interface CoachSignals {
  period: AnalyticsPeriod
  generatedAt: string
  recovery: RecoverySignal          // fatigue.readiness + fatigue.recoveryByMuscleGroup + fatigue.loadTrend + fatigue.patterns
  consistency: ConsistencySignal    // = ConsistencyReport, sem adaptação
  muscleBalance: MuscleBalanceSignal // muscleBalance.imbalances + muscleBalance.distribution
  performance: PerformanceSignal    // performance.evolution/topEvolving/stagnant + stagnationDetails (novo, via getExerciseTrends)
  trainingLoad: TrainingLoadSignal  // loadTrend + volumeChangePercent (ambos já existentes em fatigue/performance)
  records: RecordsSignal            // getRecentRecords(10)
  progress: ProgressReport          // sem adaptação
  insights: AnalyticsInsight[]      // sem adaptação
}
```

## Regra de composição

Cada sinal é um subconjunto ou remapeamento direto de um motor existente —
nunca uma nova fórmula. Sempre que um dado necessário não existe em nenhum
motor atual, o sinal correspondente fica ausente/vazio (nunca inventado).
Exemplo: não existe um motor de "dias desde o último treino por grupo
muscular" dedicado — `MuscleRecoveryState.hoursSinceTrained`
(`workout-recovery.ts`, já composto em `recovery.recoveryByMuscleGroup`) já
contém esse dado, então `Coach.Frequency.LongGap` (`rules.ts`) o consome
diretamente em vez de recalcular.

## Testes

`signals.test.ts` cobre: histórico vazio (sinais insuficientes/vazios sem
lançar exceção), estagnação detectada com amostra real (6+ execuções de
carga estável) e recordes recentes surgindo a partir de uma execução
`isFirstTime`.
