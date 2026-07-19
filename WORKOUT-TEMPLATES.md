# Templates de Treino

Introduzidos na Sprint 20 — Parte 1 (`SPRINT-20-PART1.md`). Estruturas reutilizáveis de treino, separadas
de `CustomWorkout` (treinos executáveis) e de `CompletedWorkout` (histórico).

## Módulo

`src/lib/workout-templates.ts` — mesmo padrão dos demais domínios (`custom-workouts.ts`,
`training-cycles.ts`): módulo puro com localStorage direto, sem store Zustand. Chave:
`lrpg-fit:workout-templates`.

## Modelo de dados

```ts
interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  objective?: WorkoutTemplateObjective   // 'strength' | 'hypertrophy' | 'conditioning' | 'mobility'
                                          // | 'recovery' | 'technique' | 'mixed' | 'custom'
  difficulty?: WorkoutTemplateDifficulty // 'beginner' | 'intermediate' | 'advanced' | 'custom'
  estimatedDurationMinutes?: number
  exerciseBlocks: WorkoutTemplateExerciseBlock[]
  tags: string[]
  isFavorite: boolean
  isArchived: boolean
  sourceTemplateId?: string  // presente quando é cópia de outro template
  version: number            // incrementa a cada edição
  createdAt: string
  updatedAt: string
}
```

`objective`/`difficulty` são só metadados informados pelo usuário — nunca calculados ou usados para
prescrever conteúdo.

### Blocos de exercício

Nesta parte só a variante `single` é suportada. O discriminante `type` já existe para permitir adicionar
`superset`/`circuit` no futuro sem quebrar dados existentes:

```ts
type WorkoutTemplateExerciseBlock = {
  id: string
  type: 'single'
  exercise: WorkoutTemplateExercise
}

interface WorkoutTemplateExercise {
  id: string
  exerciseId?: string      // referência opcional ao catálogo (custom-workouts.ts / MOCK_EXERCISES)
  exerciseName: string     // sempre congelado — nunca depende de lookup no catálogo
  sets?: number
  reps?: string             // string livre, ex: "8-10"
  loadKg?: number
  durationSeconds?: number
  distanceMeters?: number
  restSeconds?: number
  rir?: number               // 0-10
  rpe?: number                // 0-10
  tempo?: string
  notes?: string
  alternatives?: WorkoutTemplateExerciseAlternative[]
}
```

`exerciseName` é sempre gravado no momento da criação/edição — o template nunca depende de um lookup vivo
no catálogo de exercícios, então excluir um exercício custom do catálogo não quebra templates existentes
(mesmo princípio de `ExerciseRecord.exerciseName` no histórico).

## Regras de negócio

- **Editar nunca afeta o passado.** `updateWorkoutTemplate` incrementa `version` e atualiza `updatedAt`,
  preservando `createdAt`. Programas que já capturaram um snapshot deste template (ver
  `TRAINING-PROGRAMS.md`) não são afetados.
- **Duplicar é sempre independente.** `duplicateWorkoutTemplate` gera novo `id`, novos IDs de bloco e de
  exercício, `sourceTemplateId` apontando para o original, `version: 1`, `isFavorite`/`isArchived`
  resetados.
- **Arquivar é preferido a excluir.** `archiveWorkoutTemplate`/`restoreWorkoutTemplate` não perdem dados;
  templates arquivados continuam em programas existentes e são exportáveis.
- **Exclusão condicional.** `deleteWorkoutTemplate(id, isInUse)` recusa quando `isInUse` é `true`
  (calculado pelo chamador via `isTemplateUsedInPrograms` de `training-programs.ts`) — a UI oferece
  arquivar em vez de excluir nesse caso.
- **Criar a partir de um treino existente.** `createTemplateFromWorkout` não copia status de conclusão,
  timestamps históricos, volume calculado ou PRs — só a estrutura reutilizável (nome, exercícios, targets).

## Validação

`validateWorkoutTemplate({name, exerciseBlocks, tags})` retorna `{ok, errors: [{field, message}]}`.
Valida: nome não vazio, ao menos um bloco, IDs de bloco únicos, exercício com nome, séries/carga/descanso
não-negativos, RIR/RPE entre 0-10, alternativas com nome, no máximo 8 tags.

## UI

- `src/components/workouts/TemplateLibrary.tsx` — rota `/treinos/templates`. Filtros: busca (nome/tag/
  exercício), objetivo, dificuldade, favoritos, arquivados. Ordenação: recentes/nome/duração/nº de
  exercícios/favoritos primeiro.
- `src/components/workouts/TemplateEditorModal.tsx` — criação e edição no mesmo componente (mesmo padrão
  de `WorkoutBuilderModal.tsx`), com aviso "alterações valem só para os próximos usos" quando `version > 1`.
- `src/components/workouts/TemplateExerciseRow.tsx` — campos por exercício + reordenação por botões ↑/↓
  (sem drag-and-drop) + alternativas.
- `src/components/workouts/SaveAsTemplateAction.tsx` — ação "salvar como template" em treinos
  personalizados existentes (`treinos/page.tsx`).

## Exportação

`exportWorkoutTemplateMarkdown(template)` gera Markdown com nome, objetivo, descrição e lista numerada de
exercícios com séries/reps/carga/descanso/notas.

## Backup e reset

- Chave `lrpg-fit:workout-templates` incluída em `STORAGE_KEYS`/`ARRAY_KEYS` de `src/lib/backup.ts`.
- Backups anteriores à Sprint 20 (sem essa chave) importam normalmente, resultando em lista vazia.
- Reset granular via `resetWorkoutTemplates()`, exposto em Configurações
  (`TemplatesProgramsResetSection.tsx`) — não apaga programas, sessões planejadas/concluídas nem snapshots
  já capturados dentro de programas existentes.

## Testes

`src/lib/workout-templates.test.ts` (22 testes) — validação, CRUD, versionamento, duplicação com
independência de IDs, arquivamento/restauração, favoritar, exclusão condicional, criação a partir de
treino, exportação, import/reset.

## Extensões futuras (não implementadas nesta parte)

- Blocos `superset`/`circuit` (estrutura já preparada via discriminante `type`).
- Drag-and-drop para reordenação.
- Prescrição/recomendação automática de exercícios ou cargas.
