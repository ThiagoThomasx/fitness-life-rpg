# Programas de Treino

Introduzidos na Sprint 20 — Parte 1 (`SPRINT-20-PART1.md`). Um programa organiza semanas e sessões,
reutilizando templates de treino (`WORKOUT-TEMPLATES.md`). Inclui também o Planner mínimo — a agenda
persistida que não existia antes desta sprint — e a lógica de instanciação que preenche o Planner a partir
de um programa.

## Módulos

- `src/lib/training-programs.ts` — programa, semanas, sessões, snapshots. Chave:
  `lrpg-fit:training-programs`.
- `src/lib/planned-workouts.ts` — Planner mínimo (sessões planejadas por data). Chave:
  `lrpg-fit:planned-workouts`.
- `src/lib/program-instantiation.ts` — cálculo de datas, detecção de conflito, aplicação no Planner. Não
  persiste nada por conta própria — só é chamado após confirmação explícita da UI.

Todos seguem o mesmo padrão dos demais domínios: módulo puro com localStorage direto, sem store Zustand.

## Modelo de dados

```ts
interface TrainingProgram {
  id: string
  name: string
  description?: string
  objective?: string
  level?: string
  weeks: TrainingProgramWeek[]
  tags: string[]
  isFavorite: boolean
  isArchived: boolean
  sourceProgramId?: string
  version: number
  createdAt: string
  updatedAt: string
}

interface TrainingProgramWeek {
  id: string
  weekNumber: number
  name?: string
  notes?: string
  sessions: TrainingProgramSession[]
}

interface TrainingProgramSession {
  id: string
  dayIndex?: number           // offset 0-6 dentro da semana — tem prioridade sobre preferredWeekday
  preferredWeekday?: Weekday  // 0=domingo..6=sábado — mesma convenção de preferences.ts
  name: string
  templateId?: string          // referência opcional, só para analytics
  templateSnapshot: WorkoutTemplateSnapshot  // sempre presente — fonte de verdade da sessão
  isOptional: boolean
  notes?: string
}
```

Uma sessão **sem** `dayIndex` nem `preferredWeekday` é um "dia flexível" — não tem posição fixa na semana;
`computeProgramInstantiationDates` a posiciona no primeiro slot livre ao instanciar.

### Snapshot do template

```ts
interface WorkoutTemplateSnapshot {
  sourceTemplateId?: string
  sourceTemplateVersion?: number
  name: string
  description?: string
  estimatedDurationMinutes?: number
  exerciseBlocks: WorkoutTemplateExerciseBlock[]  // cópia profunda, nunca por referência
  capturedAt: string
}
```

`createWorkoutTemplateSnapshot(template)` faz `JSON.parse(JSON.stringify(...))` dos blocos de exercício —
garantidamente sem compartilhar array/objeto com o template original. Testado explicitamente: mutar o
template depois de capturar o snapshot não altera o snapshot já salvo.

## Planner mínimo

```ts
interface PlannedWorkout {
  id: string
  date: string           // YYYY-MM-DD
  weekday: number         // 0-6
  name: string
  templateSnapshot: WorkoutTemplateSnapshot
  source?: PlannedWorkoutSource
  status: 'pending' | 'done' | 'skipped'
  isOptional: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

interface PlannedWorkoutSource {
  programId?: string
  programVersion?: number
  programWeekId?: string
  templateId?: string
  templateVersion?: number
}
```

`source` é contexto opcional só para analytics/rastreabilidade — **nunca** uma dependência viva. Apagar o
template ou o programa de origem não quebra `PlannedWorkout`s já criados.

**Escopo desta parte**: só estrutura de dados + listagem por data (`PlannedWeekSection.tsx` em `/plano`).
Sem execução real de treino a partir de uma sessão planejada, sem drag-and-drop, sem calendário visual
complexo — fica para uma parte futura da Sprint 20.

## Instanciação

Fluxo obrigatório em duas etapas:

1. **`previewProgramInstantiation(program, startDate)`** — só calcula. Retorna datas de cada sessão,
   conflitos com `PlannedWorkout`s já existentes, totais. Não persiste nada.
2. **`instantiateProgramIntoPlanner(program, startDate, strategy)`** — só deve ser chamada após o usuário
   confirmar a prévia. `strategy` é uma de:
   - `'keep'` — insere as novas sessões mantendo as existentes.
   - `'replace'` — remove as existentes no intervalo do programa antes de inserir.
   - `'skip'` — pula datas em conflito, insere o resto.
   - `'cancel'` — não faz nada.

