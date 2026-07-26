# Health × Training Relationships — Sprint 29 Parte 3

Documenta `src/lib/health-data/relationships.ts` (`buildHealthTrainingRelationships`) e `src/lib/health-data/data-usage.ts` (`buildHealthDataUsageExplainability`).

## Relações implementadas

| id | Sinal de saúde | Desfecho | Fonte do desfecho |
|---|---|---|---|
| `sleep_x_volume` | Sono (`sleep_duration`) | Volume de treino (kg) | `sessionVolumeKg` (`training-load.ts`), por dia |
| `sleep_x_readiness` | Sono (`sleep_duration`) | Prontidão auto-relatada (`energy`, 1-5) | `WorkoutReadinessCheckIn.energy`, por dia |
| `resting_hr_x_readiness` | FC de repouso | Prontidão auto-relatada | idem |
| `activity_x_volume` | Atividade externa (`activity_duration`) | Volume/carga de treino (kg) | idem sono × volume |

**"Prontidão auto-relatada" é deliberadamente o campo bruto `energy` do check-in, não `WorkoutReadinessResult.score`.** Recalcular o score completo exigiria reconstruir todo o `ReadinessInput` (contexto de sessão, ajustes, etc.) só para fins de comparação estatística — desnecessário e arriscado de divergir silenciosamente do score real usado em produção. Usar o dado bruto é mais honesto sobre o que está sendo comparado.

## Metodologia

Para cada relação, dentro do período selecionado:

1. Calcula a baseline da métrica de saúde (reaproveita `getMetricBaseline`, mesmo motor da Sprint 28 Parte 3 — nunca recalculado aqui).
2. Separa os dias em dois grupos: sinal abaixo da baseline, e sinal na baseline ou acima.
3. Para cada dia de cada grupo, busca o desfecho correspondente àquele dia (volume de sessão daquele dia, ou média de `energy` dos check-ins daquele dia).
4. Compara a média do desfecho entre os dois grupos.

## Amostra mínima

**5 dias por grupo** (`MIN_RELATIONSHIP_GROUP_SAMPLE`, seção 20 do brief). Abaixo disso, `sufficientSample: false` e um texto explícito de amostra insuficiente é retornado — nunca uma comparação forçada com poucos pontos.

## Linguagem — nunca causalidade

Todo `evidenceText` segue o padrão:

> "Nas sessões de dias com sono abaixo da linha de base, volume médio de treino foi menor (Xkg vs Ykg)."

Nunca:

> ~~"Dormir menos causou queda de performance."~~

Testado explicitamente (`relationships.test.ts`): nenhum texto gerado contém "causou"/"causa" mesmo com diferença clara entre os grupos.

## Data Usage Explainability (`data-usage.ts`)

`buildHealthDataUsageExplainability(period, now)` traduz o `HealthContext` do dia — o mesmo objeto que `Readiness`/`Recovery`/`Fatigue`/`Coach` efetivamente consomem (`consumer-context.ts`, Sprint 28 Parte 4) — para uma forma explicável: por sinal (sono, FC de repouso, passos, atividade), `used: boolean` + `reasons: string[]`. Não reimplementa nenhuma regra de gating — só lê `HealthMetricSignal.reliable`/`.reasons`, já calculados.

Como os 4 motores leem exatamente o mesmo contexto, a seção informa corretamente "quando bloqueado aqui, nenhum desses motores usa o sinal" — sem precisar simular Fatigue/Coach separadamente (o que duplicaria lógica e poderia divergir).

## UI

- `HealthRelationshipsSection` — um card por relação, com badge de amostra (`N vs M dias` ou "Amostra insuficiente") e o texto neutro.
- `HealthDataUsageSection` — um item por sinal, badge "Utilizado"/"Não utilizado" + motivo.

Ambas dentro de `/saude` (ver `HEALTH-RECOVERY-EXPERIENCE.md`), abaixo de Qualidade e Conflitos.

## Pendências conscientes

- **"Saúde × conclusão de treino"** (seção 18 do brief, "sessão concluída"/"treino ignorado ou reagendado") não foi implementada como relação própria: não existe hoje um log consultável de sessões puladas/reagendadas (o sistema de propostas adaptativas da Sprint 27 versiona o plano, mas não registra "sessão X foi pulada por causa de Y"). Implementar isso exigiria uma fonte de dado nova, fora do escopo desta parte — registrado aqui para uma sprint futura, não implementado silenciosamente.
- Relações usam o **dia da sessão** para o sinal de saúde (não "a noite anterior" como um conceito de janela deslizante separado) — mesma convenção de `DailyHealthSummary.date`, que já representa o dia do sono registrado.
