# Sprint 30 Part 3 — Health Data Export, Round-Trip Portability & Format Adapters

## 1. Validação do estado anterior (Part 2)

```text
git status                → working tree limpo
git branch --show-current → master
git log --oneline -15     → 19cf3e0 no topo, mensagem conforme esperado
git show --stat 19cf3e0   → 17 arquivos, escopo 100% restrito ao
                             wizard de mapeamento/presets, nada da Part 3
                             misturado, nenhum arquivo pessoal de QA
```

Remoto: `origin` correto (`ThiagoThomasx/fitness-life-rpg`), branch 2
commits à frente de `origin/master` (`3e05e34`, Sprint 29 Parte 4). Nada
pushado.

Gates reproduzidos antes de qualquer alteração:

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1528/1528
Build:     ✅
```

Baseline confirmado, nenhuma inconsistência.

## 2. Auditoria

Mapeamento do domínio existente antes de editar (ver `HEALTH-DATA-EXPORT.md`
para o detalhamento):

- **JSON canônico** (`import-json.ts`) — `{ version, records }`, aceita só
  esse schema. `parseHealthDataJsonImport` ignora campos desconhecidos no
  envelope raiz (só lê `version`/`records`), o que permite um export
  reaproveitar o mesmo schema com metadados extras sem quebrar a
  importação.
- **CSV canônico** (`import-csv.ts`, `CANONICAL_COLUMNS`) —
  `metric,value,unit,recordedAt,source,externalId,startAt,endAt`.
  `inspectCsvHeader()` (`import-mapping/inspection.ts`, já existente desde
  a Parte 2) já decide 100% se um cabeçalho é canônico — reaproveitada
  como está para o adapter `canonical-csv`.
- **CSV injection** — `sanitizeCsvTextField` já existia em
  `import-mapping/helpers.ts` (Parte 1, seção de segurança). Reaproveitado
  em vez de reimplementado (`csv-safety.ts` só reexporta com o nome
  `neutralizeCsvFormula`).
- **Peso** — nunca persiste em `health-data-records`; é derivado de
  `body-progress.ts` via `body-progress-adapter.ts`. Reimportação de peso
  sempre passa por `createBodyProgressEntry` (`import-apply.ts`), nunca
  pela chave de Health Data.
- **Ordenação/consulta única** — `getAllHealthRecords()` (`queries.ts`) já
  combina store + adapter de peso; usado como base de
  `getHealthRecordsForExport`.

## 3. Implementado

### `src/lib/health-data/export/`

| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | `HealthExportFilters`, `HealthDataCanonicalExport`, `HealthExportPreview` |
| `filters.ts` | `getHealthRecordsForExport` — filtra + ordena deterministicamente |
| `canonical-json.ts` | Envelope `{version, exportedAt, filters, recordCount, records}` |
| `canonical-csv.ts` | Cabeçalho `metric,value,unit,recordedAt,startAt,endAt,source,externalId,quality,metadata` |
| `csv-safety.ts` | Escaping RFC-4180 + neutralização de formula injection (reaproveitada) |
| `filenames.ts` | Nome determinístico (`fitness-life-rpg-health-<metrica|all>-<data>.<ext>`) |
| `preview.ts` | Resumo pré-download (contagem, métricas, fontes, tamanho, avisos) |
| `download.ts` | Blob → object URL → clique → revoke |
| `round-trip.ts` | `compareHealthRecordSets` — equivalência semântica |
| `adapters.ts` | `HealthImportFormatAdapter` × 3 (canonical-json/canonical-csv/mapped-csv) |

### UI

`HealthDataExportPanel.tsx` — formato (JSON/CSV), métrica (todas ou uma),
período (mesmo vocabulário `AnalyticsPeriod` do resto do app), incluir
peso, prévia ao vivo (contagem/tamanho estimado/nome do arquivo/avisos de
privacidade), botão de download bloqueado quando não há registros. Ligado
em `HealthDataSection.tsx`, entre o painel de importação e a lista de
presets.

## 4. Decisões arquiteturais

- **Formato canônico versionado**: `HEALTH_DATA_EXPORT_VERSION = 1`,
  compatível com o `version` já aceito por `parseHealthDataJsonImport`.
- **Sem rota paralela**: a reimportação usa exatamente
  `parseHealthData*Import` → `buildHealthImportPreview` →
  `applyHealthImportRecords` — os mesmos três passos usados por qualquer
  importação manual.
- **Equivalência semântica ≠ igualdade byte a byte**: `id`/`importedAt`
  sempre ignorados (são regenerados). Peso ignora adicionalmente
  `source`/`externalId`/`quality`, porque o adapter de Body Progress
  sempre atribui `'body_progress'`/`'high'`/um novo id — comparar esses
  três campos geraria falso-negativo permanente, não um bug real.
- **Metadata whitelist**: não foi necessária uma whitelist adicional —
  `HealthDataRecord.metadata` já é `Record<string, string|number|boolean>`,
  serializável por construção (imposto por `isValidHealthDataRecord`).
- **CSV não preserva metadata na reimportação** (limitação conhecida,
  documentada em `HEALTH-DATA-EXPORT.md`) — o parser canônico de CSV não
  lê uma coluna `metadata`; alterá-lo para isso seria mexer em lógica de
  negócio já testada da Parte 2, fora do escopo desta parte.
- **Adapters criados, painel de importação não migrado**: `adapters.ts`
  consolida os três caminhos de parsing atrás de uma interface única e é
  testado isoladamente. `HealthDataImportPanel.tsx` manteve sua lógica
  inline — ela já é funcionalmente idêntica, não tinha teste de componente
  próprio, e o risco de regressão numa tela em produção não se justificava
  só por simetria arquitetural.
- **Ordem de detecção**: `canonical-json → canonical-csv → mapped-csv`,
  igual à ordem já usada implicitamente por `HealthDataImportPanel.tsx`.

## 5. Testes

9 arquivos novos, 79 casos novos:

- `filters.test.ts` (8) — métrica, fonte, período, range customizado,
  peso incluído/excluído, vazio, ordenação determinística.
- `csv-safety.test.ts` (17) — escaping (vírgula, ponto e vírgula, aspas,
  quebra de linha), neutralização de `=`/`+`/`-`/`@`, número negativo
  preservado.
- `canonical-json.test.ts` (5) / `canonical-csv.test.ts` (11) — geração +
  aceitação pelo parser de importação existente, sem alterá-lo.
- `filenames.test.ts` (5) — determinístico por formato/métrica/data.
- `adapters.test.ts` (14) — detecção e parsing dos três adapters.
- `round-trip.test.ts` (8) — equivalência semântica, incluindo o caso
  especial de peso.
- `preview.test.ts` (4) — resumo pré-download.
- `end-to-end-round-trip.test.ts` (7) — **o mais importante**: pipeline
  real, JSON/CSV/peso, incluindo "sem duplicação ao reimportar num perfil
  que já tem o mesmo registro".

## 6. QA manual

Executado em `http://localhost:3000/configuracoes` (servidor `fitness-rpg`
via `.claude/launch.json`), com dados semeados reais (4 registros de
saúde: 2 passos, 1 peso via Body Progress, 1 FC de repouso):

