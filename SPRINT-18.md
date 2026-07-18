# Sprint 18 — Goals, Milestones & Progress Forecasting (escopo reduzido)

Data: 2026-07-18

## Escopo

A especificação original desta sprint tinha 38 fases (9 tipos de meta, engine completo de progresso/marcos/projeção, integração em Dashboard/Planner/`SessionExerciseCard`/resumo de sessão/Insights/Perfil/histórico dedicado, vínculo e transferência entre ciclos, matriz completa de testes e QA visual em 18+ estados). Seguindo o mesmo padrão da Sprint 17 e a regra do `CLAUDE.md` de manter tarefas granulares, o escopo foi reduzido e confirmado com o usuário (via `AskUserQuestion`) antes de implementar.

Também foi confirmado antes de codar: Metas de treino é um sistema **conceitualmente separado** de Campanhas (`src/lib/campaigns.ts`, já existente) — Campanhas são desafios de contagem fixa com templates e recompensa de XP; Metas são objetivos livres, sem XP, com baseline/progresso/marcos/projeção. Ambos convivem em `/plano`, em abas distintas.

**Incluído:**
- Modelo de meta + persistência (`training-goals.ts`) + registro de marcos (`training-goal-milestones.ts`)
- Motor de progresso puro (`training-goal-progress.ts`) para 5 tipos: `exercise_weight`, `exercise_reps`, `estimated_1rm`, `weekly_sessions`, `consistency`
- Baseline explícito ou inferido, marcos 25/50/75/100% com registro histórico idempotente, projeção linear com faixa de semanas e confiança
- Criação/edição/pausa/retomada/conclusão manual/reabertura/arquivamento/restauração de meta
- Nova aba "🎯 Metas" em `/plano` + `ActiveGoalsCard` no Dashboard
- Backup + testes unitários

**Deixado fora deste corte** (candidato a Sprint 18.1):
- Tipos de meta adicionais: `weekly_volume`, `cycle_completion`, `personal_record`, `custom`
- Vínculo formal com ciclo de treino (`cycleId` na meta, encerramento de ciclo mostrando metas relacionadas, transferência de meta entre ciclos)
- Integração no Planner (metas contextuais da semana), `SessionExerciseCard` (meta pessoal ao lado da recomendação de progressão) e resumo de sessão (marcos alcançados na sessão)
- Seção "Metas e evolução" em Insights (taxa de conclusão, insights determinísticos) e estatísticas de metas no Perfil
- Histórico de metas dedicado (a aba atual já cobre Ativas/Pausadas/Concluídas/Arquivadas de forma compacta)
- Matriz completa de QA visual (18+ estados descritos na especificação original)

## Auditoria (Fase 1 da especificação original)

Executada via agente de exploração antes de qualquer código. Principais achados:

1. **Nenhuma meta quantitativa existia.** `TrainingCycle.goal` (Sprint 17) é apenas um rótulo de categoria de treino (`strength`/`hypertrophy`/etc.), sem valor-alvo, data ou progresso — a "meta opcional já prevista no modelo de ciclo" mencionada na especificação nunca passou dessa categoria.
2. **`Campaign` já é um sistema de metas quantitativas completo** (`targetValue`/`currentValue`/`unit`, templates fixos, `syncCampaignProgress`, `xpReward`) — mas gamificado e de contagem simples (treinos/semanas/dias), sem exercício específico, sem marcos, sem projeção. Mantido intocado.
3. **Todas as métricas necessárias já existem** em módulos das Sprints 12/16/17: `getExerciseSummary`/`calculateEstimated1RM` (`exercise-records.ts`), `getWorkoutHistory` (`workout-history.ts`), `getWeekStart` (`weekly-plan.ts`)/`getWeekEnd` (`training-load.ts`). Nenhuma fórmula nova precisou ser inventada.
4. **`ExercisePickerModal`** (Sprint 12, usado em `/treinos` e `/sessao`) foi reaproveitado sem alteração para seleção de exercício no formulário de meta.
5. **Padrão de comparação/confiança a imitar**: `training-cycle-comparison.ts` usa um único `MIN_SESSIONS_FOR_RELIABLE_COMPARISON` exportado, gate booleano em vez de score numérico inventado — o motor de projeção desta sprint segue o mesmo espírito (amostra mínima explícita, nunca um número de confiança arbitrário sem base).

