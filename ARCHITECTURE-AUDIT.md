# Architecture Audit — Sprint 31

Auditoria completa de `src/app`, `src/components`, `src/features`, `src/lib`,
`src/stores`. Metodologia: leitura + grep verificado, não inferência — todo
achado abaixo tem `arquivo:linha` conferido.

## Mapa de módulos

| Domínio | Localização |
|---|---|
| Dashboard | `src/app/(dashboard)/dashboard/`, `src/components/dashboard/*` |
| Programs | `src/app/(dashboard)/programas/`, `src/lib/training-programs.ts`, `program-instantiation.ts`, `program-adherence.ts`, `program-progress.ts` |
| Planning (ciclos/metas/adaptativo) | `src/app/(dashboard)/plano/`, `src/lib/training-cycles*.ts`, `training-goals*.ts`, `src/lib/adaptive-planning/*` |
| Coach | `src/lib/coach/*` (engine, rules, signals, priority, decisions, explanations) |
| Analytics | `src/lib/analytics/*` (consistency, fatigue, muscle-balance, performance, progress, dashboard) |
| Exercise intelligence | `src/lib/exercise-intelligence.ts`, `exercise-detail-engine.ts`, `exercise-records.ts`, `exercise-highlights.ts` |
| Health data | `src/lib/health-data/*` (+ `export/`, `import-mapping/`) |
| Recovery/readiness | `src/lib/workout-readiness.ts`, `workout-recovery.ts`, `readiness-check-ins.ts`, `wellness-*.ts` |
| Backup/restore | `src/lib/backup.ts` |
| Gamificação | `src/lib/badges.ts`, `attributes.ts`, `progression.ts`, `daily-missions.ts`, `reward-events.ts` |
| Body progress | `src/lib/body-progress*.ts` |
| Histórico | `src/lib/workout-history.ts`, `workout-detail-engine.ts` |
| Sessão | `src/stores/useSessionStore.ts`, `src/lib/active-workout.ts`, `session-adjustments.ts` |
| Nutrição/Diário | `src/lib/nutrition.ts`, `daily-log.ts` |

## Acoplamento

- `src/lib` nunca importa de `src/components` — direção de dependência
  correta em toda a base (`grep` sem hits).
- Nenhuma store importa outra store diretamente.
- Único import de tipo invertido: `src/lib/workout.ts:2` importa
  `type { XpGainResult }` de `@/stores/useCharacterStore`. Não é um ciclo em
  runtime — apenas uma inversão de camada. Não corrigido nesta sprint (sem
  ganho objetivo imediato).
- `adaptive-planning/*` importa `type { CoachRecommendation }`/`CoachCategory`
  de `../coach/types` — unidirecional, sem import reverso.
- Nenhum componente acessa store/internals de outro domínio diretamente; toda
  navegação cross-feature passa por `<Link href="/...">`.

## Dead code

Nenhum confirmado. Candidatos suspeitos (`campaigns.ts`, `greeting.ts`,
`weekly-progress.ts`) verificados por grep — todos com importadores reais.

## TODOs / comentários obsoletos

Nenhum `TODO`/`FIXME`/`XXX`/`HACK` real encontrado. Comentários existentes são
anotações de sprint (ex: "Sprint 19 Parte 4") precisas, não obsoletas.

## Arquivos grandes (>500 linhas)

```
746  src/lib/training-load.ts
700  src/app/(dashboard)/plano/page.tsx
691  src/app/(dashboard)/sessao/page.tsx
660  src/lib/workout-readiness.ts
608  src/lib/training-programs.ts
597  src/lib/training-blocks.ts
585  src/lib/training-cycle-wellness.ts
531  src/lib/exercise-intelligence.ts
512  src/lib/workout-templates.ts
```

## Funções grandes (>80 linhas)

- `sessao/page.tsx:471` — `getReadinessHint`, 220 linhas (maior do projeto)
- `sessao/page.tsx:200` — `finishWorkout`, 139 linhas
- `sessao/page.tsx:339` — `handleConfirmResult`, 111 linhas
- `plano/page.tsx:179` — corpo do componente `PlanoPage`, 515 linhas
- `training-load.ts:517` — `buildTrainingWeek`, 124 linhas
- `workout-readiness.ts:259` — `buildFactors`, 109 linhas
- `training-cycle-wellness.ts:380` — `buildCycleWellnessSummary`, 106 linhas
- `training-blocks.ts:434` — `compareProgramWeeks`, 91 linhas

Não refatorados nesta sprint (regra do projeto: só refatorar com ganho
objetivo comprovado, não por estética). `sessao/page.tsx` é o principal
candidato a uma sprint de refactor dedicada.

## Duplicação / lógica equivalente

