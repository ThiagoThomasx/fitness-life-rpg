# Sprint 21 — Parte 1: Execution Foundation

## Contexto

Auditoria da Sprint 20 (partes 1, 2A, 3A, 4A, 4B) mostrou que os motores puros de
execução (`active-workout.ts`), aderência (`program-adherence.ts`) e comparação
planejado×realizado (`planned-performed-comparison.ts`) já existiam prontos e
testados desde a Parte 3A, mas o elo central do fluxo nunca foi ligado:
`linkPlannedWorkoutToCompleted` existia como função morta — nunca chamada pela UI
— e `CompletedWorkout.source` nunca era preenchido ao finalizar uma sessão
iniciada pelo Planner. Sem isso, todo o restante da Sprint 21 (adesão, comparação,
recomendações) não teria dados reais para consumir.

## O que foi feito

1. **`src/lib/planned-workouts.ts`**
   - Novo tipo `CompletionTiming = 'on_time' | 'early' | 'late' | 'rescheduled' | 'unplanned'`.
     `'unplanned'` nunca é atribuído por este módulo — só se aplica a sessões
     concluídas sem vínculo a nenhum item do Planner, identificáveis via
     `CompletedWorkout.source` ausente (já coberto por `identifyExtraSessions`
     em `program-adherence.ts`).
   - `PlannedWorkoutExecution.completionTiming?: CompletionTiming` (campo aditivo).
   - `classifyCompletionTiming(planned, completedDateLocal)`: puro. Remarcada
     sempre classifica como `rescheduled`, independente da distância entre a
     data final e a original — a remarcação já é o registro explícito da
     decisão do usuário; comparar de novo seria julgá-la.
   - `completePlannedWorkoutExecution(id, completedWorkoutId, completedDateLocal)`:
     vincula, marca `status: 'done'` e grava `completionTiming` numa única
     escrita. Ponto de entrada real da UI. `linkPlannedWorkoutToCompleted`
     (Parte 3A) permanece intacto para não quebrar consumidores existentes,
     mas não é mais chamado pela sessão.

2. **`src/app/(dashboard)/sessao/page.tsx`**
   - `finishWorkout()` agora preenche `CompletedWorkout.source` a partir do
     `ActiveWorkoutSource` da sessão (quando `source.type === 'planned'`) —
     antes esse campo nunca era populado, o que quebrava silenciosamente
     `identifyExtraSessions` e qualquer contagem de sessões extras.
   - Após `saveCompletedWorkout`, chama `completePlannedWorkoutExecution` com
     a data local de conclusão (`completedAt.slice(0, 10)`), reconciliando o
     item do Planner. Sessões livres (não iniciadas pelo Planner) não
     acionam reconciliação — não há o que reconciliar.

## Decisões

- Data de conclusão usa a mesma convenção já estabelecida no projeto
  (`new Date().toISOString().slice(0, 10)`, ver `daily-log.ts`), não uma nova
  função de data local — evita introduzir uma segunda convenção de "hoje".
- Nenhum motor foi recriado. `program-adherence.ts` e
  `planned-performed-comparison.ts` continuam sem consumidores de UI — isso é
  a Parte 2/3 desta sprint, agora desbloqueada porque `PlannedWorkout.status`
  e `execution.completedWorkoutId` finalmente refletem a realidade.

## Testes

`src/lib/planned-workouts.test.ts`: +7 casos (`classifyCompletionTiming`:
on_time/early/late/rescheduled; `completePlannedWorkoutExecution`:
vínculo+timing, classificação late, id inexistente). 28/28 passando.

## Gates

```
Lint:      ok (0 warnings/errors)
Typecheck: ok
Tests:     848 passed, 1 pré-existente falhando (training-load.test.ts —
           "counts free sessions all time", confirmado falho também em
           HEAD antes desta parte; não relacionado)
Build:     ok
```

## Pendências para as próximas partes

- UI de comparação planejado×realizado e resumo de aderência (Parte 2/3).
- `validateProgramExecutionIntegrity` continua sem UI de reparo.
- Sessões descartadas (`handleCancelConfirmed`) continuam sem `completionTiming`
  — correto: descarte não é conclusão.
