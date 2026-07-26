# Adaptive Proposals — modelo e builders (Sprint 27)

## Modelo (`src/lib/adaptive-planning/types.ts`)

```ts
interface AdaptivePlanProposal {
  id: string
  recommendationId: string
  ruleId: string
  category: CoachCategory
  type: AdaptiveProposalType
  target: AdaptiveProposalTarget
  status: AdaptiveProposalStatus
  title: string
  summary: string
  before: AdaptivePlanSnapshot
  after: AdaptivePlanSnapshot
  changes: AdaptivePlanChange[]
  evidence: string[]          // copiado de CoachRecommendation.evidence
  createdAt: string
  expiresAt?: string
  reviewedAt?: string
  appliedAt?: string
}
```

`status` percorre: `draft` → (`reviewing` opcional, "revisar depois") →
`accepted` | `rejected` | `expired` → `applied` | `failed`. Nunca pula direto
de `draft` para `applied` — `execution.ts` recusa aplicar qualquer coisa que
não esteja `accepted`.

## Alvos (`AdaptiveProposalTarget`)

Um union discriminado por `kind`: `program` | `planned_workout` |
`workout_template` | `exercise`. Cada builder só usa o alvo relevante ao seu
tipo — `ProgramTarget.programVersion` (quando presente) é o mecanismo de
detecção de snapshot obsoleto (ver `ADAPTIVE-VERSIONING.md`).

## Snapshots compactos (`AdaptivePlanSnapshot`)

Nunca uma cópia do programa/treino inteiro — só os campos necessários para
o diff e para reconstruir a mutação:

```ts
interface VolumeChangeSnapshot {
  kind: 'volume'
  workoutId: string
  workoutName: string
  totalSets: number
  exercises: { exerciseId?: string; name: string; sets: number }[]
}
```

## Builders especializados

Cada builder segue o mesmo contrato: recebe a `CoachRecommendation` de
origem + as entidades reais já resolvidas pelo chamador, devolve
`AdaptivePlanProposal | null` (`null` = a recomendação não é elegível para
este tipo agora — nunca lança exceção para "não aplicável").

| Builder | Regra de elegibilidade | Algoritmo |
|---|---|---|
| `buildReduceVolumeProposal` | treino `pending`/`in_progress`, com exercícios | `reduceVolumeEvenly` — rodízio de -1 série, nunca abaixo de `MIN_SETS_PER_EXERCISE` |
| `buildIncreaseVolumeProposal` | idem | `increaseVolumeConservatively` — rodízio de +1 série, limitado a poucos exercícios |
| `buildRescheduleProposal` | treino `pending`, nova data ≠ atual | reusa `checkRescheduleConflict` (só como warning, nunca bloqueia) |
| `buildRecoveryOptions` | treino `pending`/`in_progress` | devolve até 3 propostas independentes (reagendar / reduzir / trocar por mobilidade) — cada uma pode faltar sem bloquear as outras |
| `buildAdjustFrequencyProposal` | programa não arquivado, frequência proposta ≠ atual e ≥ 1 | pura comparação de `sessionsPerWeek` |
| `buildReplaceExerciseProposal` | treino `pending`/`in_progress`, substituto ≠ original | troca de nome no diff, sem inventar novo `exerciseId` de catálogo |

## Diff engine (`proposal-diff.ts`)

`buildProposalDiff(before, after)` compara dois snapshots do MESMO `kind` e
devolve `AdaptivePlanChange[]`. Primeiro motor de diff genérico do
repositório — nenhum outro domínio (`training-programs.ts`,
`workout-templates.ts`) tinha um antes desta sprint, cada um só faz
version-bump + clone completo.

```ts
type AdaptiveChangeKind =
  | 'set_count' | 'exercise_added' | 'exercise_removed' | 'exercise_replaced'
  | 'date_changed' | 'recovery_inserted' | 'frequency_changed' | 'volume_changed'
```

`formatChangesAsText(changes)` produz linhas prontas para UI/exportação —
nunca depende só de cor para comunicar a mudança (requisito de
acessibilidade da sprint).

## Applicability (`applicability.ts`)

`checkProposalApplicability(proposal, context)` — puro, recebe as entidades
já resolvidas (nunca lê storage sozinho):

- Bloqueia (`reasons`): proposta em status terminal (`rejected`/`expired`/`applied`/`failed`),
  recomendação expirada, treino/programa alvo não encontrado, treino já
  concluído, programa arquivado, snapshot de versão obsoleto.
- Avisa sem bloquear (`warnings`): treino em andamento, conflito de
  reagendamento na data de destino.

## Testes

Cada builder tem seu próprio `*.test.ts` cobrindo: caso de sucesso, alvo
inelegível (`done`/`cancelled`/arquivado), entrada degenerada (sem
exercícios, mudança nula). `proposal-diff.test.ts` cobre os 4 `kind`s de
snapshot + o caso de kinds diferentes (nunca lança, devolve lista vazia).
