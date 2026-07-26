# Sprint 28 Part 2 — Manual Health Entry & Import Pipeline

## 1. Validação do commit da Part 1

Antes de qualquer alteração:

```text
git status            → working tree limpo
git branch --show-current → master
git log --oneline -15 → bda6ddc no topo, mensagem conforme esperado
git show --stat/--name-status bda6ddc → 22 arquivos, escopo 100% Parte 1
  (types/validation/normalization/quality/deduplication/storage/
  body-progress-adapter/queries + docs), nenhum arquivo da Parte 2
  misturado, nenhum dado sensível
```

Gates reproduzidos: Lint ✅ · Typecheck ✅ · Tests ✅ 1256/1256 · Build ✅.
Nenhuma inconsistência encontrada — nenhuma correção separada foi
necessária antes de iniciar a Parte 2.

## 2. Auditoria da Parte 2

- **Configurações**: `src/app/(dashboard)/configuracoes/page.tsx` já segue
  o padrão "página dona do estado, seções presentacionais em
  `src/components/settings/*Section.tsx`". Nova seção `HealthDataSection`
  entra na mesma lista, sem rota nova.
- **Modal**: `ModalShell` (`src/components/ui/ModalShell.tsx`) já tem focus
  trap, Escape, `aria-describedby`, scroll lock e variantes `center`/`sheet`.
  Reaproveitado para a prévia de importação (`variant="sheet"`, mais espaço
  para listas).
- **Formulário**: não existe um `FormField` compartilhado — todo formulário
  do projeto usa `<label htmlFor>`+`<input id>` com `labelStyle`/`inputStyle`
  inline (ver `BodyProgressForm.tsx`). Seguido o mesmo padrão em
  `HealthDataManualEntryForm.tsx`.
- **File upload**: único precedente é `BackupImportSection.tsx` (input
  oculto + botão visível + `file.text()`, sem `FileReader`). Nenhuma
  biblioteca de CSV instalada. Reaproveitado o mesmo padrão de input oculto
  para JSON e CSV.
- **Peso**: `BodyProgressForm.tsx`/`BodyProgressSection.tsx` chamam
  `createBodyProgressEntry` (`lib/body-progress.ts`) diretamente — nenhuma
  store Zustand envolvida. Confirmado como o único ponto de escrita real de
  peso no projeto.
- **Lista/exclusão**: `BodyProgressSection.tsx` usa confirmação inline
  por-linha (não modal) para excluir — mesmo padrão aplicado em
  `HealthDataRecordList.tsx`.

## 3. Estratégia de peso (decisão confirmada)

Entrada manual e importação de peso **nunca** chamam
`createHealthDataRecord`/`importHealthDataRecords` para `metric: 'weight'`.
`manual-entry.ts` e `import-apply.ts` redirecionam para
`createBodyProgressEntry`, preservando Body Progress como fonte única. A
UI mostra isso explicitamente ("salvo em Progresso Corporal") e a lista de
registros troca o botão "Excluir" por um link para Body Progress quando
`source === 'body_progress'`.

Isso expôs um problema real na Parte 1 que só aparece com dado de verdade
fluindo entre os dois domínios: a chave de deduplicação genérica
(`metric+source+recordedAt`) trata `source` como parte da identidade, mas
todo peso derivado de Body Progress chega sempre com
`source: 'body_progress'` (o domínio não tem conceito de fonte) —
reimportar o mesmo peso criaria um novo registro em Body Progress a cada
vez. Corrigido em `deduplication.ts`: peso usa `metric+data` como chave,
ignorando `source`. Documentado em `HEALTH-DATA-IMPORT.md`.

## 4. Atomicidade

`import-apply.ts` faz snapshot de `lrpg-fit:health-data-records` e
`lrpg-fit:body-progress` antes de escrever (mesma estratégia de
`backup.ts`), aplica os registros não-peso via `importHealthDataRecords` e
os de peso via `createBodyProgressEntry`, e restaura as duas chaves ao
snapshot se qualquer escrita falhar.

Isso só funciona porque uma correção separada foi necessária:
`createBodyProgressEntry` engolia silenciosamente falhas de escrita
(`persistEntries` capturava a exceção e nunca informava o chamador) — a
importação nunca saberia que o rollback era necessário. `persistEntries`
agora retorna `boolean` e `createBodyProgressEntry` propaga
`{ ok: false, error }` quando a escrita falha. Coberto por um teste que
simula falha de `localStorage.setItem` na chave de Body Progress e
confirma que as duas chaves voltam ao estado anterior.

