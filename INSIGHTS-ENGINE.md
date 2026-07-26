# Insights Engine — `src/lib/analytics/insights.ts`

Motor de insights observacionais (Sprint 25 Parte 4A). Ver `ANALYTICS-ENGINE.md` para o princípio geral do módulo.

`generateInsights(period, now?)` retorna `AnalyticsInsight[]` — cada detector é independente e gated por amostra mínima; a ausência de um insight nunca significa erro, só que a condição não se confirmou ou não há dado suficiente ainda.

## Os 5 detectores

| Detector | Gatilho | Limiar |
|---|---|---|
| `detectSustainedVolumeIncrease` | Volume semanal de um grupo muscular estritamente crescente por N semanas consecutivas, partindo de volume real (> 0) na primeira semana. | `SUSTAINED_INCREASE_WEEKS = 4` — literal do exemplo da spec ("quatro semanas consecutivas"). |
| `detectStaleMuscleGroups` | Grupo muscular sem treinar há um múltiplo do tempo normal de recuperação daquele grupo. | `hoursSinceTrained >= RECOVERY_HOURS[grupo] × NOT_TRAINED_HOURS_MULTIPLIER (4)` — múltiplo de `RECOVERY_HOURS` já usado por `workout-recovery.ts`/`fatigue.ts`, não um número de dias arbitrário. |
| `detectBestMonth` | Existe um melhor E um pior mês DIFERENTES no período (`ConsistencyReport`). | Com um único mês no período, não dispara — não há nada para comparar. |
| `detectStandoutExerciseEvolution` | O exercício #1 de `getTopEvolvingExercises` tem `|deltaPercent| > STABILITY_TOLERANCE_PERCENT`. | Reaproveita `STABILITY_TOLERANCE_PERCENT` (`helpers.ts`, ±5%) — a MESMA barra de "variação que não é ruído" usada em todo o módulo, não um segundo limiar paralelo. |
| `detectNotablePrCount` | Contagem de recordes pessoais no período atinge o nível `'high'` de `sampleConfidence` (`helpers.ts`). | Reaproveita `sampleConfidence`, sem um segundo número paralelo para "sequência notável". |

Nenhum limiar deste arquivo é inventado sem base numa convenção já existente no módulo de Analytics ou em `adaptive-recommendations.ts` — todos citam sua origem em comentário no código-fonte.

## Regra de linguagem: observacional, nunca prescritiva

Diferença deliberada em relação a `adaptive-recommendations.ts`: os textos aqui são sempre OBSERVAÇÕES ("você fez X", "seu volume cresceu Y") — nunca recomendações de ação ("você deveria fazer Y") nem linguagem médica ("descanse", "procure um médico"). Mesma disciplina aplicada aos `patterns` de `fatigue.ts` (Parte 3). Cada insight cita a evidência numérica exata que o disparou em `evidence: string[]` — nunca um insight "adivinhado" sem número por trás.

IDs são determinísticos por janela (`categoria:detector:período[:chave adicional]`) — permitem dedup se a mesma UI chamar `generateInsights` mais de uma vez com o mesmo período/data.

## Como coexiste com `adaptive-recommendations.ts`

`adaptive-recommendations.ts` (sprint anterior) gera **recomendações de ação** — "ajuste sua carga", "adicione um dia de descanso" — voltadas ao Planner/ajuste de sessão, com o mesmo rigor de gating por amostra mínima. `insights.ts` gera **observações de padrão histórico** para a superfície de Analytics — nunca diz o que fazer, só o que aconteceu, com a evidência. Os dois módulos não se importam um do outro e não compartilham lógica de detecção (só convenções de estilo/limiar quando fazem sentido, ex. `STABILITY_TOLERANCE_PERCENT`) — são camadas irmãs, não uma dependendo da outra.
