# Sprint 22 — Parte 2: Exercise Detail Experience

## Auditoria (resumo)

- **Não existia rota `/exercicios`** nem `exercise-library.ts`. O catálogo de
  exercícios é `getAllExercises()` (`src/lib/custom-workouts.ts`), que mescla
  `MOCK_EXERCISES` (`src/lib/mock/data.ts`) com exercícios customizados
  (`lrpg-fit:custom-exercises`). IDs de biblioteca são estáveis
  (`ex-1`, `ex-2`, ...); IDs customizados usam prefixo `cx-`.
- **Não existe conceito de "arquivado" para exercícios** no código atual —
  só treinos/programas têm arquivamento (`workout-templates.ts`,
  `training-cycles.ts`). Por isso a disponibilidade de um exercício
  resolvido é binária (`active`/`removed`), nunca um terceiro estado
  inventado sem suporte real.
- **Biblioteca não é uma rota** — é um estado (`showLibrary`) dentro de
  `/treinos` (`src/app/(dashboard)/treinos/page.tsx`), renderizando
  `ExerciseLibrary.tsx` como overlay de página inteira. Por isso "voltar
  para a biblioteca" na página de detalhe linka para `/treinos`, não para
  uma URL de biblioteca que não existe.
- **Não existe rota para abrir um `CompletedWorkout` livre por ID.** Só
  treinos vindos do Planner têm rota (`/plano/treino/[id]`, via
  `PlannedWorkout.id`, não `CompletedWorkout.id`). Isso limita links de
  "abrir execução" a partir de recordes/timeline: quando a execução tem
  `plannedWorkoutId` (veio de uma sessão planejada), o link existe; quando é
  um treino livre, mostramos data/nome como texto, sem link quebrado.
- **`programas/[id]/page.tsx`** já seguia um bom padrão de rota dinâmica
  (client component, `useParams<{id}>()`, sentinela `undefined`/`null` para
  loading/não-encontrado, `EmptyState`) — reaproveitado integralmente pela
  nova rota.
- **Gráficos**: Recharts (`recharts@^3.9`) já é a biblioteca usada em
  Insights (`ExerciseLoadSection.tsx`, `WeekVolumeSection.tsx`), com tokens
  compartilhados em `ChartCard.tsx` (`ChartHeader`, `EmptyChart`,
  `TOOLTIP_STYLE`, `GRID_STROKE`, `AXIS_TICK`) e cores em
  `theme-colors.ts` (`CHART_COLORS`). Reaproveitados sem introduzir nova
  biblioteca.
- **Componentes reutilizáveis confirmados**: `EmptyState`, `SkeletonPageLoader`,
  classes CSS `card`/`target-card`/`stat-cell`/`stat-grid`/`badge-pill`/
  `section-label`/`filter-pill`/`set-chip`/`btn`/`icon-btn` — todas já
  existentes em `components.css`/`workouts.css`/`insights.css`, nenhuma
  classe nova de cor/espaçamento foi criada (só layout estrutural em
  `exercise-detail.css`).
- **Testes de componente React**: o projeto nunca usou React Testing
  Library (nenhum `.test.tsx` em nenhuma sprint anterior). Convenção
  mantida — o motor puro é testado exaustivamente, a UI é verificada via QA
  manual no navegador (ver seção QA abaixo).

## Ajuste de escopo (Sprint 22 §5.5)

- **Ações do cabeçalho (§9)** reduzidas ao que tem fluxo real: voltar,
  copiar nome. "Iniciar treino com o exercício", "adicionar a treino",
  "editar exercício customizado" e "abrir na biblioteca" (como link direto)
  não têm fluxo seguro/existente fora do contexto de sessão ativa ou do
  modal de biblioteca — não foram inventados.
- **Acesso à execução relacionada a partir de recordes (§12)** não virou
  link, pelo motivo de roteamento explicado acima. Documentado como
  pendência, não implementado com um link quebrado.
- **Recomendação relacionada (§24)** não recalcula `review_exercise` (isso
  depende de contexto de programa que a página de exercício não tem) — em
  vez disso reaproveita o mesmo limiar exportado de
  `adaptive-recommendations.ts` (`RECURRING_SUBSTITUTION_THRESHOLD`) para
  mostrar um callout informativo com link para o Planner, onde a
  recomendação de fato aparece.
- **Gamificação (§37)** não foi integrada nesta parte — mesma decisão de
  escopo da Parte 1 (`detectNewExerciseRecords` já existe e está pronto,
  conectar a XP/badges exigiria ampliar escopo de gamificação).

## Implementado

### Bloco B — Resolução e rota
- `resolveExercise` (`exercise-detail-engine.ts`): biblioteca → customizado →
  histórico → não encontrado (`null`).
- `/exercicios/[id]` (`src/app/(dashboard)/exercicios/[id]/page.tsx`):
  loading (`SkeletonPageLoader`), não encontrado (`EmptyState` + link para
  `/treinos`), nunca executado (`dataQuality.status === 'no_data'`),
  removido da biblioteca (aviso discreto, histórico preservado).

