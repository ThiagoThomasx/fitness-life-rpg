# Sprint 20 — Parte 4B: Session Execution, Explicit Substitutions & Runtime Adaptations

**Status:** concluída
**Data:** 2026-07-19

## Objetivo

Enriquecer a execução de uma sessão iniciada pelo Planner (Parte 4A) com adaptações explícitas — substituição
de exercício, exercício extra, "não realizado", reordenação e pausa/retomada — preservando a diferença entre
o que foi planejado e o que foi de fato adaptado/realizado. Não inclui conclusão transacional, vínculo
definitivo com o histórico, nem reconciliação — isso é Parte 4C.

## Auditoria curta (Fase 1)

1. **Tipo do exercício ativo?** `ActiveSet` (local em `useSessionStore.ts`, agora exportado): `{ exercise: Exercise, sets: SetData[] }`.
2. **Campos adicionáveis retrocompatíveis?** Todos opcionais — `source`, `plannedExerciseId`, `plannedTargets`, `substitution`, `executionStatus`. Sessões antigas e treino livre simplesmente não têm essas chaves; nenhuma normalização/migração foi necessária.
3. **Como exercícios são adicionados/removidos hoje?** `addExercise(exercise)`/`removeExercise(exerciseId)`, chave de identidade = `exercise.id`.
4. **A ordem é persistida pelo array?** Sim — a store serializa `activeSets` como está, então reordenar o array já é reordenar a sessão.
5. **Existe função de mover?** Não existia — criada (`moveActiveExercise` pura em `active-workout.ts` + action `moveExercise` na store).
6. **Catálogo retorna exercício completo?** Sim, `getAllExercises()` (`custom-workouts.ts`) devolve `Exercise[]` completo.
7. **Exercício planejado tem ID interno estável?** Sim, `PlannedExecutionExercise.id` (o `id` do bloco no snapshot, não o `exerciseId` do catálogo) — é esse valor que vira `plannedExerciseId`.
8. **Snapshot planejado consultável pela UI?** Sim, `useSessionStore().plannedSnapshot`, já persistido desde a Parte 4A.
9. **Timer já tinha pausa?** Não — `elapsedSeconds` só incrementava enquanto havia sessão. Resolvido fazendo o pause parar o `tickTimer` (sem contabilizar "tempo pausado" separadamente, já que o timer simplesmente não avança).
10. **Cancelamento limpa corretamente?** Limpa a store, mas **não revertia o Planner** — gap real encontrado na auditoria e corrigido nesta parte (`handleCancelConfirmed` agora chama `revertPlannedWorkoutToPending` antes de `endSession`).
11. **Refresh restaura exercícios/sets?** Sim, já coberto pelo `persist` existente; os campos novos entraram no mesmo `partialize`.
12. **Campos fora de escopo agora?** Qualquer coisa de `CompletedWorkout`, vínculo definitivo Planner→histórico, idempotência de conclusão, aderência, reconciliação — tudo isso é Parte 4C.

## O que foi implementado

### Modelo (`src/lib/active-workout.ts`)
- `ActiveExerciseSource` (`free | planned | substitution | extra`), `ActiveExerciseStatus` (`pending | in_progress | completed | skipped`), `ExerciseSubstitutionReason`, `ActiveExerciseSubstitution`.
- **Decisão de status**: só `skipped` é persistido de fato. `pending`/`in_progress`/`completed` são sempre derivados de `sets.length` vs. `plannedTargets.sets` via `deriveExerciseExecutionStatus` — evita uma segunda fonte de verdade que pudesse divergir dos sets reais.
- `formatPlannedTargets` (extraído e reaproveitado também pelo `PlannedWorkoutPreviewDialog` da Parte 4A, que tinha uma formatação duplicada equivalente).
- `moveActiveExercise<T>` — reordenação pura e genérica.
- `validateActiveWorkoutAdaptations` / `ActiveWorkoutAdaptationIntegrity` — relatório interno (órfãos, duplicatas, extras inválidos, skipped-com-sets). Não tem UI nesta fatia — só testes; a superfície de integridade fica para 4C/4D.

### Store (`src/stores/useSessionStore.ts`)
- `ActiveSet` exportado e enriquecido com os 5 campos novos (todos opcionais).
- `status: 'active' | 'paused'` + `pausedAt` no estado, incluídos no `partialize`.
- `addExercise` ganhou um segundo parâmetro opcional `meta` (`source`/`plannedExerciseId`/`plannedTargets`) — reaproveitado tanto para o pré-carregamento da Parte 4A quanto para tags de "extra" durante a execução, em vez de criar uma segunda action quase idêntica.
- Novas actions: `substituteExercise`, `revertExerciseSubstitution`, `skipExercise` (com `clearSets?` opcional), `restoreExercise`, `moveExercise`, `pauseSession`, `resumeSession`.
- Substituição/reversão **sempre limpam os sets da linha** — nunca transportam carga/reps silenciosamente para outro exercício (o exercício mudou de identidade). Confirmação de "manter ou limpar" antes de chamar a action fica na UI (`ExerciseSubstitutionDialog` não pergunta isso porque o próprio fluxo de substituir já assume início limpo; `SkipExerciseDialog` sim, pergunta, porque marcar como não realizado não precisa limpar por padrão).

