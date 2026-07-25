# Exercise Intelligence Engine

Referência da API pública de `src/lib/exercise-intelligence.ts` (Sprint 22
Parte 1). Motor puro — lê `getWorkoutHistory()`, nunca escreve em storage,
nunca lança para histórico vazio/ausente (retorna `null`/`[]`/objeto vazio
conforme o caso).

## Modelo de substituição

Persistido em `ExerciseRecord.substitution` (`workout-history.ts`), copiado
de `ActiveExerciseSubstitution` (`active-workout.ts`) no momento em que a
sessão é finalizada:

```ts
interface ActiveExerciseSubstitution {
  plannedExerciseId: string       // id do bloco no snapshot planejado
  plannedExerciseName: string
  replacementExerciseId?: string
  replacementExerciseName: string
  reason?: ExerciseSubstitutionReason
  note?: string
  substitutedAt: string
}
```

`ExerciseRecord` também ganhou `source?: ActiveExerciseSource` (`'free' |
'planned' | 'substitution' | 'extra'`) e `plannedExerciseId?: string` — o
vínculo estável com o exercício planejado (bloco do template snapshot), que
sobrevive à troca de `exerciseId` numa substituição.

**Ciclo de vida**: a substituição vale só para a sessão atual. Reverter
(`revertExerciseSubstitution`) antes de finalizar apaga o campo — nada é
persistido. Sessão cancelada nunca gera `CompletedWorkout`. Substituição
nunca altera template/programa/plano.

## Identidade do exercício

Agrupamento é sempre por `exerciseId` (nunca só por nome) — exceto para
vínculo de substituição, onde o exercício *planejado* pode não ter
`exerciseId` de catálogo (templates aceitam texto livre). Nesses casos o
motor usa `normalizeExerciseName` (de `planned-performed-comparison.ts`)
para juntar `substitution.plannedExerciseName` ao exercício correspondente.

## Cálculo de volume

Reaproveita `calculateVolumeKg`/`calculateEstimated1RM` de
`exercise-records.ts` — única fórmula de volume do projeto
(`Σ peso_kg × reps`). Sem multiplicador para bodyweight/unilateral/assistido
(mesmo comportamento do resto do projeto); séries com `weight_kg = 0`
contribuem `0` ao volume mas ainda contam para reps/recordes de repetição.

## API

### Normalização
```ts
normalizeExerciseExecutions(exerciseId, history?): NormalizedExerciseExecution[]
```
Mais recente primeiro. Cada execução carrega `wasSubstitution`,
`substitutedFromExerciseName`, `substitutionReason` quando aplicável.

### Histórico
```ts
getExerciseHistorySummary(exerciseId): ExerciseHistorySummary | null
getExerciseTimeline(exerciseId, order?: 'newest_first' | 'oldest_first')
```
`averageDaysBetweenExecutions` é `undefined` com menos de 2 execuções (não
existe intervalo com uma amostra só — nunca vira `0`).

### Recordes pessoais
```ts
getExercisePersonalRecords(exerciseId): ExercisePersonalRecords
detectNewExerciseRecords(exerciseId, sets): DetectedExerciseRecordChange[]
```
5 tipos: `max_load`, `max_reps`, `best_set_volume` (maior `carga × reps` de
uma série só), `max_session_volume`, `max_sets_in_session`. Empate = mantém
o primeiro registro cronológico (comparação `>` estrita, igual a
`detectExercisePrs`). `detectNewExerciseRecords` deve ser chamado **antes**
de `saveCompletedWorkout` — mesmo contrato de `detectExercisePrs`.

### Tendências
```ts
getExerciseTrends(exerciseId): ExerciseTrend[]  // load, volume, reps, frequency
```
- `load`/`volume`/`reps`: janela de 3 execuções vs. 3 anteriores (mínimo 6
  execuções). Variação dentro de ±5% = `stable`.
- `frequency`: contagem de execuções nos últimos 28 dias vs. 28 dias
  anteriores (janela de tempo, não de execuções — métrica diferente por
  natureza).
- `insufficient_data` sempre que a amostra mínima não é atingida — nunca
  extrapola tendência de poucas execuções.

### Substituições
```ts
getExerciseSubstitutionInsights(exerciseId): ExerciseSubstitutionInsights | null
getRecurringSubstitutions(history?): { exerciseName: string; count: number }[]
```
`replacementRate = timesReplaced / (timesReplaced + execuções diretas
planejadas)` — `undefined` sem nenhuma aparição planejada. `getRecurringSubstitutions`
é a fonte usada por `recommendation-assembly.ts` para alimentar a regra
`review_exercise` (`adaptive-recommendations.ts`), restrita à janela recente
de 14 dias no chamador.

## Compatibilidade

Todos os campos novos em `ExerciseRecord` são opcionais. Histórico salvo
antes desta sprint continua funcionando em todas as funções acima — apenas
não contribui para `substitutionsIn/Out`, `wasSubstitution` fica `false`, e
o matching planejado×realizado cai nos tiers de nome/posição já existentes.
Nenhuma migração foi necessária.