## 5. Implementado

`src/lib/health-data/` (novos arquivos): `import-json.ts`, `csv-parser.ts`,
`import-csv.ts`, `import-preview.ts`, `import-apply.ts`, `manual-entry.ts`.
`types.ts` estendido com `HealthImportError`, `HealthImportDuplicate`,
`HealthImportPreview`. `queries.ts` ganhou `getAllHealthRecords`.
`deduplication.ts` ganhou o caso especial de peso (§3).
`body-progress.ts`: `BODY_PROGRESS_KEY` exportado, `persistEntries`/
`createBodyProgressEntry` agora propagam falha de escrita (§4).

UI: `HealthDataManualEntryForm.tsx` (formulário dinâmico por métrica,
sono com início/fim ao invés de duração manual), `HealthDataImportPanel.tsx`
(seleção de arquivo JSON/CSV, prévia em `ModalShell`, confirmação
explícita), `HealthDataRecordList.tsx` (lista recente + exclusão inline),
`HealthDataSection.tsx` (composição, contadores, aviso de privacidade),
wired em `configuracoes/page.tsx`. Métricas de bem-estar
(`wellness_energy`/`soreness`/`motivation`) deliberadamente **não** têm
campo no formulário — já cobertas pelo check-in de Readiness.

Ver `HEALTH-DATA-IMPORT.md` e `HEALTH-DATA-MANUAL-ENTRY.md` para os
detalhes de formato, validação e decisões.

## 6. Testes

Novos arquivos: `manual-entry.test.ts`, `csv-parser.test.ts`,
`import-json.test.ts`, `import-csv.test.ts`, `import-preview.test.ts`,
`import-apply.test.ts`, mais casos adicionados a `queries.test.ts` e
`import-preview.test.ts` (conflito não é duplicata). Cobrem: entrada
manual (incl. redirecionamento e rejeição de peso), parsing JSON (erros
globais e por registro, schema estrito), parsing CSV (cabeçalho, aliases,
BOM/CRLF, delimitador, sono derivado de intervalo), prévia (contagens,
duplicatas dentro do arquivo e contra existentes, conflito ≠ duplicata,
quality breakdown), e atomicidade (aplicação mista peso+não-peso, rollback
sob falha simulada de escrita).

55 testes novos, 1311/1311 no total (1256 da Parte 1 + 55).

## 7. QA manual (browser real, dev server)

- **Fluxo 1 (manual)**: passos e peso adicionados via formulário; lista
  atualizada imediatamente; contadores de registros/fontes corretos.
- **Fluxo 2 (peso)**: peso salvo via Dados de Saúde apareceu em
  `/perfil` → Progresso Corporal (80.0 kg, 1 registro) — confirmado sem
  duplicação em `lrpg-fit:health-data-records`.
- **Fluxo 3 (JSON)**: arquivo com 3 registros (2 válidos, 1 com métrica
  desconhecida) → prévia correta (2 prontos, 1 inválido) → confirmado →
  lista atualizada → reimportação do mesmo arquivo → 0 prontos, 2
  duplicados, idempotência confirmada.
- **Fluxo 4 (CSV)**: arquivo com 1 linha válida e 2 inválidas (`value`
  ausente sem sono, `value` não numérico) → prévia mostrou os motivos por
  linha corretamente, importação só da linha válida.
- **Fluxo 5 (rollback)**: coberto por teste automatizado (mock de
  `localStorage.setItem`) em vez de QA manual no browser — não há forma
  prática de forçar quota excedida real no ambiente de preview.
- Mobile: 375px sem overflow horizontal (`scrollWidth === clientWidth`).
- Console: zero erros em todas as interações acima.

## 8. Gates

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1311/1311
Build:     ✅
```

## 9. Pendências conscientes

- Import history detalhado (timestamp/tipo/contagens) não foi persistido —
  opcional pela especificação, não implementado nesta parte.
- Sem teste de componente React (convenção já estabelecida no projeto —
  cobertura via QA manual real, não via testing-library).
- Neutralização de fórmulas CSV (`=`/`+`/`-`/`@`) é relevante só para
  export futuro de CSV de saúde, que não existe ainda.
- Nenhuma integração com Readiness/Recovery/Fatigue/Coach — fora de
  escopo desta parte (Parte 4).

## Próximo passo recomendado

Sprint 28 Part 3 — Daily Aggregation, Conflicts, Quality & Baselines.
