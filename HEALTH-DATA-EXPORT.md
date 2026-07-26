# Health Data — Export, Round-Trip & Format Adapters (Sprint 30 Parte 3)

Complementa `HEALTH-DATA-IMPORT.md` (pipeline de importação, inalterado) com
o lado inverso: exportar os mesmos registros de volta para JSON/CSV, de um
jeito que o próprio app consiga reimportar.

## Fluxo

```
Health Data (+ peso via Body Progress)
→ filtros (métrica, fonte, período, incluir peso)
→ getHealthRecordsForExport (consulta pura, ordenação determinística)
→ JSON canônico ou CSV canônico
→ prévia (contagem, métricas, fontes, tamanho estimado, nome do arquivo)
→ download (Blob → object URL → revoke)
→ reimportação pelo pipeline JÁ EXISTENTE (parseHealthDataJsonImport /
  parseHealthDataCsvImport → buildHealthImportPreview → applyHealthImportRecords)
```

Não existe uma rota de restore paralela: o arquivo exportado passa pelo
mesmo parser, mesma prévia e mesma aplicação atômica que qualquer outro
JSON/CSV importado manualmente.

## Formato JSON canônico

```json
{
  "version": 1,
  "exportedAt": "2026-07-26T12:00:00.000Z",
  "filters": { "period": "30d", "includeWeight": true },
  "recordCount": 2,
  "records": [ /* HealthDataRecord[] completo */ ]
}
```

`version`/`exportedAt`/`filters`/`recordCount` são metadados extras que
`parseHealthDataJsonImport` **ignora** (só lê `version` e `records`) — por
isso o mesmo parser aceita tanto um arquivo de importação manual quanto um
gerado por este export, sem nenhuma mudança no parser.

## Formato CSV canônico

Cabeçalho (`canonical-csv.ts`):

```
metric,value,unit,recordedAt,startAt,endAt,source,externalId,quality,metadata
```

As 8 primeiras colunas são exatamente `CANONICAL_COLUMNS` de `import-csv.ts`
— o arquivo é reconhecido como canônico por `inspectCsvHeader()` e pula o
wizard de mapeamento ao reimportar. `quality` e `metadata` são colunas
**extras, informativas**: o parser de importação não as lê, então **não são
restauradas** ao reimportar via CSV. Para preservar `metadata` num
round-trip completo, use o formato JSON.

## Segurança de CSV

Dois cuidados independentes (`csv-safety.ts`):

1. **Escaping RFC-4180** — aspas, vírgula, ponto e vírgula, quebra de linha.
2. **Neutralização de formula injection** — reaproveita
   `sanitizeCsvTextField` (já existente em `import-mapping/helpers.ts`,
   Sprint 30 Parte 1): um campo textual começando com `=`, `+`, `-`, `@`,
   tab ou CR ganha um apóstrofo (`'`) na frente. **Nunca** aplicado a campos
   numéricos — um peso `-5` (hipotético) continua `-5`, nunca `'-5`.

## Filtros

`HealthExportFilters` (`export/types.ts`): `metrics[]`, `sources[]`,
`period` (mesmo vocabulário `AnalyticsPeriod` do resto do app),
`customRange`, `includeWeight`. `getHealthRecordsForExport` aplica os
filtros e ordena deterministicamente por `recordedAt → metric → source →
externalId` — a mesma exportação, com os mesmos filtros, produz sempre o
mesmo arquivo byte a byte (exceto `exportedAt`).

## Format adapters

`export/adapters.ts` consolida as três formas de entrada já existentes
atrás de uma interface única (`HealthImportFormatAdapter`), sem reimplementar
nenhum parser:

| Adapter | Detecta | Delega para |
|---|---|---|
| `canonical-json` | JSON `{version, records}` | `parseHealthDataJsonImport` |
| `canonical-csv` | CSV cujo cabeçalho já resolve 100% (`inspectCsvHeader`) | `parseHealthDataCsvImport` |
| `mapped-csv` | Qualquer CSV com cabeçalho, exige um `HealthImportMapping` explícito | `applyMappingToCsv` |

`detectHealthImportAdapter()` tenta nessa ordem e nunca importa sozinho —
só decide o caminho de parsing. A UI de importação (`HealthDataImportPanel.tsx`)
não foi refatorada para usar esta camada: sua lógica inline já é
funcionalmente idêntica e não tinha cobertura de teste própria — o risco de
regressão numa tela já em produção não se justificava só por simetria
arquitetural. Os adapters existem, são testados (`adapters.test.ts`) e ficam
disponíveis para uma consolidação futura de baixo risco.

## Equivalência semântica (round-trip)

`compareHealthRecordSets()` (`export/round-trip.ts`) nunca exige igualdade
byte a byte — `id`/`importedAt` são sempre regenerados na reimportação e
sempre ignorados. Campos comparados: `metric`, `value` (normalizado),
`unit`, `recordedAt`, `startAt`, `endAt`, `source`, `externalId`, `quality`,
`metadata`.

**Peso é um caso especial.** Depois de reimportado, um registro de peso
vira um `BodyProgressEntry` e é re-derivado pelo adapter existente
(`body-progress-adapter.ts`), que sempre atribui `source: 'body_progress'`,
`quality: 'high'` e um novo `externalId` (o id do `BodyProgressEntry`) —
esses três campos são ignorados na comparação **somente para
`metric === 'weight'`**, senão todo round-trip de peso falharia por
desenho, não por bug.

## Testes

- `filters.test.ts` — filtro por métrica/fonte/período/range custom/peso/
  vazio/ordenação.
- `csv-safety.test.ts` — escaping e neutralização de formula injection
  (`=`, `+`, `-`, `@`), sem afetar números negativos.
- `canonical-json.test.ts` / `canonical-csv.test.ts` — o arquivo gerado é
  aceito pelo parser de importação existente sem nenhuma mudança nele.
- `filenames.test.ts` — nome determinístico por formato/métrica/data.
- `adapters.test.ts` — detecção e parsing dos três adapters.
- `round-trip.test.ts` — equivalência semântica, incluindo o caso especial
  de peso.
- `preview.test.ts` — resumo antes do download.
- `end-to-end-round-trip.test.ts` — **o teste mais importante**: exercita o
  pipeline real (`parseHealthData*Import` → `buildHealthImportPreview` →
  `applyHealthImportRecords`) para JSON, CSV e peso via Body Progress,
  incluindo o cenário "sem duplicação" ao reimportar num perfil que já tem
  o mesmo registro.

## Limitações conhecidas

- CSV não preserva `metadata` na reimportação (o parser canônico de CSV não
  tem uma coluna `metadata` — ver acima). Use JSON quando isso importar.
- `HealthDataImportPanel.tsx` não foi migrado para os format adapters (ver
  seção acima) — decisão deliberada, não uma pendência técnica.
