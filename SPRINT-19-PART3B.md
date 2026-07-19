# Sprint 19 — Parte 3B: Wellness Associations in Training Cycles

**Status:** concluída
**Data:** 2026-07-19

## Objetivo

Consolidar bem-estar por ciclo de treino: médias, cobertura, tendência interna (primeira vs. segunda
metade do ciclo) e associações bem-estar × treino restritas ao intervalo do ciclo. Integrar essa leitura
ao resumo de ciclo, à revisão de ciclo (contexto somente leitura) e à comparação entre ciclos — sem tocar
Dashboard, Insights, Perfil, XP, badges ou a lógica de prontidão/readiness.

## Auditoria (Fase 1)

Respostas às perguntas do spec, confirmadas por leitura de código antes de escrever qualquer linha nova:

1. **O resumo atual de ciclo já recebe check-ins?** Sim — `training-cycle-summary.ts` já filtra
   `getCheckIns()` pelo intervalo do ciclo e calcula `averageReadiness` via `computeReadinessStats`.
2. **A média de prontidão já é calculada por ciclo?** Sim, com a fórmula
   `((energia + sono + (6 - dor) + motivação) / 4) * 10`, arredondada a 1 casa. Reaproveitada (não
   duplicada) via `buildCycleSummary(cycle, now).averageReadiness`.
3. **Regra atual de corte por `startedAt`/`completedAt`?** `resolveEndDate` em
   `training-cycle-summary.ts`: `completedAt` se o ciclo foi encerrado, senão `now`. A mesma regra foi
   replicada em `getCycleDateRange` (Fase 4).
4. **Ciclos ativos usam a data atual como limite?** Sim.
5. **Ciclos arquivados mantêm `completedAt`?** Sim — `archiveCycle` em `training-cycles.ts` faz spread do
   ciclo existente e só troca `status`/`updatedAt`; `completedAt` nunca é limpo.
6. **Como semanas parciais são tratadas hoje?** Não havia tratamento explícito nos motores de bem-estar.
   Decisão tomada nesta sprint: os agregados semanais para associações são construídos **apenas** a partir
   de sessões já filtradas para o intervalo do ciclo — uma semana que atravessa a borda do ciclo reflete
   naturalmente só os dias dentro dele, sem precisar de um adaptador de corte especial (ver Fase 11 abaixo).
7. **A comparação atual já suporta campos opcionais?** Sim — `training-cycle-comparison.ts` usa
   `MetricComparison` com `status: 'not_comparable'` para dados ausentes; o mesmo padrão foi seguido em
   `CycleWellnessMetricComparison`.
8. **Como evitar duplicar médias já calculadas?** `averageReadiness` do novo `CycleWellnessSummary` chama
   `buildCycleSummary` em vez de recalcular a fórmula de prontidão.
9. **Qual componente deve renderizar o novo bloco?** Novo componente dedicado
   `CycleWellnessSection.tsx`, reutilizado em `CycleSection.tsx` (ciclo ativo) e `CycleHistorySection.tsx`
   (ciclos concluídos/arquivados expandidos) — evita duplicar o card e mantém `CycleSummaryCard`
   inalterado.
10. **Como incluir contexto na revisão sem preencher respostas?** Prop opcional `wellnessSummary` em
    `CycleReviewForm`, renderizada como bloco somente leitura acima das perguntas — não é lido por
    nenhum `useState` do formulário e não é enviado em `NewCycleReviewInput`.
11. **Como filtrar associações pelo intervalo correto?** `computeAllWellnessTrainingAssociations` recebe
    check-ins já filtrados pelo ciclo e agregados semanais construídos só a partir de sessões do ciclo.
12. **Amostra mínima dentro de um ciclo?** `minimumCheckIns: 4` (médias/status), `minimumCheckInsPerHalf: 3`
    (tendência interna), `minimumWeeksForAssociations` herdado do padrão de `wellness-associations.ts` (4).
13. **Ciclos curtos?** Se qualquer metade do ciclo não atinge `minimumCheckInsPerHalf`, a tendência daquela
    métrica é `insufficient_data`; se todas as tendências ficam insuficientes, a mensagem explícita
    "Este ciclo ainda é curto demais para comparar tendências internas." é adicionada.
