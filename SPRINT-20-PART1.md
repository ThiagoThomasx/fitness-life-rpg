# Sprint 20 — Parte 1: Workout Templates, Weekly Programs & Program Builder Foundation

**Status:** concluída
**Data:** 2026-07-19

## Objetivo

Construir a fundação de templates de treino reutilizáveis e programas semanais que combinam templates em
semanas com sessões planejadas — sem prescrição automática, sem IA, sem periodização avançada. Como parte
dessa fundação, criar um Planner mínimo (agenda persistida por data), já que ele não existia antes desta
sprint, para que programas tenham onde ser instanciados.

## Auditoria (Fase 1)

Respostas às 20 perguntas do spec, confirmadas por leitura de código antes de escrever qualquer linha nova:

1. **Treino reutilizável hoje?** `CustomWorkout` (`src/lib/custom-workouts.ts`) — `{id, name, workoutTypeId,
   exerciseIds, targets, estimatedMinutes}`. `Workout` em `types/database.ts` é vestigial (padrão Supabase,
   quase não usado no fluxo local-first).
2. **Treino e sessão concluída usam o mesmo modelo?** Não — `CompletedWorkout`
   (`src/lib/workout-history.ts`) é inteiramente separado, com campos denormalizados próprios.
3. **Existe snapshot no histórico?** Parcial — `ExerciseRecord.exerciseName` é fixo, mas `exerciseId`
   continua sendo chave viva para lookups de progressão.
4. **Editar exercício no catálogo afeta sessões antigas?** Não corrompe números históricos (nome
   congelado), mas lookups que dependem de `exerciseId` (ex.: grupos musculares) podem degradar
   silenciosamente se um exercício custom for apagado.
5. **O Planner armazena referência ou cópia?** **Nenhum dos dois — não existia Planner persistido.**
   `/plano` era só metas semanais (`WeeklyPlan`), campanhas e ciclos. `getWeeklyRoutineSuggestion()` é
   sugestão computada e não-persistida. Este foi o achado mais importante da auditoria — motivou a decisão
   de construir um Planner mínimo nesta parte (ver Fase 2).
6. **Já existe duplicação de treino?** Sim, `duplicateCustomWorkout()` — padrão seguido para templates e
   programas.
7. **Já existe conceito de rotina semanal/template/programa?** Não, nenhuma ocorrência real no código.
8. **Como os dias são representados?** `number` 0-6 cru (`Date.getDay()`), com `DAY_LABELS` em
   `preferences.ts`. Nenhum type `Weekday` existia.
9. **Um treino por dia no Planner?** Não aplicável — não havia agendamento por dia algum.
10. **Como ciclos se relacionam ao Planner?** Não se relacionam — `TrainingCycle` é metadado leve (nome,
    meta, datas, status); métricas são sempre derivadas do histórico, nunca persistidas.
11. **Campos a congelar ao instanciar?** Nome/categoria do exercício, targets, nome do treino — mesmo
    padrão de `ExerciseRecord`.
12. **Geração de ID?** Convenção `` `prefixo-${Date.now()}` ``, sem uuid/nanoid.
13. **Backup?** Allowlist única `STORAGE_KEYS` em `backup.ts` — chaves novas precisam ser adicionadas
    manualmente.
14. **Reset?** Não granular por padrão (bloco único `resetAllData()`), com um precedente de reset granular
    (`BodyProgressResetSection`, Sprint 19).
15. **UI reaproveitável?** `WorkoutBuilderModal.tsx` (picker + `ExerciseTargetRow` + modal aninhado) foi o
    molde para o editor de template.
16. **Reordenação de exercícios?** Não existia (sem drag-and-drop, sem botões mover). Implementado do zero
    para templates (botões ↑/↓).
17. **Stores Zustand no domínio de treino?** Nenhuma — só 4 stores reais existem (character/reward/badge/
    session), todas fora do domínio de treino/ciclo/planner. Confirma o padrão de módulo `lib/*.ts` com
    localStorage direto, seguido por templates/programas/planner.
18. **Enum de objetivo/dificuldade?** Não existia — criado novo para templates.
19. **Fonte única de verdade?** `src/lib/workout-templates.ts` e `src/lib/training-programs.ts`, seguindo a
    convenção de `custom-workouts.ts`/`training-cycles.ts`.
20. **Versionamento?** Só existia para backups (`BACKUP_VERSION`). Domínios individuais usam campos
    opcionais aditivos. Templates/programas introduzem `version: number` por registro (incrementado a cada
    edição), sem precedente anterior — decisão nova desta sprint.

## Decisão arquitetural (Fase 2)

