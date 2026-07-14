# Sprint 15 — Adaptive Session Control & Readiness Validation

Data: 2026-07-14

## Auditoria da Sprint 14

### O que foi auditado

- `src/lib/readiness-check-ins.ts` — CRUD com validação por campo, deduplicação por id, importação granular, storage seguro
- `src/lib/workout-readiness.ts` — engine puro: `calculateReadiness`, `getProgressionContext`, `calculateSessionOutcome`, `computeReadinessStats`
- `ReadinessCheckIn.tsx` — check-in pré-treino com skip e notas opcionais
- `ReadinessCard.tsx` — resultado com nível, headline, fatores e ajustes sugeridos
- `SessionExerciseCard.tsx` — `readinessHint` contextual por exercício
- `WorkoutSummaryModal.tsx` — `sessionOutcomeMessage` pós-sessão
- Página de sessão — 3 fases (check-in → resultado → treino), edição do check-in, outcome calculado
- `ReadinessOverviewCard.tsx` (Dashboard), `ReadinessInsightsSection.tsx` (Insights), seção no Perfil
- `backup.ts` — chave `lrpg-fit:readiness-check-ins` incluída

### Resultado

Todos os módulos encontrados íntegros. QA visual (screenshots) permanecia pendente.

## Decisões Arquiteturais

### Ajuste = referência, não trava

O usuário pode registrar qualquer peso/reps/séries independentemente do ajuste ativo.
PRs em sessões com modo conservador são registrados normalmente.

### Snapshot imutável no histórico

`AppliedSessionAdjustmentSnapshot` não inclui `source` nem `appliedAt` — apenas os valores que importam para análise futura. Isso evita dependência de estado de UI no histórico.

### Regra de arredondamento

`roundWeightDown(weight, increment)`:
- Sempre para baixo (`Math.floor(weight / increment) * increment`)
- Nunca arredonda para cima quando a intenção é reduzir carga
- Zero-weight (peso corporal, tempo) preservado sem alteração
- Incremento padrão: 2,5 kg

Exemplo: meta 42,5 kg − 10% = 38,25 kg → arredonda para 37,5 kg (não 40 kg)

### Presets por nível de prontidão

| Prontidão | Modo | Carga | Séries | Descanso | Progressão | Técnica |
|-----------|------|-------|--------|----------|------------|---------|
| Alta | original | 0% | 0 | 0s | ✅ | — |
| Moderada | conservative | 0% | 0 | +30s | ❌ | ✅ |
| Baixa | conservative | −10% | −1 | +30s | ❌ | ✅ |
| Dados insuficientes | original | 0% | 0 | 0s | ✅ | — |

### Config centralizada

`DEFAULT_SESSION_ADJUSTMENT_CONFIG` contém todos os valores:
- `moderateRestIncreaseSeconds: 30`
- `lowReadinessWeightReductionPercentage: 10`
- `lowReadinessSetsReduction: 1`
- `lowReadinessRestIncreaseSeconds: 30`
- `minimumWeight: 0` / `minimumSets: 1`
- `weightRoundingIncrement: 2.5`
- `maximumWeightReductionPercentage: 15`

## Arquivos Criados

- `src/lib/session-adjustments.ts` — engine de ajustes
- `src/lib/session-adjustments.test.ts` — 52 testes (9 suítes)
- `src/components/session/SessionAdjustmentPanel.tsx` — painel de controle

## Arquivos Alterados

- `src/stores/useSessionStore.ts` — `sessionAdjustment`, `setSessionAdjustment`
- `src/lib/workout-history.ts` — `CompletedWorkout.appliedSessionAdjustment?`
- `src/components/session/SessionExerciseCard.tsx` — `adjustedTarget` prop
- `src/components/session/WorkoutSummaryModal.tsx` — `appliedAdjustment`, `readinessLevel`
- `src/components/dashboard/ReadinessOverviewCard.tsx` — `adjustmentStats` prop
- `src/app/(dashboard)/sessao/page.tsx` — integração completa
- `src/app/(dashboard)/dashboard/page.tsx` — carrega e passa `adjustmentStats`
- `src/styles/session.css` — estilos para painel, meta ajustada, estratégia no modal

