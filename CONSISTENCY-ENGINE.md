# Consistency Engine — `src/lib/analytics/consistency.ts`

Motor de consistência (Sprint 25 Parte 2). Ver `ANALYTICS-ENGINE.md` para o princípio geral do módulo.

`computeConsistency(period, now?)` retorna um `ConsistencyReport`: aderência ao plano, sequência de dias treinados (streak), semanas perfeitas e melhor/pior mês.

## Aderência — composta a partir de `program-adherence.ts`/`program-progress.ts`

Só calculada quando existe pelo menos um programa ATIVO (`getActiveTrainingPrograms`, já exclui arquivados) com sessões planejadas dentro do período — caso contrário `weeklyAdherenceRate`/`monthlyAdherenceRate` ficam `null`. Nenhum número de aderência é fabricado sem um plano real por trás.

Duas leituras deliberadamente diferentes da MESMA aderência, sem nenhuma matemática nova (as duas só agregam de formas diferentes o que `buildProgramAdherenceSnapshot` já produz):

- **`weeklyAdherenceRate`** = média das taxas de aderência POR SEMANA do programa (`ProgramWeekAdherence.adherenceRate`), não ponderada por tamanho de semana.
- **`monthlyAdherenceRate`** = `completedSessions / plannedSessions` agregado do período inteiro, ponderado pelo total de sessões (não pela média de semanas).

Sem programa ativo com sessões planejadas: `completedSessions` cai para a contagem bruta de treinos concluídos no período (não há plano contra o qual medir "concluído do plano"), e `plannedSessions`/`missedSessions` permanecem `0`.

## Streaks

Sequência de dias treinados calculada inteiramente em espaço de string de data UTC (`YYYY-MM-DD`, nunca `Date` local) — evita o mismatch de timezone já documentado no playbook de debug de hidratação deste projeto. Reaproveita a MESMA convenção de gap já usada por `getNutritionStreak` (`nutrition.ts`): contagem regressiva a partir de hoje, dia a dia, sem tolerância de gap — a primeira ausência encerra a sequência atual.

**Limitação documentada:** streaks são calculados apenas sobre os treinos DENTRO do período selecionado — uma sequência que começou antes do início do período é truncada na borda do período, consistente com o resto do motor (que sempre escopa por `DateRange`). Isso significa que `currentStreakDays` pode aparecer menor do que a sequência "real" do usuário se o período escolhido for curto (ex.: `'7d'`).

## Semanas perfeitas

Uma semana do programa conta como "perfeita" quando `week.dataStatus === 'complete'` e `adherenceRate >= 1` (`ProgramWeekAdherence`, já calculado por `buildProgramAdherenceSnapshot`) — nenhum limiar novo, reaproveita o mesmo campo que já define "semana completa" no resto do app.

## Melhor / pior mês

`computeMonthlyBreakdown` agrupa os treinos do período por mês (`YYYY-MM`) e ordena por contagem de sessões. Com um único mês no período, melhor e pior mês são o MESMO — comportamento esperado (não há segundo mês para comparar), não um bug. A UI (`ConsistencyPanel`/`HighlightsPanel`, Parte 4B) formata o label `YYYY-MM` para pt-BR ("julho de 2026") via `formatMonthLabel`, mesma função (duplicada deliberadamente, é só apresentação) que `insights.ts` já usa para o insight "Melhor mês".