| Entidade | Papel | Mutabilidade |
|---|---|---|
| `WorkoutTemplate` | estrutura reutilizável | editável; `version` incrementa a cada edição |
| `TrainingProgram` | semanas + sessões, cada sessão com snapshot congelado do template usado | editável; `version` incrementa |
| `PlannedWorkout` (Planner mínimo, novo) | instância concreta numa data | criada manualmente ou por instanciação de programa; nunca aponta para template/programa vivo |
| `CompletedWorkout` (já existia) | registro histórico imutável | não muda |

Regra dura, testada explicitamente: editar um template ou programa nunca modifica um `PlannedWorkout` já
criado nem um `CompletedWorkout`. Toda fronteira entre essas entidades passa por snapshot + IDs de origem
opcionais — nunca por referência mutável.

## Arquitetura implementada

### `src/lib/workout-templates.ts` (novo)

Types (`WorkoutTemplate`, `WorkoutTemplateExerciseBlock` — só variante `single` nesta parte, discriminante
`type` já preparado para `superset`/`circuit` futuros —, `WorkoutTemplateExercise`,
`WorkoutTemplateExerciseAlternative`, `WorkoutTemplateObjective`, `WorkoutTemplateDifficulty`). CRUD
completo: `saveWorkoutTemplate`, `updateWorkoutTemplate` (incrementa versão, preserva `createdAt`),
`duplicateWorkoutTemplate` (novos IDs em tudo, sem compartilhar referência), `archiveWorkoutTemplate`/
`restoreWorkoutTemplate`, `toggleWorkoutTemplateFavorite`, `deleteWorkoutTemplate(id, isInUse)` (recusa
quando em uso), `createTemplateFromWorkout` (não copia status/timestamps/PRs), `exportWorkoutTemplateMarkdown`,
`importWorkoutTemplates`/`resetWorkoutTemplates`. `validateWorkoutTemplate` retorna erros estruturados
(`{field, message}`).

### `src/lib/training-programs.ts` (novo)

Types (`TrainingProgram`, `TrainingProgramWeek`, `TrainingProgramSession`, `WorkoutTemplateSnapshot`,
`Weekday` — fonte única para o domínio de templates/programas, reexportado por `planned-workouts.ts`).
`createWorkoutTemplateSnapshot` faz cópia profunda validada (`JSON.parse(JSON.stringify(...))`) — testado
explicitamente para provar que mutar o template original depois não vaza no snapshot. CRUD completo +
`duplicateProgramWeek`, `duplicateTrainingProgram`, `validateTrainingProgram` (programa vazio é permitido
como rascunho), `getTrainingProgramStructuralAlerts` (avisos neutros: 3+ sessões no mesmo dia, 5+ dias
consecutivos, sessão sem exercícios — nunca bloqueiam salvamento, nunca qualificam o programa),
`isTemplateUsedInPrograms`, `exportTrainingProgramMarkdown`, import/reset.

### `src/lib/planned-workouts.ts` (novo — Planner mínimo)

`PlannedWorkout` (`{id, date, weekday, name, templateSnapshot, source?, status, isOptional, notes}`) e
`PlannedWorkoutSource` (`{programId?, programVersion?, programWeekId?, templateId?, templateVersion?}` —
contexto opcional só para analytics, nunca dependência viva). CRUD + `getPlannedWorkoutsByDateRange`,
`deletePlannedWorkoutsInRange` (usado pela estratégia "substituir" da instanciação), import/reset. Escopo
desta parte: só estrutura de dados + listagem por data — sem execução real de treino a partir daqui, sem
drag-and-drop, sem calendário complexo.

### `src/lib/program-instantiation.ts` (novo)

`computeProgramInstantiationDates` — posiciona cada sessão por `dayIndex` (offset direto), `preferredWeekday`
(dia correspondente na semana) ou "dia flexível" (primeiro slot livre, sem colisão). `detectInstantiationConflicts`
— compara datas calculadas contra `PlannedWorkout`s já existentes. `previewProgramInstantiation` — só
calcula, nunca persiste (usado para a prévia da Fase 41). `instantiateProgramIntoPlanner(program, startDate,
strategy)` — só deve ser chamado após confirmação explícita da UI; `strategy` é `'keep' | 'replace' | 'skip'
| 'cancel'`.

## UI implementada

