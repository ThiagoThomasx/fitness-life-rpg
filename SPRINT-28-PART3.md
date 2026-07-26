# Sprint 28 Part 3 — Daily Aggregation, Conflicts, Quality, Baselines & Trends

## 1. Validação do commit da Part 2

Antes de qualquer alteração:

```text
git status                → working tree limpo
git branch --show-current → master
git log --oneline -10     → f97fabc no topo, mensagem conforme esperado
git show --stat f97fabc   → 32 arquivos, escopo 100% Parte 2, nenhum arquivo
                             da Parte 3 misturado
```

Gates reproduzidos: Lint ✅ · Typecheck ✅ · Tests ✅ 1311/1311 · Build ✅.
Nenhuma inconsistência encontrada — nenhuma correção separada foi necessária
antes de iniciar a Parte 3.

## 2. Auditoria

`src/lib/health-data/` (Partes 1-2) já tinha: `types`, `validation`,
`normalization`, `quality` (por registro), `deduplication`, `storage`,
`body-progress-adapter`, `queries` (sem agregação/conflito), `manual-entry`,
`csv-parser`, `import-json/csv/preview/apply`. `HealthDataConflict` e
`HealthMetricBaseline` já existiam em `types.ts` desde a Parte 1, mas sem
nenhum motor que os produzisse — placeholders de tipo, estendidos nesta
parte em vez de recriados.

Motores reutilizáveis encontrados fora de `health-data/`:

- **`trend-math.ts`** (Sprint 19) — `classifyTrend`, já usado por
  `body-progress-trends.ts` e `wellness-trends.ts`. Reaproveitado
  diretamente em `trends.ts` — nenhum classificador novo.
- **`analytics/helpers.ts` + `analytics/types.ts`** (Sprint 25) —
  `resolvePeriodRange`, `filterByDateRange`, `AnalyticsPeriod`, `DateRange`.
  O vocabulário de período (`7d/30d/90d/6m/1y/all`) já bate exatamente com
  o pedido da sprint ("7, 30, 90 dias, 6 meses, 1 ano, Tudo") — reaproveitado
  sem criar um segundo enum de período.
- **`workout-readiness.ts#computeReadinessStats`** — padrão de "média sobre
  uma janela já filtrada pelo chamador", seguido pelo baseline em vez de
  reimplementar a lógica de janela.

Gap real: nenhum `stats.ts` (mean/median/stddev) existia em lugar nenhum do
projeto — cada domínio calculava média via `reduce` ad hoc. Criado como
módulo novo, local a `health-data/` (YAGNI — não promovido a utilitário
global especulativo; só este domínio precisa de mediana/desvio padrão hoje).

`sampleConfidence` (`analytics/helpers.ts`) foi avaliado para a qualidade do
baseline mas descartado: seus limiares (0/1-2/3-5/6+) são calibrados para
contagem de sessões de treino, incompatíveis com a escala de 7-365 dias
relevante aqui — quase todo baseline teria confiança "high" mesmo apenas no
mínimo exigido. Baseline usa um limiar próprio, relativo ao mínimo de cada
métrica (ver `HEALTH-BASELINES.md`).

## 3. Implementado

Motor puro, nada persistido (princípio 4.1 do prompt da sprint):

- **`stats.ts`** — `mean`, `median`, `standardDeviation`, `max`,
  `sumMergedIntervalsMs` (mescla intervalos sobrepostos — usado por sono e
  duração de atividade).
- **`aggregation-shared.ts`** — `toDateKey`, `SOURCE_PRIORITY`,
  `highestPrioritySource`, `METRIC_SUMMARY_FIELD`, `summaryMetricValue`,
  `METRIC_LABELS` — compartilhado entre `aggregation.ts`, `conflicts.ts`,
  `trends.ts` e a UI, para as três camadas concordarem exatamente no que é
  "um dia" e na prioridade de fonte.
- **`aggregation.ts`** — `buildDailySummaries`/`buildDailySummaryForDate`.
  Estratégia explícita por métrica (nunca uma regra genérica) — ver
  `HEALTH-DATA-AGGREGATION.md` para a tabela completa e a justificativa de
  cada uma.
- **`conflicts.ts`** — `detectConflicts`/`getConflictsForDay`. Limiar por
  métrica (percentual ou absoluto), severidade proporcional à divergência.
  Apenas registra — nunca resolve automaticamente. Ver `HEALTH-CONFLICTS.md`.
- **`quality-aggregation.ts`** — `computeDailyQuality`. Combina a qualidade
  já calculada por registro (Parte 1) com o sinal de conflito entre fontes —
  nunca reaplica a lógica de `quality.ts`.
- **`baseline.ts`** — `computeMetricBaseline`/`getMinimumBaselineSamples`.
  Nunca gera baseline abaixo do mínimo por métrica. Ver `HEALTH-BASELINES.md`.
- **`trends.ts`** — `computeMetricTrend`, sobre `classifyTrend`
  (`trend-math.ts`). Ver `HEALTH-TRENDS.md`.
- **`analytics-queries.ts`** — camada de consulta pura:
  `getSummaryRange`, `getDailySummary`, `getLatestSummary`, `getConflicts`,
  `getQuality`, `getMetricBaseline`, `getMetricTrend`. Único ponto que
  consumidores futuros (Parte 4) devem chamar — nenhum precisa conhecer
  deduplicação, conflito, qualidade ou baseline por dentro.
