# Sprint 26 — Coach Mode Foundation: Deterministic Training Coach

**Objetivo:** motor de interpretação determinístico que combina sinais já
produzidos pelos motores existentes (Analytics 2.0, Exercise Intelligence,
Readiness, Recovery, Program Adherence) em recomendações explicáveis, mais a
UI que expõe isso dentro da rota `/dashboard` já existente. O Coach **não**
é IA, **não** usa LLM, **não** gera texto arbitrário e **nunca** aplica
mudanças automaticamente — só interpreta e sugere. Ver `COACH-SIGNALS.md`,
`COACH-RULES.md`, `COACH-ENGINE.md` e `COACH-EXPLAINABILITY.md` para o
detalhe de cada camada.

## Auditoria (obrigatória antes de qualquer código)

Agente de exploração mapeou todos os motores candidatos a sinal do Coach
antes de qualquer implementação (ver histórico de sessão). Conclusões que
guiaram o design:

- Nenhum motor de Analytics/domínio lê zustand — todos leem `localStorage`
  diretamente via funções puras em `src/lib/*.ts`. O Coach segue o mesmo
  padrão: chama os motores existentes diretamente, sem introduzir uma nova
  camada de store.
- `analytics/dashboard.buildDashboardAnalytics(period)` já é a composição
  raiz ideal para o Coach reaproveitar — cobre performance, consistência,
  balanceamento muscular, fadiga (que já cruza carga × prontidão ×
  recuperação) e progresso num único ponto de entrada.
- Só dois dados precisavam de uma chamada adicional além de
  `buildDashboardAnalytics`: tendência de carga por exercício
  (`exercise-intelligence.getExerciseTrends`, para a evidência de
  estagnação) e recordes recentes (`exercise-records.getRecentRecords`, sem
  equivalente em Analytics 2.0).
- `adaptive-recommendation-decisions.ts` (Sprint 21) já estabeleceu o padrão
  de persistência de decisão (localStorage, só o estado, nunca o resultado)
  — `coach/decisions.ts` segue o mesmo padrão em vez de inventar um novo.

Nenhum motor existente foi modificado. Nenhum cálculo foi duplicado.

## Escopo executado (Partes 1-4)

- **Parte 1-2 — Fundação, sinais e regras** (`2de4cea`): `types.ts`
  (vocabulário compartilhado), `helpers.ts`, `signals.ts` (adaptação dos
  motores existentes, ver `COACH-SIGNALS.md`), `rules.ts` (9 regras
  determinísticas, ver `COACH-RULES.md`), `priority.ts` (prioridade +
  confiança), `explanations.ts` (explicabilidade), `recommendations.ts`
  (montagem + decisões), `decisions.ts` (persistência), `engine.ts` (ponto
  de entrada único). Entregues juntas porque a divisão original em duas
  partes (fundação vs. sinais/regras) não tinha um limite útil de "parar e
  ficar usável" no meio — sinais sem regras não produzem nada testável.
- **Parte 3 — Engine + Dashboard UI** (`76f0597`): seção "Coach" dentro do
  Dashboard, cards por recomendação agrupados por prioridade
  (Alta/Média/Baixa), filtro de período, explicações expansíveis, ações de
  navegação, decisões Aceitar/Ignorar persistidas.
- **Parte 4 — QA + Documentação** (este commit): QA manual real (dev server
  + browser, dados reais), os documentos listados acima, e este relatório.

## Arquivos de motor (`src/lib/coach/`)

`types.ts`, `helpers.ts`, `signals.ts`, `rules.ts`, `priority.ts`,
`explanations.ts`, `recommendations.ts`, `decisions.ts`, `engine.ts` — 9
arquivos de motor + 7 arquivos de teste (`*.test.ts`) + `test-fixtures.ts`
(fixtures compartilhadas, sem sufixo `.test.ts`, não coletado pelo vitest).

## UI construída (Parte 3)

Nova seção "Coach" dentro da rota `/dashboard` existente
(`src/app/(dashboard)/dashboard/page.tsx`, entre `TodaySection`/cards de
domínio e a seção "Analytics") — **não** uma rota nova nem item de
navegação novo (decisão de navegação travada no Sprint 1, CLAUDE.md regra
6). Componentes novos em `src/components/dashboard/coach/`:

- `CoachSection.tsx` — orquestrador: filtro de período (6 opções, mesmo
  `PERIOD_OPTIONS` de Analytics), agrupamento Alta/Média/Baixa prioridade,
  guard de hydration (`mounted`), toggle "Mostrar ignoradas".
- `CoachRecommendationCard.tsx` — card independente por recomendação
  (regra "LAYOUT" da spec); colapsado mostra título/resumo/badges;
  expandido mostra evidências/período/regra/sugestão/ações; marca
  `visualizada` na primeira expansão; botões Aceitar/Ignorar somem depois
  de decididos.
- `coach-ui.ts` — vocabulário de apresentação compartilhado (labels/badges
  em pt-BR, mapeamento de `CoachActionKind` para rota), sem lógica de
  negócio.

Nenhuma store foi tocada. Novo campo de `localStorage`:
`lrpg-fit:coach-decisions` (só estado de decisão, nunca resultado de
cálculo — ver `COACH-ENGINE.md`).

## Bug real encontrado e corrigido em QA