- **Templates** (`src/components/workouts/`): `TemplateLibrary.tsx` (filtros: busca, objetivo, dificuldade,
  favoritos, arquivados; ordenação: recentes/nome/duração/exercícios/favoritos), `TemplateEditorModal.tsx`
  (mesmo padrão de `WorkoutBuilderModal` — picker de exercícios + campos por exercício + reordenação por
  botões ↑/↓, sem drag-and-drop), `TemplateExerciseRow.tsx`, `SaveAsTemplateAction.tsx` (ação "salvar como
  template" nos treinos personalizados existentes). Rota `/treinos/templates`.
- **Programas** (`src/components/programs/`): `ProgramLibrary.tsx`, `ProgramEditorWizard.tsx` (wizard de 4
  passos sobre o novo `Stepper.tsx` genérico — Informações / Semanas iniciais / Sessões / Revisão, condensando
  os 9 passos do spec original em um fluxo coerente), `ProgramWeekEditor.tsx` (dias como seções, sessão via
  `ProgramSessionPicker`, mover sessão para outro dia via seletor, duplicar semana), `ProgramSessionPicker.tsx`
  (escolher template → snapshot imediato, ou estrutura vazia sem template), `ProgramSummary.tsx` (estatísticas
  + avisos estruturais). Rota `/programas`.
- **Instanciação**: `ProgramInstantiationDialog.tsx` — data inicial (próxima segunda/hoje/personalizada),
  prévia com contagem de semanas/sessões/conflitos, resolução de conflito (manter/substituir/pular/cancelar),
  criação opcional de ciclo (`TrainingCycleProgramSource` implícito via `createCycle` com `plannedWeeks`).
- **Planner mínimo em `/plano`**: `PlannedWeekSection.tsx` — lista as sessões planejadas da semana atual,
  toggle de status por clique (pendente → concluído → pulado), link para `/programas`.
- **`Stepper.tsx`** (`src/components/ui/`) — wizard genérico sobre `ModalShell`, primeiro do tipo no
  projeto (`OnboardingModal.tsx` era o único precedente, hand-rolled e sem usar o modal primitivo).

## Backup, reset e importação

- `src/lib/backup.ts`: `lrpg-fit:workout-templates`, `lrpg-fit:training-programs`, `lrpg-fit:planned-workouts`
  adicionadas a `STORAGE_KEYS` e `ARRAY_KEYS`. Backups antigos (sem essas chaves) continuam importando
  normalmente — as listas ficam vazias, sem migração destrutiva (testado em `backup.test.ts`, que já passava
  e continua passando sem alteração).
- `TemplatesProgramsResetSection.tsx` (novo) + `configuracoes/page.tsx`: reset granular com checkboxes
  independentes para "Templates de treino" e "Programas de treino" — não apaga sessões planejadas/concluídas
  nem ciclos.

## Testes

65 testes novos, todos em módulos puros (Vitest, padrão `beforeEach(() => localStorage.clear())`):

- `workout-templates.test.ts` (22) — validação, versão incrementando, duplicação com IDs independentes,
  arquivamento/restauração, favoritar, exclusão recusada quando em uso, `createTemplateFromWorkout`,
  exportação Markdown, import/reset.
- `training-programs.test.ts` (19) — validação (programa vazio permitido), duplicação de semana e de
  programa, avisos estruturais (3+ sessões no mesmo dia, sessão sem exercícios, sem bloquear salvamento),
  `createWorkoutTemplateSnapshot` prova de independência (mutar o template original depois não afeta o
  snapshot já capturado), exportação, uso por templates.
- `planned-workouts.test.ts` (8) — CRUD, consultas por data/intervalo, exclusão em intervalo (usada pela
  estratégia "substituir").
- `program-instantiation.test.ts` (16) — posicionamento por `dayIndex`/`preferredWeekday`/flexível, offset
  de semana, detecção de conflito, prévia não-persistente, todas as 4 estratégias de instanciação, metadados
  de origem, e prova explícita de que editar o programa depois não afeta sessões já instanciadas.

**Total da suíte: 714 testes (649 pré-existentes + 65 novos), todos passando.**

## Gates

- `npx tsc --noEmit`: limpo (não existe script `typecheck` no `package.json`; rodado diretamente).
- `npm run lint`: limpo, sem warnings.
- `npm test` (Vitest): 43 arquivos, 714 testes, todos passando.
- `npm run build`: build de produção limpo, 21 rotas geradas (`/treinos/templates` e `/programas` novas).

## QA funcional (dev server)

Fluxo completo verificado via navegação real, não só testes unitários:

1. Criar template com 2 exercícios (picker de catálogo, campos sets/reps/descanso) → salvo com `version: 1`.
2. Favoritar e duplicar template → cópia com `sourceTemplateId`, `version: 1`, IDs de bloco/exercício
   independentes.
3. Criar programa via wizard (4 passos) com 2 semanas, 1 sessão vinculada ao template → resumo mostra
   estatísticas corretas antes de salvar.
4. Instanciar programa → 1 `PlannedWorkout` criado com `source` completo (`programId`, `programVersion`,
   `programWeekId`, `templateId`, `templateVersion`).
5. Reinstanciar o mesmo programa → conflito detectado corretamente (1 dia), as 3 estratégias exibidas;
   "Substituir" escolhido junto com "Criar ciclo" → 1 sessão (substituída, não duplicada) + 1 ciclo ativo
   criado com `plannedWeeks: 2`.
6. **Independência confirmada por mutação direta**: nome e exercícios do template original alterados
   manualmente após a instanciação → o `PlannedWorkout` já criado manteve nome e exercícios originais
   intactos (prova em ambiente real, além dos testes automatizados).
7. Reset granular: apenas "Templates de treino" selecionado → templates zerados, programas/planner/ciclos
   preservados.
8. Seção do Planner em `/plano`: sessão de teste na semana atual renderiza corretamente; clique alterna
   status pendente → concluído → pulado.

## QA visual

14 screenshots (7 fluxos × desktop 1280×900 + mobile 390×844) via Playwright/Edge (Browser pane trava
`screenshot`/`zoom` neste ambiente — workaround documentado em memória) em
`docs/screenshots/sprint20-part1/`: biblioteca de templates, editor de template, biblioteca de programas,
wizard (informações/semanas/revisão), diálogo de instanciação com conflito. Confirma aderência aos tokens
de design (chartreuse só como acento no CTA, sem sombras, radius consistente) em ambos os breakpoints. Não
é a matriz exaustiva da Fase 62 do spec original (decisão consciente de escopo, aprovada previamente) —
cobre os fluxos principais, não cada estado individual (arquivamento, filtros, exportação isoladamente).

## Não-regressão

Confirmada via suíte completa (714 testes, incluindo todos os módulos pré-existentes) + QA manual: criação
de treino livre, Planner de metas (`/plano` aba Semana), histórico, ciclos, backup antigo continuam
funcionando sem alteração de comportamento.

## Itens adiados / fora de escopo (conforme instruído)

- IA, prescrição automática, recomendação de divisão, progressão de carga, periodização, deload automático
  — não implementados.
- Superset/circuit em blocos de exercício — discriminante `type` preparado, só `single` implementado.
- Drag-and-drop — reordenação por botões (↑/↓ em exercícios, seletor de dia em sessões).
- Múltiplas sessões por dia com reordenação interna — suportado no modelo (`sessions[]` por dia), mas sem
  UI de reordenação dentro do mesmo dia nesta parte.
- Execução real de treino a partir de uma `PlannedWorkout` (iniciar sessão pré-preenchida) — Planner
  permanece de leitura/status apenas nesta parte.
- Matriz exaustiva de screenshots (Fase 62) — cobertos os fluxos principais, não cada estado individual.
- Auditoria de acessibilidade dedicada e testes em múltiplos leitores de tela — não realizados nesta rodada.

## Status do Git

Nenhuma alteração foi enviada ao remoto — tudo no working tree local, aguardando revisão antes de
commit/push.

### Arquivos criados

- `src/lib/workout-templates.ts`, `src/lib/workout-templates.test.ts`
- `src/lib/training-programs.ts`, `src/lib/training-programs.test.ts`
- `src/lib/planned-workouts.ts`, `src/lib/planned-workouts.test.ts`
- `src/lib/program-instantiation.ts`, `src/lib/program-instantiation.test.ts`
- `src/components/ui/Stepper.tsx`
- `src/components/workouts/TemplateLibrary.tsx`, `TemplateEditorModal.tsx`, `TemplateExerciseRow.tsx`,
  `SaveAsTemplateAction.tsx`
- `src/components/programs/ProgramLibrary.tsx`, `ProgramEditorWizard.tsx`, `ProgramWeekEditor.tsx`,
  `ProgramSessionPicker.tsx`, `ProgramSummary.tsx`, `ProgramInstantiationDialog.tsx`
- `src/components/plano/PlannedWeekSection.tsx`
- `src/components/settings/TemplatesProgramsResetSection.tsx`
- `src/app/(dashboard)/treinos/templates/page.tsx`
- `src/app/(dashboard)/programas/page.tsx`
- `docs/screenshots/sprint20-part1/` (14 imagens)
- `SPRINT-20-PART1.md`, `WORKOUT-TEMPLATES.md`, `TRAINING-PROGRAMS.md`

### Arquivos alterados

- `src/lib/backup.ts` (novas chaves em `STORAGE_KEYS`/`ARRAY_KEYS`)
- `src/app/(dashboard)/configuracoes/page.tsx` (reset granular conectado)
- `src/app/(dashboard)/plano/page.tsx` (`PlannedWeekSection` na aba Semana)
- `src/app/(dashboard)/treinos/page.tsx` (link para templates/programas, ação salvar-como-template)
- `src/components/workouts/WorkoutCard.tsx` (prop `extraActions`)
- `src/components/workouts/WorkoutsHeader.tsx` (links Templates/Programas)
- `src/styles/components.css` (`.stepper-*`, `.tag-chip--removable`, `.tag-chip__remove`)
- `ROADMAP_SPRINTS.md`, `CHANGELOG.md`, `DATA_MODEL.md` (ver seções atualizadas)
