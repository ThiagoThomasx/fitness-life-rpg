# Health Data Foundation — Sprint 28

## Objetivo

Criar uma camada local, neutra e agnóstica de fonte para sinais de saúde
(passos, sono, peso, frequência cardíaca de repouso, calorias, atividade,
bem-estar), que os motores existentes (Readiness, Recovery, Fatigue
Analytics, Coach, Body Progress) podem consumir sem duplicar cálculo. Não
integra Health Connect/Samsung Health/Apple Health/Google Fit de verdade
nesta sprint — só prepara o tipo (`HealthDataSource`) para essas fontes.

Fluxo: fonte → validação → normalização → deduplicação → armazenamento
local → agregação diária (Parte 3) → Analytics/Readiness/Recovery/Coach
(Parte 4).

## 1. Auditoria (antes de qualquer código)

- **Sono**: só existe como `sleepQuality` (1-5, subjetivo) e `sleepHours`
  (autorreportado) dentro de `WorkoutReadinessCheckIn`
  (`lib/readiness-check-ins.ts`). Nenhum dado de dispositivo.
- **Peso**: única fonte é `BodyProgressEntry.weightKg`
  (`lib/body-progress.ts`, chave `lrpg-fit:body-progress`). Nenhum outro
  campo de peso em todo o projeto.
- **Passos / FC de repouso / HRV**: não existem como dado medido em nenhum
  lugar — só uma missão gamificada "steps-5k" (toggle manual, não medição).
- **Calorias**: só ingestão nutricional (`lib/nutrition.ts`); nenhuma
  caloria de atividade/gasto.
- **Wellness**: `wellness-trends.ts`, `wellness-associations.ts`,
  `wellness-overview.ts` já derivam tendências a partir do check-in de
  Readiness — não duplicam dado, só análise.
- **Readiness/Coach**: `workout-readiness.ts` já consome o check-in
  subjetivo; `coach/signals.ts` já usa `ReadinessStats` como sinal de
  entrada. Ou seja, bem-estar subjetivo **já é** um input do Coach — esta
  sprint não recria esse caminho, só adiciona um novo tipo de sinal
  (dados objetivos/importados) em paralelo.
- **Persistência**: todo domínio (exceto personagem/sessão/badges/rewards,
  que são stores Zustand) é um módulo `lib/*.ts` com array em uma única
  chave de `localStorage`. Único uso de IndexedDB no projeto é
  `body-progress-photo-db.ts` (fotos). Nenhum `src/lib/health-data/`
  existia antes desta sprint.
- **Backup**: `backup.ts` usa um allowlist explícito (`STORAGE_KEYS`) +
  classificação `ARRAY_KEYS`/`OBJECT_KEYS`, validação estrutural mínima
  antes de qualquer escrita, snapshot + rollback em caso de falha. Novo
  domínio precisa entrar manualmente nessas listas (Parte 4).
- **Import**: não existe importação JSON/CSV genérica — só
  `importBackup`/`importCheckIns`/`importBodyProgressEntries`, todos no
  padrão `(raw: unknown[]) => { imported, skipped }`.

## 2. Decisões arquiteturais

- **Peso: fonte de verdade única.** Body Progress continua sendo a única
  store de peso. A Health Data Foundation nunca persiste peso próprio —
  `body-progress-adapter.ts` deriva `HealthDataRecord[]` sob demanda a
  partir de `BodyProgressEntry`, com `source: 'body_progress'`. Entrada
  manual de peso na futura UI de Saúde (Parte 2) deve gravar em
  `body-progress.ts`, nunca criar um segundo registro.
- **Armazenamento: `localStorage`, não IndexedDB.** Consistente com todos
  os domínios do projeto exceto fotos — volume esperado (poucos registros
  por métrica por dia) é ordens de magnitude menor que o que justificaria
  IndexedDB. Reavaliar se o volume real após uso (Sprint 29+) mostrar
  necessidade.
- **Uma chave, um array.** `lrpg-fit:health-data-records` — mesmo padrão de
  `body-progress`/`readiness-check-ins`. Resumo diário (`DailyHealthSummary`,
  Parte 3) não será persistido — é sempre derivado dos registros brutos.
- **Deduplicação sem depender de `id`.** Ordem: `source+externalId` →
  `metric+source+recordedAt` → hash determinístico dos campos principais
  (`deduplication.ts`). Reimportar o mesmo arquivo nunca duplica.
- **Qualidade não é um score único.** `computeRecordQuality` retorna um
  nível (`high|medium|low|unknown`) mais a lista de razões — nunca um
  número arbitrário.

## 3. Implementado (`src/lib/health-data/`) — Parte 1

| Arquivo | O que faz |
|---|---|
| `types.ts` | `HealthDataSource`, `HealthMetricType`, `METRIC_UNITS`, `HealthDataRecord`, `HealthDataQuality` |
| `validation.ts` | Faixas plausíveis por métrica, validação de input e de registro persistido/importado |
| `normalization.ts` | Conversão de unidade → unidade canônica, montagem do `HealthDataRecord` |
| `quality.ts` | Classificação de qualidade por registro (fonte, completude, proximidade de limite) |
| `deduplication.ts` | Chave de identidade determinística + deduplicação de lote |
| `storage.ts` | Persistência (`localStorage`), CRUD e importação de registros já validados |
| `body-progress-adapter.ts` | Deriva registros de peso a partir de Body Progress (read-only) |
| `queries.ts` | `getHealthRecordsByMetric`, `getLatestHealthMetric`, `getHealthRecordsForPeriod` |

Ver `HEALTH-DATA-SCHEMA.md` para o modelo completo e `HEALTH-DATA-QUALITY.md`
para as regras de validação/qualidade.

## 4. Fora de escopo desta sprint

Health Connect/Samsung Health/Apple Health/Google Fit reais, wearable sync,
sync em background, permissões nativas, cloud sync, backend, conta,
criptografia, diagnóstico, prescrição médica, Coach conversacional,
nutrição/CalorieFlow, ingestão por foto, notificações push.

## 5. Pendências (próximas partes desta sprint)

- **Parte 2** ✅ — entrada manual (UI), importação JSON/CSV com preview. Ver `SPRINT-28-PART2.md`, `HEALTH-DATA-IMPORT.md`, `HEALTH-DATA-MANUAL-ENTRY.md`.
- **Parte 3** — agregação diária, motor de conflito entre fontes, baseline/tendências.
- **Parte 4** — integração com Readiness/Recovery/Fatigue/Coach, backup/restore/reset, QA completo.

## 6. Atualização pós-Parte 2

A chave de deduplicação de peso foi ajustada para `metric+data` (ignorando
`source`) — Body Progress não tem conceito de fonte, então a chave
original (`metric+source+recordedAt`) permitiria reimportação duplicada de
peso. Ver `HEALTH-DATA-IMPORT.md` §"Deduplicação na importação". Além
disso, `createBodyProgressEntry` (`lib/body-progress.ts`) agora detecta e
reporta falha de escrita em `localStorage` — necessário para que a
importação atômica da Parte 2 consiga acionar rollback quando o peso
redirecionado falha ao persistir.
