# Sprint 27 — Adaptive Planning 2.0: From Coach Recommendation to Reviewable Plan Change

## Objetivo

Fechar o loop que a Sprint 26 deixou explicitamente aberto: o Coach detecta
padrões e sugere ações, mas nunca as executa. Esta sprint adiciona a camada
intermediária — proposta concreta, comparação antes/depois, aprovação
explícita, execução versionada e auditável — sem tornar o Coach num segundo
motor de decisão automática. Ver `ADAPTIVE-PLANNING.md` para a visão geral
completa do domínio.

## 1. Auditoria (antes de qualquer código)

- Confirmado: `coach/decisions.ts` só persiste o STATUS da decisão do
  usuário (`nova/visualizada/ignorada/aceita/expirada`) — nenhum código
  existente transforma uma `CoachRecommendation` em mutação real.
- Encontrado um sistema paralelo mais antigo e pré-Coach,
  `adaptive-recommendations.ts` (Sprint 21), com a mesma convenção de
  "decide mas nunca aplica". Decisão: este domínio consome exclusivamente
  `CoachRecommendation` (fonte de recomendações atual), não estende o
  sistema antigo.
- Nenhum motor de diff genérico existia no repositório — cada domínio
  (`training-programs.ts`, `workout-templates.ts`) reimplementa seu próprio
  version-bump + clone completo. Esta sprint introduz o primeiro.
- Volume de exercício já é um campo escalar (`sets?: number`) em
  `WorkoutTemplateExercise` — compatível diretamente com o
  `VolumeChangeSnapshot` do spec, sem necessidade de modelar array de séries
  individuais no nível de planejamento.
- Convenção de persistência confirmada: `lib/*` + `localStorage` direto
  (nenhuma store Zustand nova é necessária ou apropriada aqui).

## 2. Implementado (`src/lib/adaptive-planning/`)

| Arquivo | O que faz |
|---|---|
| `types.ts` | Modelo completo — proposta, alvos, snapshots, diff, execução, auditoria |
| `proposal-diff.ts` | Motor de diff puro (volume/schedule/frequency/exercise) |
| `applicability.ts` | Valida se uma proposta ainda pode ser aplicada |
| `proposal-builder.ts` | Envelope genérico + caso `maintain_plan` |
| `volume-math.ts` | Redistribuição determinística de séries (rodízio) |
| `volume-proposals.ts` | `reduce_volume` / `increase_volume` |
| `reschedule-proposals.ts` | `reschedule_workout` |
| `recovery-proposals.ts` | `insert_recovery` (3 opções independentes) |
| `frequency-proposals.ts` | `adjust_frequency` |
| `exercise-replace-proposals.ts` | `replace_exercise` |
| `versioning.ts` | Metadados de transição de versão para o audit trail |
| `decisions.ts` | Aceitar/Rejeitar/Revisar depois/Expirar |
| `execution.ts` | Único ponto de mutação real — atômico e idempotente |
| `storage.ts` | Persistência (propostas + audit trail) |
| `coach-proposals.ts` | Ponte Coach → proposta (resolve o alvo real a partir da recomendação) |

UI: `CoachRecommendationCard.tsx` (botão "Criar proposta"),
`ProposalReviewModal.tsx` (before/after + warnings + decisão),
`RecentAdaptiveChangesSection.tsx` ("Ajustes recentes" no Dashboard),
`CoachAdaptiveResetSection.tsx` (reset granular em Configurações).

## 3. Decisões arquiteturais

- **Persistido vs. derivado**: proposta + audit trail são persistidos
  (`lrpg-fit:adaptive-plan-proposals`, `lrpg-fit:adaptive-plan-audit`).
  Snapshots dentro da proposta são compactos por design — nunca uma cópia
  do programa/treino inteiro.
- **Atomicidade**: cada tipo de proposta mapeia para exatamente UMA
  chamada de escrita já atômica (`updatePlannedWorkoutTemplateSnapshot`,
  `reschedulePlannedWorkout`) — sem transação multi-passo, então sem
  necessidade de rollback separado (ver `ADAPTIVE-VERSIONING.md`).
  `updatePlannedWorkoutTemplateSnapshot` é a única função nova adicionada a
  `planned-workouts.ts`.
- **Idempotência**: aplicar uma proposta `applied` de novo é um no-op
  bem-sucedido, nunca um erro nem uma segunda mutação.
- **Expiração**: `expireStaleProposals()` varre propostas abertas e expira
  as que passaram do prazo — nunca mexe em propostas já decididas.
