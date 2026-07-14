# Sprint 13 — Progressive Overload & Training Intelligence

**Data:** 2026-07-14
**Status:** ✅ Concluída

## Objetivo

Transformar o Fitness RPG de um registrador de treinos em um companheiro de progressão: após cada sessão, o usuário sabe claramente o que tentar na próxima, com que confiança a recomendação foi feita, e como está sua evolução ao longo do tempo — tudo local, determinístico, sem IA.

---

## Auditoria pré-implementação

### `lib/progression.ts` (existente)
Lógica de uma única regra:
- `allSetsHitTarget` (todas as séries ≥ 10 reps) → sugere `lastWeight + increment`
- Caso contrário → sugere `lastReps + 1` na mesma carga
- Sem análise multi-sessão, sem confiança, sem detecção de padrões

### `SessionExerciseCard` (existente)
- Recebia `suggestion: ProgressionSuggestion` com `note: string`
- Mostrava o note em texto plano dentro do `target-hint`
- Sem distinção visual entre tipo de recomendação ou confiança

### `ExerciseHistoryModal` (existente)
- Mostrava `suggestion.note` em um `stat-cell` de "Sugestão"
- Sem bloco dedicado, sem tipo de recomendação, sem confiança

### Dashboard / Insights / Perfil
- Sem "próximos desafios" de progressão
- Sem agrupamento de exercícios por status (evoluindo/estagnado/em queda)
- Sem comparação de volume/PRs entre semanas

---

## Decisões arquiteturais

1. **Módulo novo, não substituição**: `workout-intelligence.ts` não substitui `progression.ts` (que permanece intocado para não quebrar imports internos caso algum futuro refactor o use). A sessão passou a chamar `generateRecommendation` diretamente.

2. **Incrementos de peso por faixas**: <20kg → +1kg; 20–60kg → +2.5kg; >60kg → +5kg. Arredondados para o múltiplo do incremento mais próximo.

3. **Threshold configurável via `ProgressionConfig`**: permite testes determinísticos sem depender de magic numbers. Default: `stagnationThreshold: 5`, `regressionThreshold: 3`.

4. **Regressão detectada antes de estagnação**: regressão é mais urgente (pode indicar lesão/overtraining); se detectada, o restante da análise é ignorado.

5. **Deload somente em queda significativa (>10%)**: quedas pequenas retornam `maintain`. Deload só é sugerido quando a perda acumulada sobre a carga atual supera 10%.

6. **Confiança**: 1 sessão → `low`; 2 sessões → `medium`; 3+ → `high`. Confiança é informativa — a UI exibe ícone mas não bloqueia a recomendação.

---

## Implementação

### Novo módulo: `src/lib/workout-intelligence.ts`

```
WorkoutRecommendation
  type: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload' | 'insufficient_data'
  suggestedWeight?: number
  suggestedReps?: number
  confidence: 'low' | 'medium' | 'high'
  reason: string

ExerciseStatus
  'improving' | 'stable' | 'stagnant' | 'regressing' | 'insufficient_data'

ExerciseIntelligence
  exerciseId, exerciseName, status, recommendation, sessionsAnalyzed, daysSinceLastSession
```

Funções exportadas:
- `generateRecommendation(exerciseId, config?)` — recomendação por exercício
- `getExerciseStatus(exerciseId, config?)` — status resumido
- `getAllExerciseIntelligence(config?)` — todos os exercícios do histórico
- `getTopChallenges(limit?)` — top exercícios com meta de peso definida
- `getWeeklyIntelligenceSummary()` — comparação semana atual vs anterior
- `suggestWeightIncrease(weightKg)` — incremento puro (testável isoladamente)

### Testes: `src/lib/workout-intelligence.test.ts`

30 testes cobrindo todos os cenários do spec:
- Aumento de carga (1, 2, 3+ sessões)
- Aumento de reps (sessão única, multi-sessão)
- Manutenção (regressão pequena)
- Deload (queda >10%)
- Estagnação com e sem reps alvo atingidas
- Threshold configurável
- Bodyweight
- Histórico vazio
- Séries vazias
- Todos os 5 status de `getExerciseStatus`
- `getAllExerciseIntelligence` e `getTopChallenges`
- `getWeeklyIntelligenceSummary`
- `suggestWeightIncrease` (3 faixas)

### Novos componentes

| Componente | Localização | Uso |
|---|---|---|
| `NextChallengesCard` | `components/dashboard/` | Dashboard: até 5 exercícios com próxima meta |
| `TrainingIntelligenceSection` | `components/insights/` | Insights: exercícios agrupados por status |
| `IntelligenceStatsSection` | `components/profile/` | Perfil: stats semanais de inteligência |

### Modificações

| Arquivo | Mudança |
|---|---|
| `SessionExerciseCard.tsx` | `ProgressionSuggestion` → `WorkoutRecommendation`; linha "Próxima meta" com ícone de confiança |
| `ExerciseHistoryModal.tsx` | Bloco "Próxima sessão" com tipo + meta + razão |
| `sessao/page.tsx` | `suggestProgression` → `generateRecommendation` |
| `dashboard/page.tsx` | `NextChallengesCard` inserido |
| `insights/page.tsx` | `TrainingIntelligenceSection` inserida; `getAllExerciseIntelligence` computado |
| `perfil/page.tsx` | `IntelligenceStatsSection` inserida; dados de inteligência computados no useEffect |

---

## Não alterado

- `calculateXpGain` — intocado
- `checkAndEarnBadges` — intocado
- `lib/backup.ts` — intocado
- `lib/workout-history.ts` — intocado
- `lib/exercise-records.ts` — intocado
- Navegação — intocada
- Chaves de localStorage — intocadas

---

## QA

- **Testes**: 125/125 passando (7 arquivos, incluindo 30 novos em `workout-intelligence.test.ts`)
- **TypeScript**: `npx tsc --noEmit` — zero erros
- **Build**: `npx next build` — limpo
- **Browser**: Dashboard renderiza `NextChallengesCard` com empty state correto; Insights renderiza sem erro; Perfil renderiza sem erro; zero erros de console
- **Retrocompatibilidade**: lógica lê apenas `sets` existentes em `ExerciseRecord` — nenhum campo novo é necessário no histórico gravado

---

## Critérios obrigatórios — verificação final

- [x] Não modificou arquitetura existente
- [x] Não criou nova navegação
- [x] Não quebrou compatibilidade com históricos antigos
- [x] Não removeu funcionalidades existentes
- [x] Toda lógica é pura (lib/workout-intelligence.ts)
- [x] UI apenas consome dados (zero cálculos nos componentes)
- [x] Zero duplicação de lógica
- [x] Lint, Typecheck, Testes e Build 100% verdes
