# Coach Engine — composição e persistência (Sprint 26)

## Ponto de entrada único

```ts
runCoachEngine(period: AnalyticsPeriod, now?: Date): CoachReport
```

`src/lib/coach/engine.ts` compõe, nesta ordem: `buildCoachSignals` (sinais,
ver `COACH-SIGNALS.md`) → `assembleRecommendations` (regras + prioridade +
decisões, ver `COACH-RULES.md`) → agrupamento em `high`/`medium`/`low`. Mesmo
padrão de `analytics/dashboard.buildDashboardAnalytics`: uma função pura sem
memoização interna, chamada pela UI a cada montagem/troca de período
(`CoachSection.tsx`).

## Prioridade e confiança (`priority.ts`)

Nenhuma IA, nenhuma heurística estatística opaca — duas escalas fixas:

- **Confiança** — só do tamanho de amostra: `< 3` baixa, `3-5` média, `≥ 6` alta.
- **Prioridade** — do `weight` (0-1) que a regra atribuiu ao achado: `≥ 0.7`
  E confiança não-baixa → alta; `≥ 0.4` → média; caso contrário → baixa. Um
  achado com pouca amostra NUNCA vira prioridade alta, mesmo com `weight`
  alto — pouca amostra é justamente o cenário onde o desvio é mais provável
  de ser ruído.

## Ids determinísticos

`buildRecommendationId(ruleId, period, scopeKey)` produz
`${ruleId}:${period}` ou `${ruleId}:${period}:${scopeKey}` (quando a regra
dispara por entidade, ex.: um exercício ou grupo muscular). Mesma condição +
mesmo período + mesmo escopo sempre produz o mesmo id — é isso que permite a
decisão do usuário sobreviver a um recálculo.

## Explicabilidade (`explanations.ts`)

Toda `CoachRecommendation` responde às 4 perguntas exigidas pela spec via
`buildExplanation()`: título, resumo, evidências, período analisado, regra
aplicada (`ruleId`, com descrição legível em `COACH_RULE_DESCRIPTIONS`) e
sugestão. Nenhuma recomendação é gerada sem essas 6 informações — são campos
obrigatórios do tipo `CoachRecommendation`, não opcionais preenchidos depois.

## Persistência de decisões (`decisions.ts`)

Mesmo padrão de `adaptive-recommendation-decisions.ts` (Sprint 21):
localStorage (`lrpg-fit:coach-decisions`), só o ESTADO da decisão é
persistido, nunca o resultado de um cálculo.

| Status | Como é determinado |
|---|---|
| `nova` | nenhuma decisão registrada para este id |
| `visualizada` | usuário expandiu "Ver detalhes" pela primeira vez |
| `ignorada` | usuário clicou "Ignorar" |
| `aceita` | usuário clicou "Aceitar" — **nunca** aplica a mudança sozinho, só registra a decisão (regra "NÃO IMPLEMENTAR" da spec) |
| `expirada` | uma decisão `aceita` com mais de 14 dias — sinaliza que os dados podem ter mudado, sem apagar o histórico da decisão |

Decidir de novo sobre o mesmo id substitui a decisão anterior (idempotente,
nunca empilha).

## Recálculo

Cada abertura do Dashboard chama `runCoachEngine` do zero — todos os sinais e
regras são recomputados a partir do estado atual de `localStorage`. Só a
decisão do usuário (acima) sobrevive entre chamadas, porque `decisions.ts` é
a única parte do Coach com estado persistido.

## Testes

`engine.test.ts` cobre: histórico vazio (relatório vazio bem formado, sem
lançar exceção), agrupamento por prioridade reconstrói a lista completa, e
determinismo (mesma entrada produz a mesma lista em duas chamadas
sucessivas). `decisions.test.ts` cobre persistência, idempotência e reset.
