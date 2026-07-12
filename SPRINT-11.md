# Sprint 11 — Workout Planner & Recovery Intelligence

## Objetivo

Transformar o Fitness Life RPG de um registrador de treinos em um planejador: indicar
automaticamente qual treino faz mais sentido hoje, com base em recuperação muscular por grupo.
Toda a lógica é local, determinística e sem IA — camada aditiva, sem alterar XP, níveis,
badges, histórico, backup ou sessão ativa.

## 1. Auditoria

### Modelo de dados existente

- `Exercise.muscle_groups` (`src/types/database.ts`) é um array de **strings livres em
  português** (`'peitoral'`, `'peitoral superior'`, `'latíssimo'`, `'costas média'`,
  `'deltoide lateral'`, `'corpo todo'`, `'cardiovascular'`, etc. — ver `src/lib/mock/data.ts`),
  com granularidade inconsistente. **Não existia nenhum enum canônico de grupo muscular.**
- `lib/workout-history.ts` já expõe `getWorkoutHistory()` (mais recente primeiro),
  `getLastWorkout()`, `getExerciseHistory()`, `getExercisePersonalBest()` — reutilizados sem
  modificação.
- `lib/custom-workouts.ts` já expõe `getAllExercises()` (mescla exercícios mock + customizados)
  — reutilizado para resolver `exerciseId → muscle_groups` no histórico.
- Já existia um motor de recomendação **por preferências** (`lib/recommendations.ts`,
  `RecommendationCard` no Dashboard, selo "✨ para você" em `/treinos`) — baseado em
  objetivo/equipamento/duração declarados no onboarding, sem nenhum sinal de recuperação
  muscular. **Decisão confirmada com o usuário:** os dois sistemas convivem em paralelo; nada em
  `recommendations.ts` foi alterado.

### Gap identificado e decisão

Sem taxonomia canônica de grupo muscular, foi criada uma camada de normalização aditiva
(`src/lib/muscle-groups.ts`) que mapeia os termos livres observados nos dados mock para 7
grupos canônicos, sem tocar no dado bruto (`Exercise.muscle_groups` permanece como está).

## 2. Algoritmo de recuperação

Constante central (`RECOVERY_HOURS`, `src/lib/muscle-groups.ts`):

| Grupo | Janela de recuperação |
|---|---|
| Peito | 72h |
| Costas | 72h |
| Pernas | 96h |
| Ombros | 48h |
| Bíceps | 48h |
| Tríceps | 48h |
| Core | 24h |

Para cada grupo muscular, `getMuscleRecoveryStates()` (`src/lib/workout-recovery.ts`) varre
`getWorkoutHistory()` (já ordenado do mais recente ao mais antigo) resolvendo
`exercises[].exerciseId → Exercise.muscle_groups → normalizeMuscleGroups()`; a primeira
ocorrência por grupo é seu treino mais recente. `recoveryPercent = clamp(horasDesde /
RECOVERY_HOURS[grupo] * 100, 0, 100)` — sem histórico, 100%. Status: `>=100%` recuperado (🟢),
`>=50%` parcial (🟡), abaixo fatigado (🔴).

Termos sem grupo canônico mapeável (`'cardiovascular'`, `'corpo todo'`, `'pescoço'`) são
ignorados — não representam um grupo com recuperação limitada nesta v1.

## 3. Algoritmo de score e ranking

`getWorkoutRecoveryInfo()` calcula o score de um treino a partir do **grupo muscular mais
fatigado entre os seus** (bottleneck), não da média entre grupos — descoberto como correção
necessária durante o QA manual (ver seção 6). Casos:

1. **Sessão ativa nesse treino**: `status: 'active'`, `score: -1` — sempre por último, nunca
   escondido.
2. **Sem grupo muscular mapeável** (ex.: treino puramente cardio): sempre disponível
   (`score: 100`).
3. **Nunca executado**: `score = bottleneck + 20` (capado em 100), reason "Novo treino — nunca
   realizado".
4. **Executado antes**: `score = bottleneck`; reason cita o grupo mais fatigado e há quantas
   horas foi treinado.

Empate (`rankWorkoutsByRecovery`): desempate por `lastCompletedAt` ascendente (nunca
feito/mais antigo primeiro), depois por nome do treino — ranking 100% determinístico e
testável. `getRecommendedWorkout()` retorna o topo do ranking, ou `null` se o único candidato
estiver com sessão ativa.

## 4. Componentes

- `WorkoutRecommendationCard` (Dashboard) — card "Treino Recomendado" auto-suficiente (mesmo
  padrão de busca de dados do `LastWorkout.tsx`), com nome, motivo, pills de grupo muscular,
  tempo desde a última execução e CTA "Iniciar treino" (link para `/treinos`, mesmo padrão do
  `RecommendationCard` existente — não duplica a lógica de conflito de sessão ativa que só
  existe em `treinos/page.tsx`).
- `RecoveryBadge`, `RecoveryIndicator`, `WorkoutStatus`, `WorkoutRecommendationReason`
  (`src/components/workouts/`) — badges de status 🟢/🟡/🔴/🆕/⏱️, indicador de última execução,
  composição usada dentro de `WorkoutCard`.

## 5. Arquivos criados / alterados