## Decisões Arquiteturais

### Persistência mínima, progresso sempre derivado

`TrainingGoal` só guarda identidade, tipo, status e valores-alvo. Progresso, percentual, status computado, confiança e projeção nunca são persistidos — são sempre recalculados por `calculateGoalProgress(goal, now?)` a partir do histórico de treinos já existente. A única exceção documentada: `recordMilestoneReached` grava o **fato histórico** de um marco atingido (idempotente por meta+percentual), pelo mesmo motivo que PRs são registrados quando observados — sem esse registro, um deload apagaria a conquista de um marco já alcançado.

### Conclusão sempre manual

Mesmo quando `calculateGoalProgress` calcula `status: 'completed'` (100% do alvo atingido), o campo persistido `goal.status` só muda para `'completed'` quando o usuário confirma explicitamente (`completeGoal`). Isso segue a regra "não concluir metas automaticamente quando os dados forem ambíguos" da especificação — uma meta de repetições pode "bater" o alvo tecnicamente numa série isolada não intencional, e o usuário decide se isso conta.

### Baseline: explícito > histórico anterior > primeiro registro pós-criação > ausente

Para metas de exercício (`exercise_weight`/`exercise_reps`/`estimated_1rm`):
1. Se `goal.baselineValue` foi definido manualmente, usa esse valor.
2. Senão, usa o melhor registro do exercício **na ou antes** da data de início.
3. Senão (sem histórico anterior), usa o primeiro registro **após** a criação — a meta começa em 0% de progresso.
4. Se não houver nenhum registro do exercício ainda, a meta fica em `not_started` sem baseline.

Para `weekly_sessions`/`consistency`, o baseline é sempre `0` (contagem de semanas bem-sucedidas), já que a meta é sobre o futuro a partir da data de início.

### Repetições: sem conversão via 1RM

Para `exercise_reps` (ex.: "12 reps a 40kg"), o progresso conta apenas repetições realizadas em séries com carga igual ou maior que o alvo (`weight_kg >= alvo`), nunca extrapolando via 1RM estimado. Uma série de 80kg × 3 reps satisfaz o alvo de carga (80 ≥ 40) e conta 3 repetições reais — não uma estimativa de quantas repetições a 40kg essa força implicaria.

### Semana corrente nunca conta como falha

Para `weekly_sessions`/`consistency`, `computeWeeklyOutcomes` marca a semana em andamento (`weekEnd >= hoje`) como incompleta e a exclui do cálculo de semanas bem-sucedidas/malsucedidas — ela aparece na explicação como "em andamento", nunca como reprovada antes do fim da semana.

### Projeção: faixa de semanas, nunca uma data

`buildLinearProjection` usa a taxa de variação entre a primeira e a última amostra de uma janela recente (`projectionWindowSessions`, padrão 8) convertida em semanas. Só produz uma faixa (`estimatedWeeksMin`–`estimatedWeeksMax`, ±25%) quando: há amostra mínima (`minimumSamplesForProjection`, padrão 3), a taxa é positiva, e a meta ainda não foi atingida. Caso contrário, retorna `method: 'insufficient_data'` com explicação. Confiança (`low`/`medium`/`high`) é function pura do tamanho da amostra, seguindo o mesmo padrão de `workout-intelligence.ts`.

## Arquivos Criados

- `src/lib/training-goals.ts` — modelo + CRUD + validação
- `src/lib/training-goals.test.ts` — 28 testes
- `src/lib/training-goal-milestones.ts` — registro de marcos
- `src/lib/training-goal-milestones.test.ts` — 8 testes
- `src/lib/training-goal-progress.ts` — motor de progresso
- `src/lib/training-goal-progress.test.ts` — 17 testes
- `src/components/plano/GoalForm.tsx` — formulário progressivo por tipo
- `src/components/plano/GoalCard.tsx` — card de meta com progresso/marcos/projeção/ações
- `src/components/plano/GoalsSection.tsx` — composição da aba Metas
- `src/components/dashboard/ActiveGoalsCard.tsx` — card do Dashboard
- `docs/screenshots/sprint18/` — 8 screenshots (desktop+mobile × 4 estados)