14. **Ciclos com poucos check-ins?** `dataStatus: 'insufficient_data'` com mensagem explícita; nunca
    apresentado como indisponível — os dados que existem (contagem, médias parciais) continuam visíveis.
15. **Como impedir regressão na comparação existente?** `CycleWellnessComparison` é uma estrutura
    inteiramente nova, adicionada como seção extra em `CycleComparisonSection.tsx` sem alterar nenhum
    campo/lógica de `TrainingCycleComparison` existente. Suite completa (603 testes) rodada antes e depois.

## Arquitetura

### `src/lib/training-cycle-wellness.ts` (novo, motor puro)

- **`getCycleDateRange(cycle, now?)`** — replica a regra de corte de `training-cycle-summary.ts`.
- **`filterCheckInsForCycle(cycle, checkIns, now?)`** — inclui o primeiro e o último dia do ciclo; não
  deduplica múltiplos check-ins no mesmo dia.
- **`buildCycleWellnessSummary(cycle, checkIns?, workouts?, now?, config?)`** — engine principal:
  - médias por campo, ignorando ausência (nunca trata campo faltante como zero);
  - cobertura (`coveredDays` / dias corridos do ciclo);
  - tendência interna por metade do ciclo (`increasing` / `stable` / `decreasing` / `irregular` /
    `insufficient_data`), com `irregular` detectado por coeficiente de variação alto dentro das duas
    metades, não apenas pela diferença entre elas;
  - associações restritas ao ciclo, selecionadas (no máximo `maximumAssociationsShown = 3`) priorizando
    achados com direção clara e maior confiança/amostra sobre achados neutros;
  - `dataStatus`: `no_data` / `insufficient_data` / `partial` (ciclo ativo, ou nenhuma tendência calculável)
    / `available`;
  - mensagens determinísticas, sempre em linguagem de coincidência, nunca causal — testado explicitamente
    contra frases como "fez você", "causou", "porque você", "devido a".
- **`compareCycleWellness(summaryA, summaryB, config?)`** — compara métricas com amostra mínima em ambos
  os lados (`comparable` / `insufficient_cycle_a` / `insufficient_cycle_b` / `insufficient_both`), nunca
  declara vencedor, sinaliza diferença de duração e de tamanho de amostra entre os ciclos.

O módulo não importa nenhum componente, não lê `localStorage` diretamente (delega a `getCheckIns` /
`getWorkoutHistory` como *defaults* injetáveis) e não persiste nada — tudo é recalculado em runtime.

### Semanas parciais (Fase 11)

Em vez de um adaptador de corte de semana, `buildCycleWeekSummaries` monta os agregados semanais só a
partir de `cycleWorkouts` (já filtrados pelo intervalo do ciclo). Uma semana ISO que começa antes do
início do ciclo automaticamente conta apenas as sessões que já estavam dentro do ciclo, porque as sessões
de fora já foram excluídas antes da agregação — decisão mais simples que um corte por data dentro da
própria semana, e testada explicitamente (`does not include sessions outside the cycle...`).

### Circularidade (Fase 13)

`wellness-associations.ts` já nunca compara bem-estar contra o score de prontidão (só contra frequência,
volume e uso de ajustes) — não havia associação circular a filtrar no motor de associações em si. O
`CycleWellnessSummary` ainda assim expõe uma nota informativa fixa quando há check-ins no período,
alinhada à mesma constante conceitual `isReadinessCompositionMetric` de `wellness-associations.ts`.

### UI

- **`CycleWellnessSection.tsx`** (novo) — card "Bem-estar durante o ciclo": métricas principais (sono,
  energia, estresse, dor muscular) sempre visíveis; "Ver detalhes" expande qualidade do sono/humor/
  motivação, tendências, associações selecionadas e mensagens. Estado vazio explícito quando
  `dataStatus === 'no_data'`.
- **`CycleSection.tsx`** — renderiza `CycleWellnessSection` abaixo do `CycleSummaryCard` do ciclo ativo;
  passa `wellnessSummary` ao `CycleReviewForm` ao abrir qualquer revisão.
- **`CycleHistorySection.tsx`** — renderiza `CycleWellnessSection` nos ciclos concluídos e arquivados
  expandidos.
