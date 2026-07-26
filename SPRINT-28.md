# Sprint 28 — Health Data Foundation: Unified Local Health Signals

## Objetivo

Criar uma camada local, neutra e agnóstica de fonte para dados de saúde
(passos, sono, peso, FC de repouso, calorias, atividade, bem-estar), pronta
para alimentar Readiness/Recovery/Fatigue/Coach sem duplicar cálculo, e
preparada — só no tipo, sem integração real — para futuras fontes de
plataforma (Health Connect, Samsung Health, Apple Health, Google Fit). Ver
`HEALTH-DATA-FOUNDATION.md` para a auditoria e as decisões arquiteturais
completas.

Dividida em 4 partes (ver seção "Divisão recomendada" do prompt original):
Parte 1 (schema/validação/storage) — **concluída nesta execução**; Partes
2–4 (entrada manual/import, agregação/qualidade/baseline,
integrações/backup/QA) — pendentes, ver §4.

## 1. Auditoria

Ver `HEALTH-DATA-FOUNDATION.md` §1 para o relatório completo. Resumo:
nenhum dado de saúde objetivo (passos, FC, sono medido) existe hoje — só
peso (`body-progress.ts`) e bem-estar subjetivo (`readiness-check-ins.ts`).
Nenhum `src/lib/health-data/` existia. Nenhuma importação JSON/CSV genérica
existia. Persistência de todo domínio é `localStorage` + array único,
exceto fotos (único uso de IndexedDB).

## 2. Implementado (Parte 1)

`src/lib/health-data/`: `types.ts`, `validation.ts`, `normalization.ts`,
`quality.ts`, `deduplication.ts`, `storage.ts`, `body-progress-adapter.ts`,
`queries.ts`, `index.ts` (barrel). Ver `HEALTH-DATA-SCHEMA.md` para o
modelo completo e `HEALTH-DATA-QUALITY.md` para as regras de
validação/qualidade.

61 testes novos cobrindo: validação por métrica (faixas, sono
invertido/inconsistente, timestamps), normalização de unidade (kg/lb,
km/m/mi, min/h/s), deduplicação (externalId, metric+source+recordedAt,
hash, fontes diferentes), qualidade por registro, CRUD/import de storage
(incl. rejeição atômica — nada é persistido se o input for inválido), e o
adapter de Body Progress (read-only, sem duplicar peso).

## 3. Decisões arquiteturais

- **Peso**: Body Progress continua a única fonte de verdade; Health Data
  deriva registros sob demanda via `body-progress-adapter.ts`, nunca
  persiste peso próprio.
- **Armazenamento**: `localStorage` (chave `lrpg-fit:health-data-records`),
  consistente com o resto do projeto — não IndexedDB, volume esperado é
  pequeno.
- **Deduplicação**: nunca depende do `id` gerado na criação/importação;
  usa `source+externalId` → `metric+source+recordedAt` → hash como
  fallback em cascata.
- **Qualidade**: nível + razões, nunca um score único; calculada por
  registro individual nesta parte (conflito entre fontes fica para a
  Parte 3, que opera sobre o conjunto de registros de um dia).
- **Ainda não integrado a `backup.ts`**: decisão consciente de não tocar
  `STORAGE_KEYS`/`ARRAY_KEYS` nesta parte — entra na Parte 4 junto com
  restore/reset, para manter o diff desta parte revisável e sem misturar
  domínios (backup) que ainda não têm o resto do fluxo (import, agregação)
  implementado.

## 4. Pendências conscientes (próximas partes desta sprint)

- **Parte 2** — UI de entrada manual (Configurações ou seção "Saúde"),
  importação JSON/CSV com preview (válidos/duplicados/inválidos),
  atomicidade de importação (parse → validate → normalize → dedupe →
  preview → confirm → persist).
- **Parte 3** — `DailyHealthSummary` (agregação diária derivada, não
  persistida), motor de conflito entre fontes por métrica, baseline
  (mediana/média com amostra mínima) e tendências simples.
- **Parte 4** — adapters de leitura para Readiness/Recovery/Fatigue/Coach
  (sinais adicionais, sem alterar peso de score existente sem auditoria
  separada), `backup.ts`/`STORAGE_KEYS`, restore com deduplicação, reset
  granular, QA manual completo (5 fluxos do prompt original), mobile,
  acessibilidade.

## 5. Gates (Parte 1)

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1256/1256 (1195 + 61 novos)
Build:     ✅
```
