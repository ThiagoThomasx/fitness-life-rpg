# Sprint 21 — Parte 2: Planned vs Performed UI

## Contexto

`planned-performed-comparison.ts` (Sprint 20 Parte 3A) já continha o motor
completo de comparação exercício-a-exercício, mas exigia `ResolvedProgramExercise[]`
— um tipo que só existia via `resolveProgramSessionForWeek` (resolução contra o
programa/bloco *ao vivo*). Um `PlannedWorkout` não guarda essa referência viva,
só o `templateSnapshot` já congelado — reabrir a resolução contra o programa
atual seria reintroduzir a dependência que o snapshot existe para evitar (o
programa pode ter mudado depois que a sessão foi planejada).

## O que foi feito

1. **`src/lib/planned-performed-comparison.ts`**
   - `resolvedExercisesFromPlannedWorkout(planned)`: adaptador puro que
     constrói `ResolvedProgramExercise[]` direto do `templateSnapshot`
     congelado, sem tocar no programa. Ponte que faltava entre o Planner e o
     motor de comparação existente.

2. **Diálogos de ação sobre o item planejado** (nenhum existia — só
   `PlannedWorkoutPreviewDialog`, que apenas confirma o início):
   - `SkipPlannedWorkoutDialog` — motivo (`SkippedWorkoutReason`) e nota, ambos opcionais.
   - `CancelPlannedWorkoutDialog` — motivo livre opcional.
   - `ReschedulePlannedWorkoutDialog` — nova data + aviso não bloqueante de
     conflito (via `checkRescheduleConflict`, já existente).

3. **`PlannedWorkoutComparisonView`** — renderiza `PlannedPerformedComparison`:
   resumo de exercícios/volume + lista exercício-a-exercício com diffs. Nunca
   trata meta ausente como zero — mostra "sem meta definida"/"—" (o motor já
   garante isso; o componente só formata).

4. **`src/app/(dashboard)/plano/treino/[id]/page.tsx`** — página de detalhe
   pedida na especificação (seção 13): antes da execução mostra
   exercícios/metas e ações (iniciar/reagendar/ignorar/cancelar, com o mesmo
   fluxo de conflito de sessão ativa já usado no Planner); depois da execução
   mostra status, classificação de pontualidade (`completionTiming` da Parte
   1) e a comparação planejado×realizado, com link para `/treinos`
   (histórico — não existe rota de detalhe por sessão individual no projeto,
   então não foi criada uma só para este link).

5. **`PlannedWeekSection.tsx`** — o card da semana agora **navega** para a
   página de detalhe em vez de ciclar o status diretamente
   (`pending→done→skipped→pending` via `updatePlannedWorkoutStatus`). Esse
   toggle bypassava skip/cancel/reschedule com motivo e, mais importante,
   bypassava toda a reconciliação da Parte 1 (`completePlannedWorkoutExecution`)
   — um clique "marcava" o treino como concluído sem nenhuma sessão real
   vinculada. Corrigido substituindo por navegação; o botão "Iniciar sessão"
   para itens pendentes continua igual.

## Decisões

- Link "ver no histórico" aponta para `/treinos` (não existe página de
  detalhe por `CompletedWorkout` individual no projeto — não foi criada uma
  só para este vínculo, ver seção "Fora de escopo" da spec sobre não
  redesenhar o app).
- Nenhum motor foi duplicado; toda a lógica de comparação, matching e
  diffs continua em `planned-performed-comparison.ts`.

## Testes

- `src/lib/planned-performed-comparison.test.ts`: +2 casos para
  `resolvedExercisesFromPlannedWorkout` (mapeamento fiel do snapshot,
  incluindo campos ausentes; integração end-to-end com
  `buildPlannedPerformedComparison`). 15/15 passando.

## QA manual (browser)

- Seed de `PlannedWorkout` via localStorage → `/plano/treino/[id]` renderiza
  exercícios e ações corretamente.
- Fluxo "Ignorar" completo: abre diálogo → confirma sem motivo → status muda
  para "Pulado" e a seção de motivo aparece.
- `/plano` lista os dois itens seedados com status corretos e o card navega
  para o detalhe (não cicla mais status ao clicar).

## Gates

```
Lint:      ok
Typecheck: ok
Tests:     851 passed, 1 pré-existente falhando (training-load.test.ts,
           não relacionado — ver SPRINT-21-PART1.md)
Build:     ok (nova rota /plano/treino/[id] registrada)
```

## Pendências para as próximas partes

- Resumo semanal de aderência no Planner (Parte 3).
- Página de progresso do programa (Parte 3).
- Reagendar/ignorar/cancelar ainda não têm cobertura de teste automatizado
  de UI (só manual) — os motores por trás (`reschedulePlannedWorkout`,
  `skipPlannedWorkout`, `cancelPlannedWorkout`) já são testados desde a
  Sprint 20.