- **UI** (`src/components/settings/HealthDataInsightsPanel.tsx`) — dentro da
  seção "Dados de saúde" já existente (Configurações), não um dashboard
  novo. Seletor de período (reaproveita `PERIOD_OPTIONS` do módulo Analytics
  de treino), resumo do dia mais recente com motivo da qualidade, contador
  de conflitos expansível, seletor de métrica, cartão de baseline e cartão
  de tendência com evidência textual.

## 4. Decisões arquiteturais

- **Prioridade de fonte, não soma**: nenhuma métrica soma valores de fontes
  diferentes — sempre escolhe uma fonte vencedora (prioridade) ou usa uma
  medida resistente a outlier (mediana, para FC de repouso). Evita o erro
  clássico de dobrar contadores cumulativos (passos, calorias) quando duas
  fontes relatam o mesmo dia.
- **Sono/atividade por união de intervalos**: em vez de somar durações,
  intervalos sobrepostos da mesma fonte são mesclados antes de somar —
  precisamente o caso do prompt da sprint (23h-07h + 00h30-06h nunca vira
  14h).
- **Conflito é sinal, não decisão**: `detectConflicts` nunca escolhe um
  valor "correto" — isso é decisão de produto adiada para a Parte 4
  (resolução por prioridade), citada aqui só como direção futura.
- **Baseline com limiar de qualidade próprio**: não reaproveitado
  `sampleConfidence` genérico (calibrado para sessões de treino) — um
  limiar relativo ao mínimo de cada métrica de saúde, documentado em
  `HEALTH-BASELINES.md`.
- **`records` como gatilho de recálculo na UI**: os componentes de consulta
  leem `localStorage` diretamente (via `analytics-queries.ts`), não recebem
  dados por prop — mas `HealthDataInsightsPanel` aceita `records` só como
  dependência de `useMemo`, porque sua identidade muda a cada `load()` do
  componente pai (`HealthDataSection`), disparando o recálculo depois de um
  registro novo ser salvo/importado/excluído.

## 5. Testes

48 testes novos, 6 arquivos:

- `aggregation.test.ts` (18) — dia vazio, um registro, múltiplos dias,
  estratégia de cada métrica (passos: fonte vencedora + max; peso: mais
  recente, nunca média; sono: união de intervalos sobrepostos; FC:
  mediana; atividade: soma de eventos não sobrepostos; calorias: max da
  fonte vencedora; distância: soma da fonte vencedora).
- `conflicts.test.ts` (8) — histórico vazio, uma fonte só (sem conflito),
  conflito real, valor duplicado não conflituoso, conflito em métrica de
  intervalo, severidade proporcional à divergência, filtro por dia.
- `quality-aggregation.test.ts` (5) — sem registros, todos de alta
  qualidade, conflito de severidade alta força `low`, maioria
  baixa/desconhecida força `low`, conflito leve força `medium`.
- `baseline.test.ts` (4) — amostra insuficiente retorna `null`, cálculo de
  média/mediana/desvio com amostra suficiente, dias sem valor são
  ignorados na contagem, qualidade `medium` vs `high` conforme múltiplo do
  mínimo.
- `trends.test.ts` (7) — dados insuficientes, série claramente crescente,
  decrescente, estável, irregular (zigue-zague), só dias com valor entram
  na série.
- `analytics-queries.test.ts` (7) — período vazio, filtro por período,
  `getDailySummary`/`getLatestSummary` independentes de período, conflitos
  só do período pedido, qualidade de um dia específico, baseline e
  tendência ponta a ponta via storage real.

## 6. QA manual (browser real)

Servidor de desenvolvimento (`fitness-rpg`, `.claude/launch.json`) aberto em
`/configuracoes` com dados de saúde já existentes no `localStorage` local
(4 registros, 3 fontes). Confirmado via `get_page_text` + `javascript_tool`
(screenshot indisponível neste ambiente — ver limitação conhecida no
histórico de sessões anteriores):

- Seção "Análise de dados de saúde" renderiza corretamente abaixo da lista
  de registros e do painel de importação, sem virar um dashboard novo.
- Resumo do dia mais recente mostra os dois valores presentes naquele dia
  (passos e peso), qualidade "Média" com o motivo textual correto
  ("registros de qualidade mista, sem conflitos").
- Trocar a métrica no seletor (`Passos` → `FC de repouso`) atualiza
  corretamente os cartões de baseline e tendência, ambos mostrando "amostra
  insuficiente" / "dados insuficientes" — esperado, já que o histórico de
  teste tem só 1 dia de FC de repouso.
- Trocar o período (`30 dias` → `90 dias`) não gera erro de console.
- Zero erros no console do navegador durante toda a interação.

## 7. Gates

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1359/1359 (1311 + 48 novos)
Build:     ✅
```

## 8. Pendências conscientes

- Resolução automática de conflito por prioridade de fonte — citada como
  direção futura em `conflicts.ts`, não implementada (fora de escopo desta
  parte, conforme prompt).
- Nenhuma integração com Readiness/Recovery/Fatigue/Coach — a camada de
  consulta (`analytics-queries.ts`) está pronta para ser consumida, mas
  nenhum motor consumidor foi tocado.
- QA manual cobriu o fluxo com dados pré-existentes no ambiente de
  desenvolvimento; não foi testado um fluxo completo de "importar 30 dias →
  ver baseline aparecer → ver tendência aparecer" ponta a ponta no browser
  (coberto por teste automatizado em `analytics-queries.test.ts`, mas não
  visualmente).
- Sem captura de screenshot (limitação conhecida do Browser pane neste
  ambiente) — verificação feita via extração de texto da página e execução
  de JavaScript no console.

## 9. Próximo passo

Sprint 28 Part 4 — Readiness + Recovery + Fatigue + Coach Integration.