### Bloco C — Resumo e recordes
- `ExerciseDetailHeader.tsx`: nome → origem/status → última execução →
  recorde principal → tendência de carga.
- `ExerciseSummarySection.tsx`: execuções vs. treinos distintos
  (`totalWorkouts`, campo novo em `ExerciseHistorySummary`), frequência,
  volume total, badge de data quality com explicação textual.
- `ExerciseRecordsSection.tsx`: só renderiza tipos de recorde presentes.
- `ExerciseTrendsSection.tsx`: direção sempre com rótulo textual, nunca só
  ícone/cor; tom neutro em queda ("abaixo da janela anterior").

### Bloco D — Gráficos
- `ExerciseChartsSection.tsx`: carga, 1RM estimado, volume, repetições,
  frequência — cada um com eixo próprio, tooltip, estado vazio e resumo
  textual. Filtro de período único (`30d`/`90d`/`6m`/`1y`/`all`) controla os
  cinco gráficos via `filterExecutionsByPeriod`.

### Bloco E — Timeline
- `ExerciseTimelineSection.tsx`: ordenação alternável (mais recente/mais
  antigo primeiro), paginação "carregar mais" (10 por página), expansão de
  séries por execução com botão de estado textual (`aria-expanded` +
  "Ver N séries"/"Ocultar séries"), link para o treino planejado quando
  `plannedWorkoutId` existe.

### Bloco F — Substituições
- `ExerciseSubstitutionsSection.tsx`: taxa de substituição, substitutos mais
  comuns, motivos mais comuns, última ocorrência, callout de recomendação
  relacionada.
- `ExerciseRelatedSection.tsx`: programas/treinos relacionados, hierarquia
  Programa → treino → contagem de execuções.

### Bloco G — Navegação
- `ExerciseLibrary.tsx`: nome do exercício agora é link para
  `/exercicios/[id]`.
- `ExerciseHistoryModal.tsx`: link "Ver página completa do exercício".
- `PlannedWorkoutComparisonView.tsx`: nome do exercício vira link quando há
  `performedExerciseId`/`plannedExerciseId` resolvível.
- `programas/[id]/page.tsx`: nova seção "Exercícios deste programa"
  (`getExercisesForProgram`, novo em `exercise-detail-engine.ts`).
