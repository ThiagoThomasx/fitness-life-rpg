# Health Data Backup, Restore & Reset (Sprint 28 Parte 4)

## Chave persistida

`lrpg-fit:health-data-records` (array de `HealthDataRecord`) — a única
chave de Health Data que existe. Nunca há uma segunda chave: summaries
diários, baselines, tendências e conflitos são sempre derivados sob
demanda por `health-data/analytics-queries.ts`, nunca persistidos.

## Backup (`backup.ts`)

- `'lrpg-fit:health-data-records'` está em `STORAGE_KEYS` e em
  `ARRAY_KEYS` (validação estrutural: precisa ser um array antes de
  qualquer escrita).
- `BACKUP_VERSION` **não foi incrementada** nesta parte. A chave é tratada
  exatamente como qualquer chave nova/ausente já era: se um backup não a
  tem (backup anterior à Sprint 28), ela entra em `skippedKeys` e o restore
  segue normalmente — sem erro, sem estado parcial.
- `exportBackup()` inclui a chave automaticamente (é só mais uma entrada em
  `STORAGE_KEYS`) — nenhuma lógica especial foi necessária.

## Restore (`importBackup`)

Estratégia: **substituição atômica**, igual a todas as outras chaves —
não há merge/deduplicação no restore (isso já acontece na entrada dos
dados, antes de qualquer registro ser persistido — ver
`health-data/deduplication.ts`). Igual às demais chaves:

1. Validação estrutural de **todas** as chaves antes de escrever qualquer
   uma (atomicidade — um backup parcialmente corrompido não altera nada).
2. Snapshot do estado atual antes de escrever.
3. Se qualquer escrita falhar (ex.: quota do `localStorage`), rollback
   completo do snapshot.

Restore é idempotente: importar o mesmo backup duas vezes produz o mesmo
conteúdo (testado em `backup.test.ts`).

## Migração

Backups de qualquer sprint anterior à 28 (Parte 1, 2 ou 3, se existirem) e
qualquer backup anterior à Sprint 28 inteira restauram normalmente — a
ausência da chave simplesmente não gera nenhum registro de saúde
(`getHealthDataRecords()` retorna `[]`), nunca um erro.

## Reset granular

`health-data/storage.ts` → `resetHealthData()`:

```ts
export function resetHealthData(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(HEALTH_DATA_RECORDS_KEY)
}
```

- Remove **só** os registros de Health Data.
- **Nunca** apaga: treinos, Readiness subjetivo, Body Progress. O peso
  permanece disponível normalmente após o reset — ele nunca é duplicado em
  Health Data, é sempre lido sob demanda de `lrpg-fit:body-progress`
  (`body-progress-adapter.ts`).
- Nenhum cache derivado para invalidar (nada além dos registros brutos é
  persistido).
- Coach/Fatigue recalculam automaticamente sem Health Data na próxima
  chamada (nenhuma regra `Coach.Health.*` dispara sem os padrões
  correspondentes de `analytics/fatigue.ts`, que por sua vez não disparam
  sem registros).

UI: `components/settings/HealthDataResetSection.tsx`, wireada em
`app/(dashboard)/configuracoes/page.tsx` (`panel === "health-data-reset-confirm"`)
seguindo exatamente o mesmo padrão de confirmação por texto ("resetar") das
demais seções de reset.

## Reset completo (`resetAllData`)

Já cobre Health Data automaticamente — `resetAllData()` itera
`STORAGE_KEYS`, que agora inclui `lrpg-fit:health-data-records`. Nenhuma
mudança adicional foi necessária.

## Testes

`backup.test.ts` — round-trip com Health Data presente, restore de backup
antigo sem a chave, idempotência do restore, rejeição de payload com valor
não-array (atomicidade), `resetAllData` removendo a chave.

`health-data/storage.test.ts` — `resetHealthData()` remove todos os
registros e é seguro chamar quando não há nada para resetar.