- Painel "Exportar dados de saúde" renderiza com os 4 registros de seed.
- Prévia mostra **3** registros para "Tudo" — corretamente exclui o
  registro futuro (20:00 do dia atual, além do relógio real do navegador
  no momento do clique) — comportamento correto de `resolvePeriodRange`,
  não um bug.
- Trocar formato JSON → CSV atualiza filename/tamanho estimado/label do
  botão ao vivo, sem re-render quebrado.
- Download de CSV disparado sem erro de console; mensagem de sucesso
  (`role="status"`) exibida com o nome do arquivo.
- Modal acessível: `role="dialog"`, `aria-labelledby`/`aria-describedby`,
  todos os campos com `<label htmlFor>`, foco preso (herdado de
  `ModalShell`, componente já existente e não alterado).

## 7. Gates finais

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1607/1607 (1528 baseline + 79 novos)
Build:     ✅
```

```text
git status / git diff --stat — revisados antes do commit, sem arquivo
sensível ou de QA pessoal incluído
```

## 8. Pendências reais

- CSV não preserva `metadata` na reimportação (só JSON) — limitação de
  design documentada, não um bug.
- `HealthDataImportPanel.tsx` não usa os format adapters (decisão
  deliberada, seção 4).
- Nada pushado ao remoto (por instrução — `git push` não foi executado).

## 9. Próximo passo recomendado

Duas opções razoáveis, ambas fecham a Sprint 30:

- **Sprint 30 Parte 4** — Backup, Mobile, Accessibility & Final QA (padrão
  já usado nas Sprints 28/29: uma parte final de hardening/QA visual antes
  de encerrar a sprint).
- **Sprint 31 — Nutrition Integration** — se a Sprint 30 for considerada
  suficientemente fechada sem uma parte 4 dedicada.

Recomendação: **Sprint 30 Parte 4**, para manter o padrão das duas sprints
anteriores (28 e 29 encerraram com uma parte de QA/hardening dedicada) antes
de abrir uma frente nova.