- **Versionamento**: reaproveita o `version: number` que
  `training-programs.ts` já incrementa — não reimplementa, só expõe a
  checagem de staleness (`isProgramVersionStale`) para `applicability.ts` e
  `execution.ts` reusarem.
- **Compatibilidade conhecida**: `adjust_frequency` e `review_progression`
  não têm execução automática nesta versão — `TrainingProgram` não tem
  campo de frequência-alvo no schema atual, e o projeto não tem metas de
  carga estruturadas para prescrição de progressão. Ambos os builders
  existem e são totalmente testados (proposta + diff + applicability), só
  a mutação automática fica pendente.
- **UI ↔ dados reais**: nenhuma regra do Coach hoje emite uma ação
  apontando para um `PlannedWorkout` específico (ações de volume/recovery
  usam `{ kind: 'planner' }` sem id). `coach-proposals.ts` resolve isso
  usando a próxima sessão pendente do Planner a partir de hoje — heurística
  documentada, não uma limitação escondida.

## 4. Testes

15 arquivos de teste novos em `src/lib/adaptive-planning/` + 4 novos casos
em `planned-workouts.test.ts` (para `updatePlannedWorkoutTemplateSnapshot`)
+ regressão em `program-instantiation.test.ts` (flake corrigido). Cobertura:
diff engine (4 kinds + mismatched/none), applicability (todos os motivos de
bloqueio/warning), cada builder especializado (sucesso + alvo inelegível +
entrada degenerada), execução (sucesso por tipo, idempotência, falha segura
sem mutação parcial, tipos não suportados), decisões (transições de status +
expiração), e a ponte Coach→proposta (incluindo regressão fixada na palavra
exata usada pela única regra `volume` real do Coach).

## 5. QA manual (browser real, dev server)

- Seedado um `PlannedWorkout` pendente real + usada a recomendação
  `Coach.Volume.Imbalance` real já presente nos dados de desenvolvimento.
- Fluxo completo testado por interação real: expandir card → "Criar
  proposta" → modal com diff correto (`Supino Reto: 4 → 3`, `Peito: 16 → 14`)
  → "Aceitar e aplicar" → modal fecha → `PlannedWorkout` real mutado no
  `localStorage` → proposta `applied` → 2 entradas no audit trail →
  "Ajustes recentes" no Dashboard renderiza ambas.
- **Bug real encontrado e corrigido durante este QA**: a heurística de
  reduzir vs. aumentar volume não reconhecia a única frase real usada pela
  regra `Coach.Volume.Imbalance` ("Redistribua parte do volume de X..."),
  então "Criar proposta" não gerava nada para a única recomendação de
  volume que o Coach realmente produz. Corrigido tratando
  redistribuição-para-fora-do-grupo como redução, com teste de regressão
  fixado na frase exata.
- Settings: nova seção de reset ("🧭 Apagar Coach e ajustes adaptativos")
  confirmada renderizando e cancelando corretamente; as duas novas chaves
  aparecem no painel de status de armazenamento.
- Zero erros de console em ambos os fluxos.
- **Pendências conscientes**: só o fluxo de volume foi exercitado
  end-to-end no browser (é o caminho de maior risco — o único que muta
  dado real); reagendamento/substituição/frequência foram verificados só
  por teste automatizado, não por interação manual real; sem matriz de
  breakpoints (mobile/tablet) para o novo modal; sem leitor de tela real.

## 6. Gates

```
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1195/1195 (incluindo o flake pré-existente estabilizado)
Build:     ✅
```

## 7. Commits

- `fix: stabilize program instantiation test`
- `feat: add adaptive planning proposal foundation (Sprint 27 part 1)`
- `feat: add volume recovery and rescheduling proposals (Sprint 27 part 2)`
- `feat: add exercise frequency and versioned plan changes (Sprint 27 part 3)`
- `feat: add adaptive proposal execution and decision flow (Sprint 27 part 4a)`
- `feat: add adaptive proposal execution and review flow (Sprint 27 part 4b)`

Nada pushado automaticamente.

## 8. Fora de escopo (confirmado)

IA generativa, Coach conversacional, integrações de saúde externas,
nutrição/CalorieFlow, cloud sync, colaboração/compartilhamento, editor
completo de programa novo — nenhum destes foi tocado.

## 9. Próximo passo recomendado

Com o loop completo (recomendação → proposta → aplicação → auditoria) em
produção, a decisão entre **Sprint 28 — Health Data Foundation** ou
**Sprint 28 — Adaptive Planning Expansion** (cobrir `adjust_frequency`/
`review_progression` com execução real, expor a ponte Coach→proposta para
mais categorias) deve esperar uso real — ver qual gera valor primeiro.