## Testes

| Arquivo | Testes |
|---------|--------|
| `session-adjustments.test.ts` | 52 (novos) |
| `workout-readiness.test.ts` | 39 |
| `exercise-records.test.ts` | 32 |
| `workout-intelligence.test.ts` | 30 |
| `muscle-groups.test.ts` | 22 |
| `workout-recovery.test.ts` | 19 |
| `backup.test.ts` | 9 |
| `daily-missions.test.ts` | 7 |
| `useCharacterStore.test.ts` | 6 |
| **Total** | **216** |

## Gates

| Gate | Resultado |
|------|-----------|
| `npm run lint` | ✅ 0 warnings/errors |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 216/216 |
| `npm run build` | ✅ sem erros |

## QA Visual

Screenshots gerados via Playwright + Microsoft Edge (workaround documentado em `memory/browser-pane-screenshot-workaround.md`).

### Arquivos gerados em `docs/screenshots/sprint15/`

| Arquivo | Conteúdo |
|---------|----------|
| `01-check-in-phase-desktop.png` | Fase de check-in (1280px) |
| `01-check-in-phase-mobile.png` | Fase de check-in (390px) |
| `02-result-low-readiness-desktop.png` | Resultado prontidão baixa (1280px) |
| `02-result-low-readiness-mobile.png` | Resultado prontidão baixa (390px) |
| `03-result-high-readiness-desktop.png` | Resultado prontidão alta (1280px) |
| `04-training-original-plan-desktop.png` | Treino — plano original, painel visível (1280px) |
| `04-training-original-plan-mobile.png` | Treino — plano original, painel visível (390px) |
| `05-training-conservative-adjustment-desktop.png` | Treino — ajuste conservador ativo (1280px) |
| `05-training-conservative-adjustment-mobile.png` | Treino — ajuste conservador ativo (390px) |
| `05b-adjustment-panel-element.png` | Close-up do `SessionAdjustmentPanel` |
| `06-dashboard-readiness-desktop.png` | Dashboard com `ReadinessOverviewCard` (1280px) |
| `06-dashboard-readiness-mobile.png` | Dashboard com `ReadinessOverviewCard` (390px) |

### Bug encontrado no seed do script

`exercise.muscle_groups` deve ser array, não string — o código chama `.join()` sobre esse campo. Corrigido no script de QA.

## Limitações Conhecidas

1. **Insights e Perfil** — subsection de "Impacto dos ajustes" (Fase 17–18 do spec) não implementada por falta de amostra mínima; base de dados (`appliedSessionAdjustment` no histórico) está pronta para implementação futura
2. **Histórico de treino** — exibição de snapshot na tela de detalhe de treino antigo não implementada (nenhuma rota de detalhe existe; seria nova rota, proibida pelo spec)

## Não Regressão Confirmada

- ✅ XP inalterado
- ✅ Badges inalteradas
- ✅ PRs registrados normalmente (incluindo em sessões conservadoras)
- ✅ Recomendações da Sprint 13 intactas (`generateRecommendation`)
- ✅ Prontidão da Sprint 14 funcionando (check-in, resultado, outcome)
- ✅ Check-in pode ser pulado
- ✅ Workout Planner inalterado
- ✅ Metas não alteradas permanentemente (ajuste é apenas estado de sessão)
- ✅ Histórico antigo (sem `appliedSessionAdjustment`) compatível
- ✅ Backup antigo compatível
- ✅ Nenhuma nova rota criada
- ✅ Nenhuma mudança de navegação global

## Status do Git

Branch: master
Arquivos não rastreados: `DESIGN (1).md`, `README (1).md`, `test-results/` (pré-existentes, não incluídos)
Nada enviado ao remoto sem autorização.
