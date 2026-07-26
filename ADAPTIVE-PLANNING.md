# Adaptive Planning 2.0 — visão geral (Sprint 27)

## O que este domínio faz

Transforma uma `CoachRecommendation` (ver `COACH-ENGINE.md`) numa proposta
concreta, revisável e versionada — nunca numa mutação silenciosa. Fluxo
completo:

```
Coach Recommendation
→ Adaptive Proposal        (proposal-builder.ts + builders especializados)
→ Before / After Preview    (proposal-diff.ts)
→ User Review               (UI — CoachRecommendationCard / ProposalReviewModal)
→ Explicit Approval         (decisions.ts — acceptProposal)
→ Versioned Plan Change     (execution.ts — applyProposal)
→ Audit Trail               (storage.ts — appendAdaptivePlanAuditEntry)
```

O Coach continua sendo a única fonte de recomendações — `src/lib/adaptive-planning/`
nunca recalcula sinais nem duplica regras, só traduz uma recomendação já
pronta. Existe um sistema mais antigo e paralelo,
`src/lib/adaptive-recommendations.ts` (pré-Coach, Sprint 21), que este domínio
não reaproveita nem estende — ele consome exclusivamente `CoachRecommendation`.

## Arquivos (`src/lib/adaptive-planning/`)

| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | Vocabulário compartilhado — proposta, alvos, snapshots, diff, execução, auditoria |
| `helpers.ts` | Ids, constantes (`MIN_SETS_PER_EXERCISE`) |
| `proposal-diff.ts` | Motor de diff puro (volume/schedule/frequency/exercise) |
| `applicability.ts` | Valida se uma proposta ainda pode ser aplicada |
| `proposal-builder.ts` | Envelope genérico da proposta + caso trivial `maintain_plan` |
| `volume-math.ts` | Redistribuição determinística de séries (redução/aumento) |
| `volume-proposals.ts` | Builders `reduce_volume` / `increase_volume` |
| `reschedule-proposals.ts` | Builder `reschedule_workout` |
| `recovery-proposals.ts` | Builder `insert_recovery` (3 opções independentes) |
| `frequency-proposals.ts` | Builder `adjust_frequency` |
| `exercise-replace-proposals.ts` | Builder `replace_exercise` |
| `versioning.ts` | Metadados de transição de versão para o audit trail |
| `decisions.ts` | Transições de status (aceitar/rejeitar/revisar depois/expirar) |
| `execution.ts` | Único lugar que muta programa/planner de verdade |
| `storage.ts` | Persistência (propostas + audit trail) |

## Tipos de proposta e cobertura de execução

| Tipo | Builder | Execução automática? |
|---|---|---|
| `reduce_volume` | `volume-proposals.ts` | Sim |
| `increase_volume` | `volume-proposals.ts` | Sim |
| `reschedule_workout` | `reschedule-proposals.ts` | Sim |
| `insert_recovery` | `recovery-proposals.ts` | Sim (mesma mutação de volume/schedule por baixo) |
| `replace_exercise` | `exercise-replace-proposals.ts` | Sim |
| `adjust_frequency` | `frequency-proposals.ts` | **Não** — `TrainingProgram` não tem campo de frequência-alvo nesta versão; a proposta é criada e revisável, mas `applyProposal` falha explicitamente em vez de inventar um campo de schema. Requer ajuste manual no Planner/Programa. |
| `review_progression` | — (não implementado nesta sprint) | **Não** — seção 18 do spec limita este tipo a "proposta de revisão"; sem metas de carga estruturadas no projeto, não há prescrição automática a gerar |
| `maintain_plan` | `proposal-builder.ts` | Trivial — nenhuma mutação |

## Segurança por padrão

- Nenhuma proposta muta dado nenhum sozinha — `applyProposal` exige
  `status === 'accepted'` (aprovação explícita do usuário via `acceptProposal`).
- `reduce_volume`/`increase_volume`/`insert_recovery`/`replace_exercise`/`reschedule_workout`
  nunca alteram sessões `done`/`cancelled` (guarda dupla: builder + applicability).
- Aplicar uma proposta já `applied` é um no-op bem-sucedido (idempotência) —
  nunca um erro, nunca uma segunda mutação.
- Falha em qualquer etapa marca a proposta como `failed` e registra no audit
  trail — nunca deixa estado parcialmente alterado (ver `ADAPTIVE-VERSIONING.md`
  para o argumento de atomicidade).

Ver `ADAPTIVE-PROPOSALS.md`, `ADAPTIVE-VERSIONING.md` e
`ADAPTIVE-AUDIT-TRAIL.md` para detalhes de cada camada.
