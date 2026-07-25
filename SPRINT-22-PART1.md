# Sprint 22 — Parte 1: Exercise Intelligence Engine Foundation

## Auditoria (resumo — ver relatório completo na sessão)

- **Identidade do exercício**: `Exercise`/`CustomExercise` (`src/types/database.ts`,
  `src/lib/custom-workouts.ts`) compartilham um único modelo runtime. IDs de
  biblioteca são estáticos e estáveis; IDs customizados usam `cx-${Date.now()}`
  (colisão teórica pré-existente, fora de escopo). Templates podem referenciar
  exercícios só pelo nome (`exerciseId` opcional) — por isso o motor nunca
  agrupa só por nome quando há ID, mas usa nome normalizado como vínculo de
  substituição (ver abaixo).
- **Pipeline de execução**: já mapeado em `active-workout.ts` (Sprint 20 Parte
  4A/4B) — `PlannedExecutionExercise` → `ActiveSet` (`useSessionStore.ts`) →
  `ExerciseRecord` (`workout-history.ts`). O único gap real era a fronteira
  `ActiveSet` → `ExerciseRecord` dentro de `finishWorkout()`
  (`sessao/page.tsx`), que descartava `source`/`plannedExerciseId`/`substitution`.
- **Motores existentes reaproveitados, não duplicados**: `calculateVolumeKg` e
  `calculateEstimated1RM` (`exercise-records.ts`) continuam sendo a única
  fórmula de volume/1RM do projeto — `exercise-intelligence.ts` as importa em
  vez de reimplementar. `exercise-records.ts` (PR por sessão) e
  `workout-intelligence.ts` (status/recomendação de progressão) continuam
  como motores independentes e intocados, por design (mesma decisão do
  Changelog anterior).
- **Substituição**: `ActiveExerciseSubstitution` e `substituteExercise()` já
  existiam completos desde a Sprint 20 Parte 4B, incluindo revert. O único
  problema era a persistência final — corrigido nesta parte.
- **Backup/reset**: `lrpg-fit:workout-history` já está em `STORAGE_KEYS`/
  `ARRAY_KEYS` (`backup.ts`). Os novos campos são opcionais dentro do mesmo
  registro já existente — nenhuma chave nova, nenhuma migração, nenhuma
  mudança em `backup.ts` foi necessária. Reset granular não foi alterado
  porque não há novo storage a cobrir.

## Escopo implementado

### Bloco B — Persistência de substituição
- `ExerciseRecord` (`workout-history.ts`) ganhou `source?`, `plannedExerciseId?`
  e `substitution?` (reaproveita `ActiveExerciseSource`/`ActiveExerciseSubstitution`
  de `active-workout.ts` — nenhum tipo novo paralelo). Todos opcionais:
  histórico salvo antes desta sprint continua válido sem eles.
- `finishWorkout()` (`sessao/page.tsx`) agora propaga esses três campos de
  `ActiveSet` para `ExerciseRecord`. Substituições revertidas antes de
  finalizar já chegam sem `substitution` (o `revertExerciseSubstitution` do
  store já limpa o campo) — nada adicional foi necessário para não gravar
  substituições desfeitas. Sessão cancelada/abandonada (`endSession()`) nunca
  chama `saveCompletedWorkout` — nada muda aqui.

### Bloco C/D/E/F — Exercise Intelligence Engine (`src/lib/exercise-intelligence.ts`, novo)
Motor puro, sem I/O além de ler `getWorkoutHistory()`. Nada é persistido —
tudo é recalculado sob demanda.

- **Normalização**: `normalizeExerciseExecutions(exerciseId)` →
  `NormalizedExerciseExecution[]`, achatando `CompletedWorkout[]` por
  exercício com proveniência (programa/semana/substituição) já resolvida.
- **Histórico**: `getExerciseHistorySummary`, `getExerciseTimeline`
  (`newest_first`/`oldest_first`).
- **Recordes**: `getExercisePersonalRecords` (maior carga, maiores reps,
  melhor série por volume, maior volume de sessão, mais séries numa sessão)
  e `detectNewExerciseRecords` (comparação pré-salvamento, mesmo contrato de
  `detectExercisePrs`). Empate = mantém o primeiro registro cronológico
  (`>` estrito, nunca `>=`).
- **Tendências**: `getExerciseTrends` — janela de 3 execuções vs. 3
  anteriores para carga/volume/reps (tolerância de ±5% = estável, mínimo de
  6 execuções); frequência usa uma janela de 28 dias por ser uma métrica de
  contagem-por-tempo, não uma série por execução.
- **Substituições**: `getExerciseSubstitutionInsights` (por exercício) e
  `getRecurringSubstitutions` (agregado global, usado pelas recomendações).

### Bloco G — Integrações
- **`recommendation-assembly.ts`**: `recurringSubstitutions` agora é
  preenchido com `getRecurringSubstitutions()` restrito à janela recente
  (mesma janela de 14 dias já usada para os outros sinais). A regra
  `review_exercise` (`adaptive-recommendations.ts`, já existia e já era
  testada) passa a poder disparar de verdade.