## Arquivos Alterados

- `src/lib/backup.ts` — `lrpg-fit:training-goals` e `lrpg-fit:goal-milestones` em `STORAGE_KEYS`/`ARRAY_KEYS`
- `src/lib/backup.test.ts` — seed + 3 testes novos (round-trip, backup legado, dado malformado)
- `src/app/(dashboard)/plano/page.tsx` — nova aba "🎯 Metas" no tab switcher
- `src/app/(dashboard)/dashboard/page.tsx` — `ActiveGoalsCard` na coluna direita, junto de `CurrentCycleCard`

## Testes

56 testes novos, 413/413 no total do projeto (era 357/357 ao final da Sprint 17.1). Cobertura inclui: criação/validação por tipo, todas as transições de status (pausar/retomar/concluir/reabrir/arquivar/restaurar) e suas restrições, baseline explícito/inferido/ausente, progresso 0%/parcial/>100% (capado em 100%), marcos cruzados simultaneamente e preservados após deload, projeção com amostra insuficiente/ritmo negativo/ritmo positivo, meta de repetições sem conversão via 1RM, semana corrente não contada como falha, meta de consistência concluída, status `paused`/`completed` sobrepondo o cálculo normal, backup round-trip e compatibilidade com backups anteriores à Sprint 18.

## QA

QA manual no dev server (`fitness-rpg` launch config) via Browser pane + screenshots via Playwright/Edge headless (screenshot direto do Browser pane trava nesta máquina, ver memória do projeto):

- Estado vazio da aba Metas → formulário de criação → seleção de exercício via `ExercisePickerModal` → meta criada aparece em "Metas ativas" com `not_started` e explicação
- Sessão registrada após a criação → progresso recalculado (baseline inferido do primeiro registro pós-criação) → segunda sessão → percentual atualizado e marcos 25%/50% registrados visualmente (✓ nos badges)
- `ActiveGoalsCard` no Dashboard refletindo o mesmo estado da meta ativa, sem duplicar cálculo
- Console limpo em todas as capturas; sem overflow horizontal em mobile (390px)

Screenshots em `docs/screenshots/sprint18/`: `01-metas-empty`, `02-metas-form`, `03-metas-progresso`, `04-dashboard` (desktop + mobile).

## Gates

- `npm run test` — 413/413 ✅
- `npm run lint` — limpo ✅
- `npx tsc --noEmit` — limpo ✅
- `npm run build` — limpo ✅

## Não Regressão

XP, badges, PRs, 1RM, progressão, prontidão, ajustes de sessão, carga semanal, ciclos de treino (Sprint 17/17.1) e Campanhas permanecem intocados — nenhum desses módulos foi importado ou modificado além da adição das duas novas chaves de backup. Nenhuma rota nova.

## Limitações Conhecidas

- Projeção usa taxa linear simples entre a primeira e a última amostra da janela recente — não há detecção formal de irregularidade/variância na série, apenas o gate de amostra mínima e taxa positiva. Refinamento adiado para não expandir escopo desta sprint.
- Metas de exercício não têm vínculo com ciclo de treino nesta versão — uma meta criada durante um ciclo continua existindo normalmente após o ciclo ser encerrado, sem nenhuma seção "metas do ciclo" (Sprint 18.1).
- `weekly_sessions` e `consistency` calculam de forma quase idêntica nesta versão (streak atual/melhor streak de `consistency`, mencionado na especificação original, não foi implementado) — a diferenciação completa entre os dois tipos fica para a Sprint 18.1.

## Status do Git

Nada commitado ao final desta sessão — aguardando aprovação do usuário, seguindo o mesmo padrão das Sprints 17/17.1.