Com dados reais de dev (poucas sessões no período), `Peito` apareceu
simultaneamente como "participação baixa" (`Coach.Muscle.Neglected`) e
"volume desproporcional" (`Coach.Volume.Imbalance`) — contraditório.
Causa raiz: `analytics/muscle-balance.ts` classifica `neglectedGroups` por
um limiar de séries/semana e `excessiveGroups` por uma fatia do período
inteiro, bases de cálculo diferentes que podem convergir no mesmo grupo com
amostra pequena. **Correção**: `Coach.Muscle.Neglected` agora suprime o
achado para qualquer grupo já presente em `excessiveGroups` — nenhum motor
existente foi alterado (CLAUDE.md regra 2), a deconflição acontece só na
camada do Coach. Coberto por teste dedicado em `rules.test.ts`. Ver
`COACH-RULES.md` para o detalhe completo.

## QA manual (dev server + browser real)

Servidor `npm run dev` (config `fitness-rpg`), dados reais já seedados em
`localStorage` de sessões anteriores:

- Seção "Coach" renderizada com dados reais, 3 grupos de prioridade
  corretos, badges de categoria/status corretos.
- Fluxo completo testado por interação real: clicar "Ver detalhes" → status
  muda de "Nova" para "Visualizada" automaticamente → evidências/período/
  regra/sugestão renderizados na ordem exata da spec → link de ação
  navegável (`/plano`) → clicar "Aceitar" → status muda para "Aceita",
  botões de decisão somem.
- **Persistência confirmada**: reload completo da página, decisão "Aceita"
  sobrevive (`localStorage["lrpg-fit:coach-decisions"]` inspecionado
  diretamente), recomendação recalculada do zero mas com o status correto.
- Zero erros de console em toda a sessão.
- Mobile (375px) e tablet (768px): zero overflow horizontal
  (`scrollWidth <= clientWidth` verificado via JS), seção Coach renderiza
  dentro da largura da viewport em ambos.
- `localStorage` de QA limpo ao final (decisão de teste removida antes de
  encerrar a sessão).

## Testes

45 testes novos em `src/lib/coach/*.test.ts` cobrindo: sinais (histórico
vazio, estagnação detectada, recordes recentes), todas as 9 regras
(positivo/negativo/gates de amostra/conflito real), prioridade/confiança
(limites exatos), explicabilidade (shape completo + inventário de
descrições), decisões (persistência/idempotência/reset), montagem de
recomendações (status/expiração/ordenação/determinismo) e o engine
(vazio/agrupamento/determinismo). Total após a sprint: **1092 testes**
(1091 passando + 1 falha pré-existente não relacionada — ver Gates). Sem
testes de componente React (mesma convenção mantida desde as Sprints 22-25
— projeto nunca usou React Testing Library, cobertura de UI via QA manual
real no browser).

## Gates

```
Lint:      aprovado (0 warnings/errors)
Typecheck: aprovado (0 erros)
Tests:     1091/1092 (1 falha pré-existente: program-instantiation.test.ts
           "next monday is always a Monday" — depende do dia real do
           sistema/relógio, não relacionada a esta sprint)
Build:     aprovado (21 rotas geradas, sem rota nova)
```

## Commits

- Partes 1-2 — `feat: add coach engine foundation, signals and deterministic rules (Sprint 26 parts 1-2)` (`2de4cea`)
- Parte 3 — `feat: add coach dashboard experience (Sprint 26 part 3)` (`76f0597`)
- Parte 4 — `docs: finalize coach mode documentation and QA (Sprint 26 part 4)` (este commit)

Nenhum commit enviado ao remoto (`origin/master` segue parado desde a
Sprint 20 Parte 1 — ver memória de sessão).

## Pendências conscientes

- `Coach.Frequency.LongGap` e `Coach.Muscle.Neglected` usam `sampleSize: 1`
  por design (são leituras diretas de um fato, não uma amostra estatística
  agregada) — sempre resultam em confiança "baixa" mesmo quando o dado é
  sólido. Documentado no código; mudar isso exigiria uma segunda noção de
  "confiança" fora da escala uniforme de amostra usada pelas outras 7
  regras, o que pareceu mais complexidade do que o ganho justifica nesta
  sprint (YAGNI).
- Sem testes de componente React (convenção mantida do projeto, ver decisão
  acima) — cobertura de UI é só QA manual.
- `Coach.Progress.Stagnation` reaproveita o mesmo id de regra tanto para
  "progressão" quanto "estagnação" (decisão documentada em
  `COACH-RULES.md`) — se o produto precisar tratá-los como conceitos
  distintos no futuro (ex.: um limiar de tempo diferente para cada), isso
  exigiria desdobrar a regra.
- Flake pré-existente em `program-instantiation.test.ts` não investigado
  (fora de escopo desta sprint, conforme instrução).

## Próximo passo recomendado

Coach Mode Foundation está completo (motor + UI + QA real) e fecha o
Sprint 26. Recomendação: **Sprint 27 — Adaptive Planning 2.0** antes de
Health Integrations — o Coach agora produz sinais estruturados
(`CoachRecommendation`) que uma camada de planejamento adaptativo futura
poderia consumir diretamente (ex.: pré-preencher ajustes sugeridos no
Planner a partir de uma recomendação aceita, sempre com confirmação
explícita do usuário). Health Integrations depende de decisões de produto
externas (qual provedor, quais dados) que não foram avaliadas nesta sprint;
Adaptive Planning 2.0 é a extensão natural do que já existe.
