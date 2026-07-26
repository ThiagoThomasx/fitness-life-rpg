# Health Data — Import Pipeline (Sprint 28 Parte 2)

## Fluxo

```
arquivo (JSON ou CSV)
→ parse (import-json.ts / import-csv.ts, via csv-parser.ts)
→ validação + normalização + qualidade (Parte 1, reaproveitadas sem alteração)
→ deduplicação (Parte 1, contra registros existentes + dentro do próprio arquivo)
→ prévia (import-preview.ts → HealthImportPreview)
→ confirmação explícita do usuário
→ persistência atômica (import-apply.ts)
→ resultado
```

Nenhum dado é persistido antes da confirmação explícita. Cancelar a prévia
não altera nada.

## Formato JSON canônico

```json
{
  "version": 1,
  "records": [
    {
      "metric": "steps",
      "value": 8450,
      "unit": "count",
      "recordedAt": "2026-07-26T20:00:00-03:00",
      "source": "json_import",
      "externalId": "example-001"
    }
  ]
}
```

`import-json.ts` (`parseHealthDataJsonImport`) só aceita esse schema — não
aceita objetos arbitrários como registro. Erros globais (JSON inválido,
`version` ausente/maior que a suportada, `records` ausente ou não é lista)
bloqueiam toda a prévia. Erros por registro (`metric`/`value`/`recordedAt`
ausentes ou inválidos, `source` desconhecida) descartam só aquele item —
`{index, error}` — sem impedir os demais. `source` default é `json_import`
quando ausente.

## Formato CSV

Colunas canônicas: `metric, value, unit, recordedAt, source, externalId,
startAt, endAt`. Aliases em português aceitos no cabeçalho: `Data` →
`recordedAt`, `Métrica` → `metric`, `Valor` → `value`, `Unidade` → `unit`
(mapeamento avançado de colunas arbitrárias está fora do escopo).

- `metric` é sempre obrigatória.
- `value` é obrigatória, **exceto** para `sleep_duration` quando
  `startAt`+`endAt` estão presentes — a duração é derivada do intervalo.
- `recordedAt` é obrigatória; se ausente e a linha tiver `endAt`/`startAt`
  (sono), é derivada deles.
- `source` default é `csv_import` quando a coluna está ausente/vazia.

`csv-parser.ts` é um tokenizador genérico próprio (nenhuma biblioteca de
CSV está instalada no projeto e o formato não justifica adicionar uma).
Suporta: BOM, CRLF/LF, campos entre aspas (com `""` escapado), delimitador
`,` ou `;` (detectado pela primeira linha), linhas em branco ignoradas.
Erros são reportados por linha (`index` = número da linha, 1-based,
contando o cabeçalho como linha 1) — uma linha inválida nunca bloqueia as
demais.

## Prévia (`HealthImportPreview`)

```ts
interface HealthImportPreview {
  fileKind: 'json' | 'csv'
  total: number
  valid: number         // prontos + duplicados (passaram na validação)
  invalid: number
  duplicates: number
  readyToImport: number // só estes serão persistidos ao confirmar

  validRecords: HealthDataRecord[]
  duplicateRecords: { record: HealthDataRecord; reason: string }[]
  invalidRecords: { index: number; reason: string; raw?: unknown }[]
  qualityBreakdown: { high: number; medium: number; low: number; unknown: number }
}
```

A UI (`HealthDataImportPanel.tsx`) mostra os quatro contadores, listas de
exemplos (limitadas a 20 por padrão, com "mostrar todos" quando há mais) e o
motivo de cada rejeição/duplicata — nunca importa nada sem o usuário ver
essa prévia primeiro. Só "Importar somente válidos" e "Cancelar" existem;
não há opção de forçar a importação de inválidos.

## Deduplicação na importação

Reaproveita `deduplicateRecords`/`computeDedupKey` da Parte 1 sem
alteração, **exceto** por um ajuste feito nesta parte: peso usa
`metric+data` (ignorando a fonte) como chave, em vez de
`metric+source+recordedAt`. Motivo: Body Progress — a única store real de
peso — não tem conceito de "fonte"; todo peso derivado de lá chega como
`source: 'body_progress'` (via `body-progress-adapter.ts`), então comparar
por `source` faria uma reimportação de peso criar um novo registro em Body
Progress a cada vez. Esse é o único caso especial; para as demais métricas,
o mesmo valor/data vindo de uma fonte diferente é tratado como conflito, não
duplicata (ex.: passos manual 8.000 vs. importado 8.450 coexistem — resolver
esse conflito fica para a Parte 3).

## Peso na importação

Assim como na entrada manual, registros de peso no arquivo são
redirecionados para `createBodyProgressEntry` em vez de
`lrpg-fit:health-data-records` — ver `import-apply.ts` e a seção "Peso" de
`HEALTH-DATA-MANUAL-ENTRY.md`.

## Atomicidade e rollback

`import-apply.ts` (`applyHealthImportRecords`) reaproveita a estratégia de
`backup.ts`: snapshot das duas chaves envolvidas
(`lrpg-fit:health-data-records` e `lrpg-fit:body-progress`) antes de
escrever, e restauração completa das duas se qualquer escrita falhar no
meio (inclusive quando o peso é redirecionado para Body Progress e essa
escrita específica falha). Nenhum registro parcial fica persistido; o
usuário recebe uma mensagem de erro clara e o estado anterior é preservado
byte a byte.

Isso exigiu uma correção em `body-progress.ts`: `createBodyProgressEntry`
antes retornava `{ ok: true }` mesmo quando a escrita em `localStorage`
falhava (a falha era engolida silenciosamente por `persistEntries`). Sem
essa correção, uma falha de armazenamento durante a importação de peso
nunca seria detectada e o rollback não seria acionado. Agora
`persistEntries` retorna `boolean` e `createBodyProgressEntry` propaga
`{ ok: false, error }` quando a escrita falha.

## Limites

Arquivo máximo: **5 MB** (`MAX_HEALTH_IMPORT_FILE_BYTES`, `manual-entry.ts`)
— rejeitado antes do parsing, sem tentar carregar o conteúdo. Import history
detalhado (Sprint 28 §28) não foi implementado — não é obrigatório e o
ganho não justificava mais uma chave de armazenamento nesta parte.

## Segurança

Conteúdo do arquivo nunca é executado; CSV é tratado como texto puro campo
a campo (sem `eval`, sem interpretar fórmulas). Neutralização de células
iniciadas por `=`/`+`/`-`/`@` fica para quando o app exportar CSV de saúde
(fora do escopo desta parte, que só importa).