### Cálculo de datas

`computeProgramInstantiationDates` posiciona cada sessão por prioridade: `dayIndex` (offset direto a partir
do início da semana) → `preferredWeekday` (dia correspondente àquela semana) → "dia flexível" (primeiro
slot de 0-6 ainda livre). Semana `N` começa `(weekNumber - primeiraSemana) * 7` dias após `startDate`.

### Data inicial

`getNextMonday()` / `getToday()` — exposição de helpers para as três opções da UI (próxima segunda-feira /
hoje / data personalizada), respeitando o fuso horário local do navegador.

## Regras de negócio

- **Editar programa nunca altera sessões já instanciadas.** Cada `PlannedWorkout` guarda seu próprio
  `templateSnapshot` — independente do programa que o gerou.
- **Duplicar semana** (`duplicateProgramWeek`) gera novos IDs de semana e sessão, número de semana seguinte
  ao maior existente, preserva snapshots via cópia profunda.
- **Duplicar programa** (`duplicateTrainingProgram`) — mesmo princípio, aplicado a todas as semanas.
- **Avisos estruturais são neutros.** `getTrainingProgramStructuralAlerts` sinaliza 3+ sessões no mesmo dia,
  5+ dias consecutivos com treino, sessão sem exercícios — nunca bloqueia salvamento, nunca qualifica o
  programa como "bom" ou "ruim".
- **Programa vazio é rascunho válido.** `validateTrainingProgram` permite `weeks: []`.

## Integração com ciclos

`ProgramInstantiationDialog.tsx` oferece "Criar novo ciclo de treino a partir deste programa" — chama
`createCycle` de `training-cycles.ts` com `plannedWeeks: program.weeks.length`. Segue o mesmo princípio dos
ciclos existentes: guarda só contexto (nome, data, duração planejada), nunca cria dependência viva entre
ciclo e programa. Se já existir um ciclo ativo, a criação é recusada com mensagem explícita, sem impedir a
instanciação em si.

## UI

- `src/components/programs/ProgramLibrary.tsx` — rota `/programas`.
- `src/components/programs/ProgramEditorWizard.tsx` — wizard de 4 passos sobre `Stepper.tsx`: Informações →
  Semanas iniciais → Sessões → Revisão. Usado tanto para criar quanto para editar (mesmo componente,
  seguindo o princípio de não duplicar editores).
- `src/components/programs/ProgramWeekEditor.tsx` — dias da semana como seções, sessão adicionada via
  `ProgramSessionPicker`, movida para outro dia por seletor (sem drag-and-drop), semana duplicável.
- `src/components/programs/ProgramSessionPicker.tsx` — escolher template captura snapshot imediatamente;
  também permite criar uma sessão "sem template" (estrutura vazia).
- `src/components/programs/ProgramSummary.tsx` — estatísticas (semanas, sessões, dias de descanso médios,
  templates usados) + avisos estruturais.
- `src/components/programs/ProgramInstantiationDialog.tsx` — data inicial, prévia, resolução de conflito,
  criação opcional de ciclo.
- `src/components/plano/PlannedWeekSection.tsx` — seção do Planner mínimo dentro de `/plano` (aba Semana).

## Exportação

`exportTrainingProgramMarkdown(program)` gera Markdown com semanas e sessões agrupadas por dia.

## Backup e reset

- Chaves `lrpg-fit:training-programs` e `lrpg-fit:planned-workouts` incluídas em `STORAGE_KEYS`/
  `ARRAY_KEYS` de `src/lib/backup.ts`.
- Reset granular via `resetTrainingPrograms()`, exposto em Configurações
  (`TemplatesProgramsResetSection.tsx`) — não apaga o Planner nem ciclos.

## Testes

- `src/lib/training-programs.test.ts` (19 testes)
- `src/lib/planned-workouts.test.ts` (8 testes)
- `src/lib/program-instantiation.test.ts` (16 testes) — inclui prova explícita de que editar o programa
  depois de instanciar não afeta as sessões já criadas no Planner.

## Extensões futuras (não implementadas nesta parte)

- Execução real de treino a partir de uma `PlannedWorkout`.
- Drag-and-drop no editor semanal e no Planner.
- Notificação "existe uma versão mais recente deste template/programa" ao abrir uma sessão instanciada.
- Múltiplos programas ativos simultaneamente por ciclo.
- Progressão planejada, blocos de treinamento, deload — próximas partes da Sprint 20.
