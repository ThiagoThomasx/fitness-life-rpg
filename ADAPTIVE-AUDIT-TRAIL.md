# Adaptive Audit Trail (Sprint 27)

## Persistência (`src/lib/adaptive-planning/storage.ts`)

Duas chaves novas em `localStorage`, seguindo o mesmo padrão `lib/*` do
resto do repositório (sem Zustand — ver auditoria):

| Chave | Conteúdo |
|---|---|
| `lrpg-fit:adaptive-plan-proposals` | `AdaptivePlanProposal[]` — inclui o status/decisão atual |
| `lrpg-fit:adaptive-plan-audit` | `AdaptiveAuditEntry[]` — append-only |

## Modelo

```ts
interface AdaptiveAuditEntry {
  id: string
  proposalId: string
  recommendationId: string
  ruleId: string
  action: 'created' | 'accepted' | 'rejected' | 'review_later' | 'applied' | 'failed' | 'expired'
  targetSummary: string
  changesSummary: string[]      // formatChangesAsText(proposal.changes)
  previousVersion?: number
  newVersion?: number
  result?: 'success' | 'failure'
  errorMessage?: string
  createdAt: string
}
```

Não persiste métricas derivadas (nada que possa ser recomputado a partir da
proposta em si) — só o suficiente para reconstruir "o que aconteceu, quando,
e por quê".

## Quem escreve o quê

- `decisions.ts` grava `accepted` / `rejected` / `review_later` / `expired`
  — nunca `applied`/`failed` (isso é execução, não decisão).
- `execution.ts` grava `applied` (com `result: 'success'`) ou `failed` (com
  `result: 'failure'` + `errorMessage`) — o único lugar que grava esses dois.

## Append-only

`appendAdaptivePlanAuditEntry` sempre insere no topo, nunca edita nem remove
uma entrada existente. A única forma de esvaziar o trail é
`resetAdaptivePlanAuditTrail()` (reset explícito do usuário) ou
`resetAdaptivePlanning()` (reset combinado — ver seção de Reset abaixo).

## Backup / Restore

Ambas as chaves entraram em `backup.ts` `STORAGE_KEYS` + `ARRAY_KEYS` desde a
Parte 1 — `exportBackup`/`importBackup`/`resetAllData` já cobrem o domínio
inteiro sem nenhum código adicional. `importAdaptivePlanProposals` e
`importAdaptivePlanAuditTrail` (em `storage.ts`) seguem o mesmo padrão de
validação estrutural + skip de duplicatas usado por
`importWorkoutTemplates`/`importTrainingPrograms`.

## Reset granular

`resetAdaptivePlanning()` limpa propostas + audit trail juntos. Reset nunca
reverte uma mudança já aplicada — uma proposta `applied` já é parte do
programa/planner atual; apagar o registro da proposta não desfaz a mutação,
só remove o rastro de como ela aconteceu (mesma regra de qualquer reset
granular no app: reset é sobre o registro da decisão, não sobre o resultado
dela).
