# Coach Rules — regras determinísticas (Sprint 26)

`src/lib/coach/rules.ts` define `COACH_RULES: CoachRule[]`, cada uma uma
função pura `CoachSignals -> CoachRuleFinding[]`. Nenhuma regra lê
`localStorage`, nenhuma recalcula um motor — todas leem só `CoachSignals`
(ver `COACH-SIGNALS.md`). Uma regra sem condição confirmada retorna `[]` —
nunca "força" um achado para ter conteúdo.

## Tabela de regras

| id | categoria | dispara quando | evidência citada |
|---|---|---|---|
| `Coach.Recovery.HighLoadLowReadiness` | recovery | `analytics/fatigue.ts` já cruzou carga em alta + prontidão baixa frequente | mesma evidência do padrão `fatigue:high_load_low_readiness` |
| `Coach.Load.HighLoadMajorityFatigued` | training_load | `analytics/fatigue.ts` já cruzou carga em alta + maioria dos grupos musculares não recuperados | mesma evidência do padrão `fatigue:high_load_majority_fatigued` |
| `Coach.Consistency.LowAdherence` | consistency | aderência semanal < 60% com ≥ 2 sessões planejadas no período | sessões perdidas/planejadas, % de aderência |
| `Coach.Program.HighAdherence` | program | aderência semanal ≥ 90% com ≥ 2 sessões planejadas (reforço positivo) | sessões concluídas/planejadas, sequência atual |
| `Coach.Frequency.LongGap` | frequency | um grupo muscular está ≥ 14 dias sem treino (`hoursSinceTrained`) | dias desde o último treino do grupo |
| `Coach.Muscle.Neglected` | muscle_balance | `analytics/muscle-balance.ts` já classificou o grupo como negligenciado E o grupo NÃO está também em `excessiveGroups` (ver conflito abaixo) | séries/sessões do grupo, % de participação |
| `Coach.Volume.Imbalance` | volume | `analytics/muscle-balance.ts` já classificou o grupo como excessivo | séries/sessões do grupo, % de participação |
| `Coach.Progress.Stagnation` | stagnation | `getExerciseTrends` classifica a carga de um exercício como `stable` (amostra mínima de 6 execuções, já imposta por `exercise-intelligence.ts`) | explicação literal do `ExerciseTrend` |
| `Coach.Records.RecentAchievement` | records | há pelo menos 1 recorde pessoal recente (reforço positivo) | exercício, tipo de recorde, data |

`progressão` e `estagnação` (categorias exigidas separadamente pela spec) são
cobertas pela MESMA regra (`Coach.Progress.Stagnation`) — no vocabulário de
dados deste app, "sem evolução de carga por N semanas" e "estagnação" são o
mesmo fenômeno observável (`ExerciseTrend.direction === 'stable'`);
desdobrar em duas regras duplicaria a mesma evidência sob dois ids
diferentes, violando "nenhum cálculo deve ser duplicado".

## Conflito real encontrado em QA e resolvido

`analytics/muscle-balance.ts` classifica `neglectedGroups` por um limiar de
**séries por semana** e `excessiveGroups` por uma **fatia do período
inteiro** — duas bases de cálculo diferentes que, com amostra pequena (poucas
sessões no período), podem classificar o MESMO grupo muscular nos dois ao
mesmo tempo (ex.: um grupo que domina a única sessão do período mas ainda
está abaixo da média semanal esperada). Mostrar "Peito com participação
baixa" e "Peito com volume desproporcional" juntos na mesma tela seria
contraditório para o usuário e quebraria a confiança no Coach.

**Decisão**: `Coach.Muscle.Neglected` suprime o achado para qualquer grupo
que também esteja em `excessiveGroups`, priorizando `Coach.Volume.Imbalance`
(que já cobre esse grupo com a mesma evidência). Nenhum motor existente foi
alterado — a deconflição acontece só na camada do Coach, que é responsável
por interpretar sinais coerentemente. Coberto por teste em `rules.test.ts`
("resolves a real upstream conflict...").

## Peso, prioridade e confiança

Cada achado carrega `weight` (0-1, atribuído pela própria regra a partir de
números reais) e `sampleSize` (tamanho da amostra que sustenta o achado).
`priority.ts` deriva prioridade/confiança **só** desses dois números — ver
`COACH-ENGINE.md`.

## Testes

`rules.test.ts` cobre, para cada regra: caso positivo com evidência
verificada, caso negativo (sinais neutros nunca disparam nenhuma regra),
gates de amostra mínima, e o cenário de conflito real acima. Um teste de
inventário garante que toda categoria exigida pela spec tem pelo menos uma
regra registrada.
