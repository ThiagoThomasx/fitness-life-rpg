# Health Data Backup, Restore & Reset (Sprint 28 Parte 4; presets — Sprint 30 Parte 4)

## Chaves persistidas

- `lrpg-fit:health-data-records` (array de `HealthDataRecord`) — os
  registros de saúde propriamente ditos.
- `lrpg-fit:health-import-presets` (array de `HealthImportMapping`) —
  mapeamentos de importação salvos (Sprint 30 Parte 1/2). Adicionada ao
  backup na Sprint 30 Parte 4 (ver seção "Presets de importação" abaixo).

Nunca há uma terceira chave: summaries diários, baselines, tendências e
conflitos são sempre derivados sob demanda por
`health-data/analytics-queries.ts`, nunca persistidos. Nenhuma preferência
de import/export (último formato usado, delimiter, timezone) é persistida
hoje.

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
`STORAGE_KEYS`, que agora inclui `lrpg-fit:health-data-records` e
`lrpg-fit:health-import-presets`. Nenhuma mudança adicional foi necessária.

## Presets de importação (Sprint 30 Parte 4)

`lrpg-fit:health-import-presets` está em `STORAGE_KEYS` e em `ARRAY_KEYS`,
mas com uma diferença importante em relação a todas as outras chaves: um
preset individualmente inválido **não bloqueia o restore inteiro**. Antes
de qualquer validação estrutural, `importBackup` filtra o array de presets
com `isValidStoredMapping` (reaproveitada de `import-mapping/presets.ts`),
removendo entradas malformadas e contando quantas foram descartadas em
`ImportResult.invalidPresetsSkipped`. O restante do backup (incluindo
presets válidos e todas as outras chaves) segue o fluxo normal de
atomicidade — presets são o único domínio com essa tolerância granular.

Nenhum preset é aplicado automaticamente durante um restore: restaurar a
chave apenas grava o array de presets de volta em `localStorage`, nunca
dispara uma importação de arquivo.

Reset granular equivalente ao de Health Data:
`import-mapping/presets.ts` → `resetHealthImportPresets()`, wireado em
`components/settings/HealthImportSettingsResetSection.tsx`
(`panel === "health-import-settings-reset-confirm"` em
`configuracoes/page.tsx`). Apaga só os presets — nunca os registros de
saúde já importados por eles. `resetHealthData()` e
`resetHealthImportPresets()` são mutuamente isolados (testado nos dois
sentidos em `storage.test.ts` e `presets.test.ts`).

## Testes

`backup.test.ts` — round-trip com Health Data presente, restore de backup
antigo sem a chave, idempotência do restore, rejeição de payload com valor
não-array (atomicidade), `resetAllData` removendo a chave.

`health-data/storage.test.ts` — `resetHealthData()` remove todos os
registros, é seguro chamar quando não há nada para resetar, e nunca toca
`lrpg-fit:health-import-presets`.

`health-data/import-mapping/presets.test.ts` — `resetHealthImportPresets()`
nunca toca `lrpg-fit:health-data-records`.