- **`planned-performed-comparison.ts`**: `ResolvedProgramExercise` ganhou
  `blockId` (o `WorkoutTemplateExerciseBlock.id` do snapshot), propagado por
  `resolveProgramSessionForWeek` e `resolvedExercisesFromPlannedWorkout`.
  `matchPlannedToPerformedExercises` ganhou um **Tier 0** antes do
  `exerciseId`: casa por `plannedExerciseId === blockId` — o único vínculo
  que sobrevive a uma substituição, já que o `exerciseId` muda. Isso resolve
  o problema descrito na spec (substituição virando "1 removido + 1
  adicionado"): agora vira um único `matched` com `wasSubstitution: true` e
  `substitutedFromExerciseName`. Histórico sem o vínculo (sessões antigas)
  cai nos tiers de nome/posição como antes — sem mudança de comportamento.
- **UI mínima** (`PlannedWorkoutComparisonView.tsx`): quando
  `wasSubstitution`, mostra "substituído de `<nome planejado>`" abaixo do
  nome do exercício realizado. Nenhuma página nova, nenhum redesenho.

## Decisões arquiteturais

- **Nada de novo persistido além da substituição em si.** Recordes,
  tendências, resumos e insights de substituição são 100% derivados —
  reprocessar o mesmo histórico produz o mesmo resultado (idempotência por
  construção, já que não há estado próprio).
- **Vínculo de substituição por nome normalizado, não por ID.** O exercício
  originalmente planejado pode não ter `exerciseId` de catálogo (templates
  aceitam texto livre) — `substitutionsOut`/`getRecurringSubstitutions`
  usam `normalizeExerciseName` (já existente em
  `planned-performed-comparison.ts`, reaproveitado em vez de duplicado).
- **`blockId` como vínculo estável planejado↔executado.** É o único
  identificador que não muda quando o exercício é trocado — por isso virou a
  base do Tier 0 de matching, em vez de tentar inferir substituição por
  heurística de nome/posição.
- **PR de "melhor série" = maior `carga × repetições` de uma série.** Mesma
  fórmula de volume do projeto, aplicada a uma série em vez da sessão —
  critério explícito e documentado (spec pedia uma regra clara, não
  arbitrária).
- **Tendência de frequência é uma métrica à parte** (contagem em janela de
  28 dias, não uma série por execução como carga/volume/reps) — não force
  a mesma janela de "3 vs 3 execuções" numa métrica que é inerentemente
  temporal.

## Testes

- `exercise-intelligence.test.ts` (novo): 23 casos — normalização,
  histórico, timeline, recordes (incluindo empate e bodyweight), detecção de
  novo recorde (primeira vez, delta, empate), tendências (insuficiente,
  crescente, estável), insights de substituição e agregação global.
- `planned-performed-comparison.test.ts`: +2 casos (matching por vínculo de
  substituição; matching planejado normal não marca `wasSubstitution`) e 1
  ajuste (snapshot agora inclui `blockId`).
- Suíte completa: **905 passando, 1 falha pré-existente e não relacionada**
  (`training-load.test.ts > counts free sessions all time`, já documentada
  na Sprint 21 — não tocado nesta parte).

## Gates

```text
Lint:      ✔ sem erros/avisos
Typecheck: ✔ sem erros
Tests:     905 passando / 1 falha pré-existente (training-load.ts, não relacionada)
Build:     ✔ next build concluído
```

## Arquivos principais

- Novo: `src/lib/exercise-intelligence.ts`, `src/lib/exercise-intelligence.test.ts`
- Alterado: `src/lib/workout-history.ts`, `src/app/(dashboard)/sessao/page.tsx`,
  `src/lib/training-blocks.ts`, `src/lib/planned-performed-comparison.ts`,
  `src/lib/planned-performed-comparison.test.ts`, `src/lib/recommendation-assembly.ts`,
  `src/components/plano/PlannedWorkoutComparisonView.tsx`
- Doc: `EXERCISE-INTELLIGENCE.md` (novo — referência da API do motor)

## Pendências conscientes

- Nenhuma página `/exercicios/[id]` foi criada (fora de escopo desta parte,
  por definição da spec — pertence à Parte 2).
- Insights (`/insights`) ainda não consome `exercise-intelligence.ts`
  diretamente — a API pública está pronta e documentada, mas a integração
  visual (exercícios mais realizados, sem execução recente, mais
  substituídos etc.) fica para a Parte 2, junto com a página de detalhe.
- Gamificação: nenhum badge/evento novo foi adicionado nesta parte —
  `detectNewExerciseRecords` está pronto para alimentar celebrações futuras,
  mas isso não foi conectado a XP/badges aqui (a spec permite adiar quando a
  integração exigiria expandir escopo de gamificação).
- QA mobile/acessibilidade formal não foi re-executado nesta parte (mudança
  de UI é aditiva e pequena — um `<div>` de texto condicional na mesma
  estrutura já testada na Sprint 21 Parte 2).

## Próximo passo recomendado

Sprint 22 Part 2 — Exercise Detail Experience, consumindo
`exercise-intelligence.ts` para timeline visual, recordes, tendências e
substituições por exercício.
