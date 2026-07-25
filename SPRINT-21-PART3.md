# Sprint 21 — Parte 3: Program Adherence UI

## Contexto

`program-adherence.ts` (Sprint 20 Parte 3A) já calculava `SessionAdherence`,
`ProgramWeekAdherence`, `TrainingBlockAdherence` e `TrainingProgramAdherence`
com uma fórmula ponderada e testada, mas exigia que o chamador já tivesse
`weekSummaries` prontos — nada no projeto agrupava `PlannedWorkout[]` por
semana de programa e alimentava esse motor. Zero UI o consumia.

## O que foi feito

1. **`src/lib/program-progress.ts`** (novo) — orquestração pura, sem storage:
   - `groupPlannedWorkoutsByProgramWeek`: agrupa itens do Planner por
     `source.programWeekId`, ignorando o que não pertence ao programa.
   - `buildProgramAdherenceSnapshot`: monta `weekSummaries` (via
     `computeWeekAdherence`) e chama `computeProgramAdherence` — a peça que
     faltava para o motor da Parte 3A rodar com dados reais. Sessões extras
     são detectadas por janela de datas de cada semana (limitação documentada
     no código: uma extra fora de toda janela planejada não é contada em
     nenhuma semana).
   - `findNextPlannedWorkout`, `computeOnTimeRate` (usa o
     `completionTiming` da Parte 1 — só conta sessões que já o têm, nunca
     inventa pontualidade para dados antigos), `findMostDeviatedSession`
     (menor `exerciseMatchRate` entre as concluídas do programa),
     `adherenceRateLabel`.

2. **`ProgramAdherenceSummary.tsx`** — card no `/plano` (seção 12 da spec):
   semana atual, contagem planejado/concluído/pendente/ignorado, adesão,
   pontualidade, status textual, próximo treino, treino com maior desvio.
   Só renderiza quando há um programa com item planejado na semana corrente
   — sem isso, não há o que resumir.

3. **`src/app/(dashboard)/programas/[id]/page.tsx`** (novo) — página de
   progresso do programa (seção 16): semana atual, sessões
   concluídas/restantes, adesão acumulada, pontualidade, previsão simples de
   conclusão (semanas restantes — heurística direta, não é um modelo
   preditivo), adesão por semana, resumo por bloco quando existir. Carga e
   distribuição muscular **não são duplicadas** — a seção linka para
   Insights, que já tem esses gráficos.

4. **`ProgramLibrary.tsx`** — adicionado ícone "Ver progresso" por programa,
   apontando para a nova página.

## Decisões / limitações conhecidas

- "Principais substituições" (pedido na seção 16) não foi incluído: o motor
  de execução ativa (`active-workout.ts`, Sprint 20 4B) registra
  substituições só durante a sessão — `CompletedWorkout` não as persiste no
  histórico. Adicionar isso exigiria mudar o schema do histórico, fora do
  escopo desta parte. Fica como pendência explícita.
- Previsão de conclusão é aritmética simples (semanas restantes do
  programa), não uma projeção baseada em ritmo — não há dado suficiente
  ainda para um modelo mais elaborado sem inventar precisão que não existe.

## Testes

`src/lib/program-progress.test.ts` (novo): 10 casos — agrupamento por
semana (incluindo itens de outros programas/sem vínculo), snapshot de
semana perfeita e sem dados, próximo treino, taxa de pontualidade
(com e sem dados), sessão com maior desvio (com e sem desvio real),
rótulos de adesão. 10/10 passando.

## QA manual (browser)

Seed de programa + 2 planned workouts (1 concluído on_time, 1 pendente) +
1 completed workout vinculado, via localStorage:
- `/plano` mostra o card "Programa de Teste — Semana 1 de 2", 50% adesão,
  100% pontualidade, status "Inconsistente" — números batem com os dados
  seedados (1/2 sessões concluídas).
- `/programas/prog-test-1` mostra o mesmo resumo em formato de página, mais
  "Adesão por semana" com a semana 1 em andamento.

## Gates

```
Lint:      ok
Typecheck: ok
Tests:     860 passed, 1 pré-existente falhando (training-load.test.ts,
           não relacionado — ver SPRINT-21-PART1.md)
Build:     ok (novas rotas /programas/[id] e dados adicionais em /plano)
```

## Pendências para as próximas partes

- Motor de recomendações adaptativas (Parte 4A) — ainda não existe.
- Registrar substituições no histórico (`CompletedWorkout`) permanece fora
  de escopo desta sprint, a menos que vire bloqueio real para Insights.
