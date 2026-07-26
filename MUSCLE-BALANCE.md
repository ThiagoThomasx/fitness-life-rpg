# Muscle Balance Engine — `src/lib/analytics/muscle-balance.ts`

Motor de balanceamento muscular (Sprint 25 Parte 3). Ver `ANALYTICS-ENGINE.md` para o princípio geral do módulo.

`computeMuscleGroupDistribution(period, now?)` e `identifyImbalances(period, now?)` — distribuição de séries/volume por grupo muscular e detecção de desequilíbrio.

## Base: reaproveita `buildMuscleGroupLoads` (`training-load.ts`)

Nenhuma atribuição de série/volume por grupo muscular é recalculada aqui — vem de `buildMuscleGroupLoads`, exportada especificamente para este reuso na Sprint 25. Isso inclui a MESMA limitação conhecida e já documentada lá: todo o volume de um exercício é atribuído apenas ao seu PRIMEIRO grupo muscular normalizado (sem distribuição secundária proporcional entre múltiplos grupos trabalhados). Corrigir isso seria mexer em lógica de negócio já existente — fora de escopo desta sprint (CLAUDE.md regra 2).

## `participationPercent`

Fatia (0-100) do total de SÉRIES do período que um grupo representa — métrica primária escolhida em vez de volume em kg, porque séries é a unidade mais direta de "estímulo" e é a mesma unidade usada pelos limiares já existentes de `buildMuscleGroupLoads` (`minimumWeeklySetsForRepresentation`/`highWeeklySetsThreshold`). Zero quando não há nenhuma série no período (nunca divide por zero).

## Grupos negligenciados / excessivos

- **Negligenciados**: `sets < DEFAULT_TRAINING_LOAD_CONFIG.minimumWeeklySetsForRepresentation` — o MESMO limiar já usado no resto do app para "grupo abaixo do mínimo semanal", não um segundo limiar paralelo que poderia divergir.
- **Excessivos**: participação (em séries) mais que o DOBRO da fatia proporcional esperada se os 7 grupos fossem perfeitamente equilibrados (`100% / 7 ≈ 14.3%` → limiar `≈ 28.6%`). Threshold relativo, não um número absoluto de séries — funciona igualmente bem em períodos curtos (`'7d'`) e longos (`'1y'`).

## Mapeamentos push/pull e superior/inferior

Classificação genuinamente nova desta sprint (não existia em nenhum motor anterior) — decisões de domínio documentadas explicitamente no código-fonte:

| Eixo | Grupos incluídos | Grupos excluídos e por quê |
|---|---|---|
| **Empurrar** (push) | `peito`, `ombros`, `triceps` | — |
| **Puxar** (pull) | `costas`, `biceps` | `pernas` (padrão de membro inferior) e `core` (tronco/estabilização) não se encaixam com clareza em nenhum lado de empurrar/puxar de membro superior — deliberadamente EXCLUÍDOS em vez de forçados para um lado. |
| **Superior** | `peito`, `costas`, `ombros`, `biceps`, `triceps` | — |
| **Inferior** | `pernas` | `core` é tronco, não membro superior nem inferior — EXCLUÍDO também (a spec pede uma razão de 2 lados, não uma divisão de 3 vias). |

`pushPullRatio`/`upperLowerRatio` são calculados em SÉRIES (mesma métrica primária de `participationPercent`). `ratio` é `null` quando o denominador é zero (ex.: nenhuma série de "puxar" no período) — nunca `Infinity`.

## Por que não radar (decisão de UI, Parte 4B)

A brief da sprint permite radar "apenas se realmente útil". Com só 2-4 eixos disponíveis (push/pull, superior/inferior), um radar ficaria esparso e menos honesto que um comparativo direto — a UI usa duas `.stat-cell` lado a lado em vez de um gráfico radar decorativo.
