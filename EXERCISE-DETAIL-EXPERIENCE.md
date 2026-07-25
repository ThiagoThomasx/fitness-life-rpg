# Exercise Detail Experience — Referência

Documentação da rota `/exercicios/[id]` e dos motores que a alimentam
(`src/lib/exercise-detail-engine.ts`, `src/lib/exercise-highlights.ts`).
Complementa `EXERCISE-INTELLIGENCE.md` (motor da Sprint 22 Parte 1) — este
documento cobre só o que foi adicionado na Parte 2.

## Rota

`src/app/(dashboard)/exercicios/[id]/page.tsx` — client component, App
Router, `useParams<{ id: string }>()`. Estados:

| Estado | Condição | Render |
|---|---|---|
| Loading | `data === undefined` | `SkeletonPageLoader` |
| Não encontrado | `resolveExercise(id) === null` | `EmptyState` + link para `/treinos` |
| Nunca executado | `dataQuality.status === 'no_data'` | Cabeçalho + mensagem, sem seções analíticas |
| Com histórico | qualquer outro `dataQuality.status` | Cabeçalho + resumo + grid de seções |

O cálculo roda **uma vez** por navegação (`useEffect` com `params.id` como
dependência) e é distribuído para as seções via props — nenhuma seção
recalcula o motor.

## Resolução do exercício

`resolveExercise(exerciseId, history?)` → `ResolvedExercise | null`.

Ordem: catálogo atual (`getAllExercises()`, mescla biblioteca + customizados)
→ histórico (`normalizeExerciseExecutions`) → `null`.

```ts
interface ResolvedExercise {
  exerciseId: string
  exerciseName: string
  origin: 'library' | 'custom' | 'history_only'
  availability: 'active' | 'removed'
  muscleGroups?: string[]
  equipment?: string[]
  workoutTypeId?: string
}
```

Não existe um terceiro estado de disponibilidade ("arquivado") porque o
código atual não tem esse conceito para exercícios — só para
treinos/programas.

## Qualidade dos dados

`getExerciseDataQuality(exerciseId)` → `{ status, explanation }`.

| `status` | Quando |
|---|---|
| `no_data` | Zero execuções |
| `single_execution` | Exatamente 1 execução |
| `no_load_recorded` | Todas as séries têm `weight_kg === 0` (peso corporal) |
| `partial_history` | 2 a `MIN_SAMPLE_FOR_TREND - 1` execuções com carga |
| `full_history` | `MIN_SAMPLE_FOR_TREND`+ execuções com carga |

## Treinos e programas relacionados

- `getExerciseRelatedWorkouts(exerciseId)` → agrupa execuções por
  (programa, treino), com `occurrences`, `lastPerformedAt` e
  `plannedWorkoutId` (quando existir, permite link para
  `/plano/treino/[id]`).
- `getExercisesForProgram(programId, history?)` → inverso: dado um
  programa, quais exercícios apareceram nele (usado em
  `programas/[id]/page.tsx`).

## Séries para gráfico

Todas aceitam `(exerciseId, period?: ExercisePeriodFilter = 'all')`.
`ExercisePeriodFilter = '30d' | '90d' | '6m' | '1y' | 'all'` — filtra
relativo à execução mais recente do próprio histórico do exercício (nunca à
data real do sistema, mesma convenção de `frequencyTrend` em
`exercise-intelligence.ts`).

| Função | Retorno | Definição |
|---|---|---|
| `getExerciseLoadSeries` | `ExerciseChartPoint[]` | Maior carga válida (`weight_kg > 0`) da execução |
| `getExercise1RMSeries` | `ExerciseChartPoint[]` | Maior 1RM estimado (`calculateEstimated1RM`) entre as séries da execução |
| `getExerciseVolumeSeries` | `ExerciseChartPoint[]` | `totalVolumeKg` da execução, omite sessões com volume 0 |
| `getExerciseRepsSeries` | `ExerciseChartPoint[]` | `totalReps` da execução (soma de todas as séries — decisão documentada, não é "melhor série") |
| `getExerciseFrequencySeries` | `ExerciseFrequencyPoint[]` | Execuções agrupadas em janelas de 7 dias a partir da execução mais antiga do período |

`ExerciseChartPoint` sempre inclui `workoutId`, `performedAt`,
`workoutName`, `value`, e opcionalmente `supportingLoadKg`/`supportingReps`
para contexto de tooltip.

## Highlights (Insights)

`getExerciseHighlights(history?)` → `ExerciseHighlightsGroups`:

```ts
interface ExerciseHighlightsGroups {
  recentRecords: ExerciseHighlight[]      // PR na execução mais recente do histórico geral
  mostSubstituted: ExerciseHighlight[]    // maior `timesReplaced` (getExerciseSubstitutionInsights)
  improving: ExerciseHighlight[]          // tendência de carga 'increasing'
  noRecentExecution: ExerciseHighlight[]  // >21 dias sem execução, com >=3 execuções históricas
}
```

Cada grupo tem no máximo 3 itens. Grupos vazios não aparecem na UI
(`ExerciseHighlightsSection.tsx`, Insights).

## Componentes

`src/components/exercicios/`:

| Componente | Seção da spec | Consome |
|---|---|---|
| `ExerciseDetailHeader` | §8/§9 | `ResolvedExercise`, `ExerciseHistorySummary`, `ExerciseTrend` (carga), `ExercisePersonalRecords` |
| `ExerciseSummarySection` | §10/§11 | `ExerciseHistorySummary`, `ExerciseDataQuality` |
| `ExerciseRecordsSection` | §12/§13 | `ExercisePersonalRecords` |
| `ExerciseTrendsSection` | §14/§15 | `ExerciseTrend[]` |
| `ExerciseChartsSection` | §16/§17/§18 | séries do motor (via `exerciseId` + filtro de período interno) |
| `ExerciseTimelineSection` | §19/§20/§21/§34 | `NormalizedExerciseExecution[]` |
| `ExerciseSubstitutionsSection` | §22/§23/§24 | `ExerciseSubstitutionInsights` |
| `ExerciseRelatedSection` | §25 | `ExerciseRelatedWorkout[]` |

## Layout responsivo

`src/styles/exercise-detail.css` — `.exercise-detail-grid` usa
`grid-template-areas` nomeadas, sem duplicar a árvore React:

- **Mobile** (padrão): coluna única, ordem
  `trends → records → charts → substitutions → timeline → related`.
- **Desktop** (`min-width: 768px`): duas colunas (`2fr 1fr`),
  `charts`/`timeline` na coluna principal,
  `records`/`trends`/`substitutions`/`related` na secundária.

## Limitações conhecidas

- Nenhuma rota abre um `CompletedWorkout` livre por ID — só treinos vindos
  do Planner (via `plannedWorkoutId`) têm link de volta.
- `ExerciseDataQuality` não distingue "histórico legado" (dados de antes da
  Sprint 22) de sessões livres modernas — o modelo de dados não expõe um
  campo confiável para essa distinção.
- Sem hooks de gamificação conectados a novos recordes desta página.