### Componentes novos (`src/components/session/`)
`ExerciseSourceBadge`, `PlannedTargetsSummary`, `ExerciseExecutionActions` (substituir/reverter/skip/restaurar/mover — nome ligeiramente diferente do "ExerciseActionMenu" sugerido no spec, mesma função), `ExerciseSubstitutionDialog` (catálogo → motivo opcional → confirmação), `SkipExerciseDialog` (só aparece quando já há sets), `PausedSessionBanner`.

`SessionExerciseCard`/`SessionHeader`/`/sessao/page.tsx` foram estendidos, não reescritos.

### Fluxo de descarte (Fase 37/38)
`handleCancelConfirmed` agora reverte o Planner (`revertPlannedWorkoutToPending`) **antes** de `endSession()` — se a reversão falhar (edge case sem caminho de reprodução nesta fatia), o descarte segue mesmo assim; nenhum histórico é criado em nenhum caso. Reconciliação robusta desse cenário de falha fica documentada como escopo da Parte 4C.

## Decisões deliberadas (fora de escopo confirmado)

- **Não** pré-cria sets vazios a partir de `plannedTargets.sets` — o modelo atual de `ExerciseSet` não tem um conceito de "linha vazia" (campos numéricos obrigatórios); criar isso teria sido uma mudança de modelo maior do que o pedido, e o comportamento atual (usuário registra série por série) já não é substituído silenciosamente por carga planejada.
- **Readiness/`checkInPhase` continua não persistido** (Opção B do Fase 41) — refresh sempre volta para a fase de check-in, mas isso não apaga nenhuma adaptação (sets/substituições/extras sobrevivem). Não foi necessário mudar isso para o refresh do fluxo do Planner ser seguro.
- **Pausa não trava inputs** — só para o timer e mostra o banner. Os cards de exercício continuam editáveis durante a pausa (spec só exige "não esconder dados"; bloquear edição teria exigido plumbing de `disabled` por todo `SessionExerciseCard`/`AddSetForm` sem pedido explícito no critério de aceite).

## Testes

- `src/lib/active-workout.test.ts`: +18 testes (`formatPlannedTargets`, `deriveExerciseExecutionStatus`, `moveActiveExercise`, `validateActiveWorkoutAdaptations`).
- `src/stores/useSessionStore.test.ts` (novo arquivo — não existia teste de store antes): 19 testes cobrindo `startSession`/`addExercise` com meta, `substituteExercise` (incl. colisão de id, preservação do nome planejado original em múltiplas substituições, limpeza de sets), `revertExerciseSubstitution`, `skipExercise`/`restoreExercise`, `moveExercise` (limites), `pauseSession`/`resumeSession`, `endSession`.
- 841/841 testes no total (37 novos). Build/lint/`tsc --noEmit` limpos.

## QA funcional (dev server, `fitness-rpg`)

Fluxo completo executado no navegador com dados reais (seed via `localStorage`, não mock estático):
iniciar pelo Planner → skip do check-in → **substituir** "Supino Reto" por "Crucifixo" com motivo "Equipamento
indisponível" (badge muda para "Substituição", targets planejados preservados) → marcar a substituição como
**não realizado** e depois restaurar → adicionar **"Rosca Direta" como extra** (badge "Extra", sem ações de
substituir/skip, só mover) → registrar uma série em "Supino Inclinado" → marcar como não realizado **com
confirmação** (sets mantidos, per escolha "Manter séries registradas") → **pausar** (timer congela, `Finalizar`
desabilitado, banner com Retomar/Descartar) → **refresh da página** → tudo preservado (pausa, substituição,
extra, não-realizado, série registrada) → **retomar** → **descartar sessão** → confirmado via `localStorage`
que o `PlannedWorkout` voltou a `status: "pending"` e a sessão ativa foi limpa (`activeSession: null`), sem
nenhuma entrada nova em `lrpg-fit:workout-history`. Console sem erros novos (só um `ChunkLoadError` de HMR do
Next dev server entre navegações, artefato conhecido de dev, ausente no build de produção).

## Itens adiados para a Parte 4C

Conversão para `CompletedWorkout`, conclusão transacional idempotente, `finalizeActiveWorkout`, vínculo
definitivo Planner→histórico (`linkPlannedWorkoutToCompleted` continua não chamada em runtime), reconciliação
de falhas, integração com aderência/ciclo, UI de integridade (`ActiveWorkoutAdaptationIntegrity` já existe
como motor puro, mas sem tela).

## Git

Nada commitado ao final desta fatia — aguardando revisão do usuário antes de commit/push.