**Criados:**
`src/lib/muscle-groups.ts`, `src/lib/muscle-groups.test.ts`, `src/lib/workout-recovery.ts`,
`src/lib/workout-recovery.test.ts`, `src/components/workouts/RecoveryBadge.tsx`,
`src/components/workouts/RecoveryIndicator.tsx`, `src/components/workouts/WorkoutStatus.tsx`,
`src/components/workouts/WorkoutRecommendationReason.tsx`,
`src/components/dashboard/WorkoutRecommendationCard.tsx`.

**Alterados:**
`src/components/workouts/WorkoutCard.tsx` (prop `recovery`/`isTopRecoveryPick`, aditivo),
`src/app/(dashboard)/treinos/page.tsx` (ranking + ordenação + selo "⭐ Recomendado hoje",
gateado por `useMounted()`), `src/app/(dashboard)/dashboard/page.tsx` (novo card),
`src/styles/workouts.css`, `src/styles/components.css` (classes novas, zero hex solto).

Nenhuma store Zustand, `lib/workout-history.ts`, `lib/custom-workouts.ts` ou
`lib/recommendations.ts` foi modificada.

## 6. Bug encontrado e corrigido durante o QA manual

### 🟠 Score por média mascarava o grupo muscular travado

**Sintoma:** um treino podia exibir selo 🔴 "Em recuperação" e ainda assim ranquear **acima**
de outro treino 🟡 "Recuperação parcial" — a ordenação (score médio) divergia do status exibido
(pior grupo).
**Causa raiz:** `score` era a média de `recoveryPercent` entre os grupos do treino; `status` já
usava o pior grupo. Um treino com um grupo travado e outros recuperados tinha média alta mas
status vermelho.
**Correção:** score passou a usar o mesmo grupo "bottleneck" do status (`bottleneckRecovery =
mostFatigued.recoveryPercent`), eliminando a divergência. Teste de regressão adicionado
(`workout-recovery.test.ts`, "scores a multi-group workout by its most-fatigued group").

### 🟡 Hydration mismatch potencial em `/treinos` (prevenido, não chegou a produção)

Ao implementar a ordenação por recuperação, o cálculo (`rankWorkoutsByRecovery`,
`getAllExercises`/`getWorkoutHistory`, que leem `localStorage`) rodava incondicionalmente no
corpo do componente — divergindo entre o HTML do servidor (sem `localStorage`) e o primeiro
render do cliente, mesma classe de bug corrigida no Sprint 9. Corrigido gateando o cálculo por
`useMounted()` (`src/hooks/useHasHydrated.ts`, já existente) antes de existir em produção —
confirmado 0 erros de console após o fix, com e sem histórico semeado.

## 7. Casos especiais cobertos

| Caso | Comportamento |
|---|---|
| Apenas um treino | Recomendado, salvo se tiver sessão ativa (então `getRecommendedWorkout` retorna `null`) |
| Nunca realizado | Reason "Novo treino — nunca realizado", bônus no score |
| Todos fatigados | Nenhum escondido; o menos fatigado assume a recomendação |
| Sessão ativa | Cai para o fim do ranking, nunca escondido, reason "Sessão ativa em andamento" |
| Nenhum treino cadastrado | `WorkoutRecommendationCard` mostra empty state dedicado |
| Grupo muscular não mapeável (ex.: cardio puro) | Treino sempre disponível |
| Empate de score | Desempate determinístico (data mais antiga → nome alfabético) |

## 8. Testes

32 testes novos, 63/63 no total do projeto:
- `muscle-groups.test.ts` (11) — normalização de termos, case/acento, grupos ignorados.
- `workout-recovery.test.ts` (21) — recuperação por grupo, score, nunca realizado, sessão
  ativa, empate, grupo não mapeável, bottleneck vs. média, formatação de tempo relativo.

## 9. QA

Playwright + msedge (histórico semeado com datas variadas por grupo muscular, replicando o
padrão de `docs/screenshots/sprint7`–`sprint9`):
- Dashboard: card "Treino Recomendado" correto em todos os cenários (vazio, com histórico,
  sessão ativa no topo do ranking).
- `/treinos`: ordenação e selo "⭐ Recomendado hoje" corretos; badges 🟢/🟡/🔴/🆕/⏱️ batendo com
  o histórico simulado; nenhum treino escondido; sessão ativa demovida ao fim da lista sem
  desaparecer.
- 0 erros de console em todos os cenários (confirmado em aba nova, isolada de ruído de console
  acumulado de sessões anteriores de teste).
- Screenshots desktop (1440px) + mobile (390px) em `docs/screenshots/sprint11/`.

## 10. Gates

`npm run lint`, `npx tsc --noEmit`, `npm run test` (63/63), `npm run build` — todos limpos.

## 11. Pendências / próximos passos

- Commit, deploy e validação em produção **não foram feitos** — aguardando confirmação
  explícita do usuário antes de `git push`/deploy na Vercel.
- Início direto de treino a partir do card do Dashboard (sem passar por `/treinos`) ficaria
  mais rico se a lógica de conflito de sessão ativa (`pendingStart`/`ConfirmDialog`, hoje só em
  `treinos/page.tsx`) fosse extraída para um hook compartilhado — sinalizado no plano, não
  implementado nesta sprint por estar fora do escopo pedido.