- **`CycleReviewForm.tsx`** — bloco somente leitura "Contexto do ciclo" (check-ins, sono médio, energia
  média, prontidão média) acima das perguntas, oculto quando não há check-ins; nunca preenche respostas
  nem é enviado com a revisão.
- **`CycleComparisonSection.tsx`** — nova seção "Bem-estar" dentro do comparador existente, sem alterar
  layout ou lógica das seções de treino/exercícios/grupos musculares já existentes.

## Testes

`src/lib/training-cycle-wellness.test.ts` — 29 testes novos cobrindo: intervalo do ciclo (ativo/concluído/
arquivado), filtragem de check-ins (antes/depois/primeiro dia/último dia/múltiplos no mesmo dia), médias
que ignoram campo ausente, cobertura, todas as direções de tendência (`increasing`/`decreasing`/`stable`/
`irregular`/`insufficient_data`), ciclo curto, semana parcial na borda do ciclo, limite de associações
mostradas, ciclo ativo vs. arquivado produzindo a mesma análise, ciclo sem nenhum check-in sem lançar,
ausência de linguagem causal nas mensagens, e toda a matriz de `compareCycleWellness` (ambos sem dados,
só um sem dados, comparável, sem declarar vencedor, gap de amostra sinalizado, durações diferentes).

**Total da suíte: 603 testes (574 pré-existentes + 29 novos), todos passando.**

## Gates

- `tsc --noEmit`: limpo.
- `eslint` nos arquivos novos/alterados: limpo.
- `vitest run`: 35 arquivos de teste, 603 testes, todos passando.
- `next build`: build de produção limpo (19 rotas geradas, sem erros de tipo ou lint).

## QA manual

Verificado no dev server (`/plano` → aba Ciclo) com dados já existentes no ambiente local:

- Ciclo concluído sem check-ins → bloco "Bem-estar durante o ciclo" mostra o estado vazio correto.
- Comparação entre os dois ciclos concluídos existentes → seção "Bem-estar" aparece dentro do comparador,
  mostra a mensagem "Nenhum dos dois ciclos possui check-ins registrados para comparar." sem quebrar o
  layout das seções de treino/exercícios/grupos musculares já existentes.
- Abrir "Adicionar revisão final" → bloco de contexto corretamente **ausente** (o ciclo seedado não tem
  check-ins), confirmando que o bloco não aparece com dado zerado.

**Limitação desta rodada de QA**: o ambiente local não tinha um ciclo com check-ins de bem-estar
registrados, então os estados "available"/"partial" com dados reais (tendências, associações, contexto de
revisão preenchido) não foram verificados visualmente nesta sessão — apenas via os 29 testes automatizados,
que cobrem esses casos com dados sintéticos. Screenshots formais (Fase 31) e checagem de acessibilidade
dedicada (Fase 32) ficam para uma verificação futura com dados de bem-estar reais no ambiente.

## Itens adiados / fora de escopo (conforme instruído)

- Dashboard, página global de Insights, Perfil — não tocados.
- Novos campos de check-in, alteração do formulário de readiness, novas associações, correlação
  estatística avançada — não implementados.
- Persistência de métricas derivadas — nada é salvo; tudo é recalculado em runtime a cada leitura.
- Screenshots desktop/mobile formais e auditoria de acessibilidade dedicada (leitor de tela, contraste) —
  não realizadas nesta sessão por falta de dados de bem-estar reais no ambiente de QA; recomendado revisar
  quando houver check-ins reais disponíveis.

## Status do Git

Nenhuma alteração foi enviada ao remoto — todos os arquivos abaixo estão apenas no working tree local,
aguardando revisão do usuário antes de commit/push.

### Arquivos criados

- `src/lib/training-cycle-wellness.ts`
- `src/lib/training-cycle-wellness.test.ts`
- `src/components/plano/CycleWellnessSection.tsx`
- `SPRINT-19-PART3B.md`

### Arquivos alterados

- `src/components/plano/CycleSection.tsx`
- `src/components/plano/CycleHistorySection.tsx`
- `src/components/plano/CycleReviewForm.tsx`
- `src/components/plano/CycleComparisonSection.tsx`
