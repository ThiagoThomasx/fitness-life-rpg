# Adaptive Versioning & Execution — atomicidade, idempotência, rollback (Sprint 27)

## Reaproveitamento, não reimplementação

O repositório já versiona programas e templates: `TrainingProgram.version` e
`WorkoutTemplate.version` são incrementados a cada `updateTrainingProgram`/
`updateWorkoutTemplate` (ver auditoria em `ARCHITECTURE.md`/`DATA_MODEL.md`).
`src/lib/adaptive-planning/versioning.ts` **não** reimplementa esse
versionamento — só calcula:

```ts
function describeVersionTransition(before: VersionedEntity, after: VersionedEntity): VersionTransition
function isProgramVersionStale(target: ProgramTarget, currentProgramVersion: number): boolean
```

`isProgramVersionStale` é a mesma checagem usada por `applicability.ts` —
extraída para cá para que o executor também possa reusá-la sem duplicar a
comparação.

## Execução (`execution.ts`)

```
build proposal → validate → preview → accept (decisions.ts) → execute (aqui) → persist audit
```

`applyProposal(proposalId, now)`:

1. Recusa aplicar qualquer proposta que não esteja `status === 'accepted'`
   (erro explícito: "Proposta precisa ser aceita antes de ser aplicada.").
2. Tipos sem escritor determinístico nesta versão (`adjust_frequency`,
   `review_progression`) falham explicitamente — nunca fingem aplicar.
3. Roda `checkProposalApplicability` de novo, com o estado ATUAL das
   entidades (nunca confia no snapshot capturado na criação da proposta).
4. Se aplicável, executa exatamente UMA chamada de escrita real:
   - `reduce_volume` / `increase_volume` / `insert_recovery` →
     `updatePlannedWorkoutTemplateSnapshot` (nova função em
     `planned-workouts.ts`, só para conteúdo do snapshot — nunca
     `status`/`source`/histórico de remarcação)
   - `reschedule_workout` → `reschedulePlannedWorkout` (já existente)
   - `replace_exercise` → `updatePlannedWorkoutTemplateSnapshot`
   - `maintain_plan` → nenhuma escrita
5. Marca a proposta `applied` + `appliedAt`, ou `failed` com o motivo, e
   grava uma entrada no audit trail em ambos os casos.

## Por que isso já é atômico sem uma transação explícita

Cada tipo de proposta mapeia para **uma única chamada de escrita**, e essas
funções (`updatePlannedWorkoutTemplateSnapshot`, `reschedulePlannedWorkout`)
já são atômicas — cada uma faz exatamente um
`localStorage.setItem` com o array inteiro serializado. Não existe um passo
intermediário onde metade do array foi escrita: ou a chamada completa
acontece, ou lança e cai no `catch`, que marca a proposta como `failed` sem
tocar em nenhum dado. Não há necessidade de um mecanismo de rollback
separado porque nunca existe um estado parcialmente escrito para desfazer.

## Idempotência

`applyProposal` sobre uma proposta já `applied` devolve
`{ success: true, changedEntityIds: [], warnings: ['...nenhuma ação repetida.'] }`
— nunca um erro, nunca uma segunda mutação. Isso cobre o caso de duplo clique
na UI ou reenvio de uma ação já processada.

## Falha segura

Testado explicitamente (`execution.test.ts`): se o treino alvo foi concluído
*depois* que a proposta foi criada mas *antes* de ser aplicada, a
aplicabilidade recusa, a proposta vira `failed`, e o volume original do
treino permanece intacto — nenhuma escrita parcial acontece.

## Limitação conhecida: `adjust_frequency`

`TrainingProgram` não tem um campo de "frequência-alvo" nesta versão do
schema. Criar esse campo seria uma mudança estrutural na store de programas,
fora do escopo desta sprint (ver `CLAUDE.md`, regra 2 — mudanças de lógica de
negócio pedem confirmação separada). A proposta `adjust_frequency` continua
totalmente utilizável para revisão/diff — só a aplicação automática não está
implementada; o usuário ajusta manualmente no Planner/Programa.