- `round()`/`average()`/`clamp()` reimplementados localmente em pelo menos 10
  arquivos (`exercise-intelligence.ts`, `workout-readiness.ts`,
  `workout-recovery.ts`, `training-cycle-wellness.ts`,
  `training-cycle-comparison.ts`, `training-cycle-review-analytics.ts`,
  `wellness-associations.ts`, `wellness-trends.ts`, `analytics/performance.ts`,
  `health-data/aggregation.ts`, `health-data/relationships.ts`). Real DRY
  violation — um `lib/math-utils.ts` compartilhado eliminaria o risco de
  drift de precisão de arredondamento entre engines. Não consolidado nesta
  sprint (tocaria lógica de cálculo em múltiplos domínios simultaneamente).
- 4 módulos "recommendation" com nomes parecidos mas responsabilidades
  distintas (`recommendations.ts`, `adaptive-recommendations.ts`,
  `recommendation-assembly.ts`, `coach/recommendations.ts`) — risco de
  descoberta para novos contribuidores, não duplicação de lógica confirmada.

## Ciclos de dependência

Nenhum encontrado nos pares de maior risco (stores↔stores,
coach↔adaptive-planning, lib↔components). Verificação feita por grep dirigido,
não por ferramenta de grafo completa (madge não está instalado no projeto).

## Auditoria de rotas

21 `page.tsx`. Nenhuma tinha `loading.tsx`/`error.tsx`/`not-found.tsx` antes
desta sprint — **corrigido**: `src/app/(dashboard)/loading.tsx` e
`src/app/(dashboard)/error.tsx` adicionados, cobrindo as 21 rotas do grupo
`(dashboard)` com um boundary compartilhado (skeleton + tela de erro com
"Tentar novamente").

Reachability (nav = `AppSidebar.tsx`, que lista só `/dashboard`, `/treinos`,
`/plano`, `/insights`, `/perfil`):

- Todas as demais rotas (`/programas`, `/historico/[id]`, `/exercicios/[id]`,
  `/saude`, `/nutricao`, `/diario`, `/configuracoes`, `/preferencias`,
  `/sessao`) são alcançáveis por link interno em algum ponto do app —
  confirmado individualmente.
- `/style-guide` — **órfã**, sem nenhum link interno, só acessível digitando
  a URL. Mantida como referência interna de dev (decisão consciente, não bug).
- `/offline` — fallback do service worker (`public/sw.js`), corretamente fora
  da navegação normal.
- `/auth/login`, `/auth/callback` — fluxo de auth, corretamente fora da
  navegação do dashboard.

Nenhum link quebrado encontrado em `AppSidebar`.

## Mapa domínio → teste (cobertura)

| Domínio | Arquivos de teste |
|---|---|
| Planning/programs | `adaptive-planning/*.test.ts` (14), `training-programs.test.ts`, `program-instantiation.test.ts`, `program-progress.test.ts`, `program-adherence.test.ts`, `training-blocks.test.ts`, `planned-workouts.test.ts` |
| Coach | `coach/{decisions,engine,explanations,priority,recommendations,rules,signals}.test.ts` |
| Analytics | `analytics/{consistency,dashboard,fatigue,helpers,insights,muscle-balance,performance,progress}.test.ts` |
| Exercise intelligence | `exercise-intelligence.test.ts`, `exercise-detail-engine.test.ts`, `exercise-highlights.test.ts`, `exercise-records.test.ts` |
| Health data | ~30 arquivos (`health-data/*.test.ts`) |
| Backup/restore | `backup.test.ts` |
| Readiness/recovery | `readiness-check-ins.test.ts`, `workout-readiness.test.ts`, `workout-recovery.test.ts` |
| Gamificação | `badges.test.ts`, `daily-missions.test.ts`, `useCharacterStore.test.ts` |
| Body progress | 13 arquivos (`body-progress*.test.ts`) |
| Histórico/ciclos | `workout-history.test.ts`, `training-cycle*.test.ts` (10), `training-goal*.test.ts` (7) |

### Engines determinísticos sem teste direto (gap real)

`attributes.ts` (cálculo de XP/atributo), `progression.ts` (sugestão de
progressão de carga), `health-data/stats.ts` (média/mediana/desvio-padrão —
usado por baseline/agregação), `recommendations.ts` (scoring de treino
recomendado), `recommendation-assembly.ts`, `weekly-plan.ts`/
`weekly-progress.ts` (progresso semanal + XP), `auto-tags.ts` (tags
automáticas do diário). Nenhum é dead code; todos são consumidos em produção.
Recomendado como primeira tarefa de uma sprint de dívida técnica dedicada —
não preenchido nesta sprint (adicionar teste novo não é bugfix).