- `insights/page.tsx`: nova seção `ExerciseHighlightsSection` ("Exercícios
  em destaque").

### Bloco H — Qualidade
- `fix: correct training load test edge case` — ver `CHANGELOG.md` para o
  diagnóstico completo. Causa raiz: teste sem relógio congelado, não um bug
  de `training-load.ts`.
- Testes novos: `exercise-detail-engine.test.ts` (19 casos),
  `exercise-highlights.test.ts` (4 casos), +1 em
  `exercise-intelligence.test.ts` (`totalWorkouts`). Total: 929/929 na
  suíte completa, zero falhas.
- QA manual no navegador (dev server local): ver seção QA abaixo.

## Decisões arquiteturais

- **`exercise-detail-engine.ts` como arquivo separado de
  `exercise-intelligence.ts`.** O motor da Parte 1 já estava em ~520 linhas;
  as adições da Parte 2 (resolução, data quality, relacionados, séries de
  gráfico) foram para um arquivo próprio para manter ambos dentro do limite
  de tamanho do projeto (soft cap ~800 linhas). Nenhum dos dois duplica
  lógica do outro — o arquivo novo só importa e compõe funções do motor
  original.
- **`ExerciseDataQuality` como taxonomia própria, sem inventar "legado".**
  A spec pede um estado "dados legados", mas o modelo de dados atual não
  distingue execuções antigas de novas por nenhum campo confiável (`source`/
  `plannedExerciseId`/`substitution` são simplesmente `undefined` tanto para
  histórico pré-Sprint-22 quanto para sessões livres modernas — não há como
  diferenciar as duas causas sem um campo de versão que não existe). Em vez
  de inventar uma heurística frágil, a taxonomia implementada
  (`no_data`/`single_execution`/`no_load_recorded`/`partial_history`/
  `full_history`) cobre os casos que o motor consegue diferenciar com
  confiança.
- **Layout responsivo via `grid-template-areas`, não duplicação de DOM.** A
  ordem de seções difere entre mobile (lista única) e desktop (duas
  colunas com agrupamento diferente) — resolvido com uma única árvore React
  e áreas de grid nomeadas por breakpoint (`exercise-detail.css`), em vez de
  renderizar os componentes duas vezes condicionalmente.
- **`RECURRING_SUBSTITUTION_THRESHOLD` exportado de
  `adaptive-recommendations.ts`** em vez de duplicado como número mágico na
  UI de exercício — DRY sobre um valor que já era a fonte de verdade da
  regra `review_exercise`.

## Testes

- `src/lib/exercise-detail-engine.test.ts` (novo, 19 casos): resolução
  (biblioteca, customizado, removido, não encontrado), data quality (5
  estados), treinos relacionados (agrupamento por programa, vazio), filtro
  de período (`all`, janela relativa), 5 séries de gráfico (carga, 1RM,
  volume, reps, frequência) incluindo omissão de pontos inválidos.
- `src/lib/exercise-highlights.test.ts` (novo, 4 casos): grupos vazios sem
  histórico, recorde recente, substituição recorrente, sem execução
  recente.
- `src/lib/exercise-intelligence.test.ts`: +1 caso (`totalWorkouts`
  distinto de `totalExecutions`).
- `src/lib/training-load.test.ts`: 1 caso corrigido (fake timers).
- Suíte completa: **929 passando / 929** (zero falhas, incluindo a que era
  pré-existente).

## QA

### Manual no navegador (dev server local, dados sintéticos via `localStorage`)

- **Histórico completo**: resumo, data quality ("Histórico parcial"),
  recordes (5 tipos), gráficos (todos os 5, com tooltip e resumo textual),
  timeline com expansão de séries (testado clique real: "Ver 3 séries" →
  "Ocultar séries", séries exibidas com badge de PR), programas/treinos
  relacionados.
- **Nunca executado**: cabeçalho com dados cadastrais, mensagem de estado
  vazio, nenhuma seção de gráfico/timeline renderizada.
- **Não encontrado**: `EmptyState` com ação de retorno, nenhum erro não
  tratado.
- **Responsividade**: confirmado via inspeção de `getComputedStyle` do
  grid — mobile (375px) usa `grid-template-areas` em coluna única na ordem
  Tendências → Recordes → Gráficos → Substituições → Timeline →
  Relacionados; desktop (1280px) usa duas colunas
  (`650.66px 325.34px`) com áreas `charts`/`records`/`trends` na coluna
  principal e `timeline`/`substitutions`/`related` reorganizados conforme
  especificado.
- **Acessibilidade estrutural**: árvore de acessibilidade (`read_page`)
  confirma headings (`h1`/`h2`), regiões nomeadas, botões com
  `aria-expanded` na expansão de séries, grupo de filtro de período com
  `role="group"` + `aria-label`.

### Não executado nesta parte

- Reload/backup/restore não foram testados manualmente nesta parte (a
  página não introduz nenhuma chave de `localStorage` nova — só lê
  `lrpg-fit:workout-history`/`lrpg-fit:custom-exercises`, ambas já cobertas
  por `backup.ts`).
- Auditoria de contraste/teclado dedicada (tab order, foco visível) não foi
  executada manualmente — os componentes reaproveitam classes/padrões já
  auditados em sprints anteriores (`btn`, `filter-pill`, `badge-pill`).

## Gates

```text
Lint:      ✔ sem erros/avisos
Typecheck: ✔ sem erros
Tests:     929 passando / 929 (zero falhas — falha pré-existente corrigida)
Build:     ✔ next build concluído (rota /exercicios/[id] gerada como dinâmica)
```

## Arquivos principais

- Novo: `src/lib/exercise-detail-engine.ts`, `src/lib/exercise-detail-engine.test.ts`,
  `src/lib/exercise-highlights.ts`, `src/lib/exercise-highlights.test.ts`,
  `src/app/(dashboard)/exercicios/[id]/page.tsx`, `src/styles/exercise-detail.css`,
  `src/components/exercicios/*.tsx` (7 componentes),
  `src/components/insights/ExerciseHighlightsSection.tsx`
- Alterado: `src/lib/exercise-intelligence.ts` (`totalWorkouts`),
  `src/lib/adaptive-recommendations.ts` (`RECURRING_SUBSTITUTION_THRESHOLD`
  exportado), `src/lib/training-load.test.ts` (fix),
  `src/app/globals.css`, `src/app/(dashboard)/insights/page.tsx`,
  `src/app/(dashboard)/programas/[id]/page.tsx`,
  `src/components/workouts/ExerciseLibrary.tsx`,
  `src/components/workouts/ExerciseHistoryModal.tsx`,
  `src/components/plano/PlannedWorkoutComparisonView.tsx`
- Doc: `EXERCISE-DETAIL-EXPERIENCE.md` (novo), `CHANGELOG.md`,
  `ROADMAP_SPRINTS.md`

## Pendências reais

- Sem rota para abrir um `CompletedWorkout` livre por ID — recordes/timeline
  de treinos livres não linkam para a execução em si.
- Sem testes de componente React (convenção do projeto: só motor puro
  testado; UI via QA manual).
- Gamificação de novos recordes não conectada a XP/badges.
- `ROADMAP_SPRINTS.md` não tinha entrada para a Sprint 21 (drift de
  documentação pré-existente a esta parte — sinalizado, não corrigido
  retroativamente para não expandir o escopo desta sprint).

## Próximo passo recomendado

Se o produto quiser fechar as pendências: (1) uma rota mínima para abrir um
`CompletedWorkout` por ID resolveria os links de execução em recordes e
treinos livres na timeline; (2) conectar `detectNewExerciseRecords` a um
evento de gamificação no momento da conclusão da sessão (não ao abrir a
página) fecharia a Sprint 22 §37.
