# Exportação de corpo e bem-estar

Introduzido na Sprint 19 Parte 4. Três formatos, todos gerados no navegador (nenhum dado sai do dispositivo):

## CSV — Progresso corporal

Arquivo `fitness-rpg-body-progress-YYYY-MM-DD.csv`, uma linha por registro, ordenado por data. Colunas:

`recorded_at, weight_kg, waist_cm, abdomen_cm, chest_cm, hips_cm, right_arm_cm, left_arm_cm, right_thigh_cm, left_thigh_cm, right_calf_cm, left_calf_cm, neck_cm, custom_measurements, cycle_id, notes, photo_count`

- Campos ausentes ficam vazios (nunca `0`).
- `custom_measurements` serializa cada medida personalizada como `label:valorCm`, separadas por `;`.
- `photo_count` é apenas a contagem de fotos vinculadas — nenhum blob ou referência de arquivo entra no CSV.

## CSV — Bem-estar

Arquivo `fitness-rpg-wellness-YYYY-MM-DD.csv`, uma linha por check-in. Colunas:

`recorded_at, energy, soreness, sleep_quality, sleep_hours, motivation, stress, mood, readiness_score, notes`

- `readiness_score` fica sempre vazio. O score de prontidão depende do contexto de treino no momento do check-in (grupos musculares, exercícios do dia) e recalculá-lo aqui, fora desse contexto, geraria um número que não bate com o que o app mostrou originalmente — melhor não fabricar um valor do que expor um errado.

## Relatório em Markdown

Arquivo `fitness-rpg-body-wellness-report-YYYY-MM-DD.md`. Seções: Resumo, Registros corporais, Tendências, Bem-estar, Associações, Ciclos, Limitações dos dados. Reaproveita os motores já existentes (`body-progress-trends.ts`, `wellness-trends.ts`, `wellness-overview.ts`) — nenhuma fórmula nova. Nunca inclui fotos, diagnósticos ou linguagem causal/médica; associações usam o texto (`summary`) já produzido por `wellness-associations.ts`.

## Filtro de período

Os três formatos aceitam: últimos 30 dias, últimos 90 dias, ou todo o histórico. Implementado em `src/lib/body-wellness-export.ts` (`resolveExportPeriodRange`), independente do resolvedor de período usado internamente pelos cards de Insights.

## Compatibilidade com o backup JSON

Estes três exports são complementares ao backup JSON (`backup.ts`), não um substituto: o backup restaura o app; os exports CSV/Markdown servem para levar os dados para outra ferramenta (planilha, leitura). Nenhum dos dois inclui fotos de progresso.
