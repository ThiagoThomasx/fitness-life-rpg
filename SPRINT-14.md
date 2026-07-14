# Sprint 14 — Readiness, Recovery & Adaptive Workout Guidance

**Data:** 2026-07-14
**Status:** Completa ✅

---

## Objetivo

Conectar planejamento, histórico e progressão ao estado atual do usuário para responder:
"Como devo abordar o treino de hoje?"

O sistema oferece uma leitura simples de prontidão, fatores que influenciaram o resultado, orientação geral para a sessão, ajustes conservadores sugeridos e a opção de seguir o treino normalmente. Não diagnostica fadiga, não altera o treino automaticamente, não usa IA.

---

## Fase 1 — Auditoria

### Dados já existentes para calcular prontidão
- `getMuscleRecoveryStates()` — `recoveryPercent` (0–100) por grupo muscular (Sprint 11)
- `getAllExerciseIntelligence()` — status de progressão por exercício (Sprint 13)
- `sessionCountLast7Days()` — frequência recente via `getWorkoutHistory()`
- `calculateVolumeKg()` — volume semanal atual vs médio

### Dados novos adicionados
- `WorkoutReadinessCheckIn` — energy, soreness, sleepQuality, motivation (1–5)
- `lrpg-fit:readiness-check-ins` — nova chave de backup (ARRAY)
- `CompletedWorkout.checkInId?` — link sessão → check-in (opcional)

### Compatibilidade
- Todos os campos novos são opcionais em tipos existentes
- Backup antigo importa sem erro (nova chave ausente → `skippedKeys`)
- Histórico antigo carrega normalmente (sem `checkInId`)

---

## Fórmula de Prontidão

### Fatores objetivos (quando sem check-in: 100% do score)
| Fator | Peso |
|---|---|
| Recuperação muscular (pior grupo alvo) | 40% |
| Frequência nos últimos 7 dias | 25% |
| Tendência de performance (status Sprint 13) | 25% |
| Volume semanal vs média | 10% |

### Fatores subjetivos (quando com check-in: 50% do score)
| Campo | Score |
|---|---|
| Energia | (rating - 1) × 25 |
| Dor muscular | (5 - rating) × 25 (invertido) |
| Sono | (rating - 1) × 25 |
| Motivação | (rating - 1) × 25 |

Score subjetivo = média dos 4 scores.

### Score final
- Com check-in: `score = subjectiveScore × 0.5 + objectiveScore × 0.5`
- Sem check-in: `score = objectiveScore`

### Thresholds (configuráveis em `ReadinessConfig`)
- `high`: score ≥ 72
- `moderate`: score ≥ 45
- `low`: score < 45

### Confiança
- `high`: check-in E ≥ 3 sessões em histórico
- `medium`: check-in OU ≥ 3 sessões
- `low`: nenhum dos dois

---

## Decisões Arquiteturais

1. **Check-in separado do histórico** — `lrpg-fit:readiness-check-ins` tem ciclo de vida diferente de `CompletedWorkout`. Link via `checkInId?`.
2. **Engine puro** — `workout-readiness.ts` não tem side effects; aceita `now?: Date` para testabilidade.
3. **3 fases na sessão** — check_in → result → training. Pular check-in vai direto para training com avaliação objetiva.
4. **Integração não destrutiva com Sprint 13** — `getProgressionContext(level)` adiciona contexto, não sobrescreve a meta original.
5. **Hints por exercício opcionais** — `readinessHint` só é emitido para exercícios com status relevante (regressing/stagnant) quando prontidão não é alta.

---

## Arquivos Criados

| Arquivo | Descrição |
|---|---|
| `src/lib/readiness-check-ins.ts` | Storage e validação de check-ins |
| `src/lib/workout-readiness.ts` | Engine puro de prontidão |
| `src/lib/workout-readiness.test.ts` | 39 testes unitários |
| `src/components/session/ReadinessCheckIn.tsx` | Formulário de check-in |
| `src/components/session/ReadinessCard.tsx` | Card de resultado |
| `src/components/dashboard/ReadinessOverviewCard.tsx` | Card do Dashboard |
| `src/components/insights/ReadinessInsightsSection.tsx` | Seção de Insights |

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/backup.ts` | + `lrpg-fit:readiness-check-ins` em STORAGE_KEYS e ARRAY_KEYS |
| `src/lib/workout-history.ts` | + `checkInId?` em `CompletedWorkout` |
| `src/app/(dashboard)/sessao/page.tsx` | Integração completa das 3 fases |
| `src/components/session/SessionExerciseCard.tsx` | + `readinessHint?` prop e renderização |
| `src/components/session/WorkoutSummaryModal.tsx` | + `sessionOutcomeMessage?` prop |
| `src/app/(dashboard)/dashboard/page.tsx` | + `ReadinessOverviewCard` |
| `src/app/(dashboard)/insights/page.tsx` | + `ReadinessInsightsSection` |
| `src/app/(dashboard)/perfil/page.tsx` | + seção "Prontidão" |
| `src/styles/session.css` | Estilos de check-in, readiness card e hints |
| `src/styles/insights.css` | Estilos de distribuição de prontidão |

---

## Gates Finais

| Gate | Status |
|---|---|
| lint | ✅ Nenhum warning ou erro |
| typecheck | ✅ Nenhum erro de tipo |
| test | ✅ 164/164 testes passando (8 arquivos) |
| build | ✅ Build limpo, sem erros |

---

## Limitações Conhecidas

- O score de prontidão não considera carga relativa por exercício (e.g. leg day vs upper body) — usa o grupo muscular mais fatigado como proxy.
- A comparação de volume semanal usa a média das 4 semanas anteriores; em usuários muito novos (< 4 semanas), a referência pode ser imprecisa.
- O outcome de sessão (`above_expectation / aligned / below_expectation`) usa o volume real como baseline conservador — não há projeção de volume esperado baseado em plano. Isso é intencional para evitar false negatives.
- Insights de correlação (energia × desempenho) requerem amostra mínima configurável (`minSessionsForInsight = 5`).

---

## Confirmação de Não Regressão

- [x] XP permaneceu inalterado
- [x] Badges permaneceram inalterados
- [x] PRs continuam funcionando
- [x] Recomendações Sprint 13 intactas
- [x] Workout Planner Sprint 11 intocado
- [x] Sessões antigas abrem normalmente
- [x] Backup antigo importa sem erro
- [x] Backup novo faz round-trip correto
- [x] Nenhuma rota criada
- [x] Navegação não alterada
- [x] Nenhum treino modificado automaticamente

---

## Git

Status: alterações locais prontas para commit (não enviadas ao remoto).
