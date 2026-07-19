# Sprint 19 — Parte 3C (fatia 1: associações em Insights)

Status: **fatia 1 concluída** — escopo reduzido e combinado com o usuário antes de implementar (ver decisão abaixo). Partes 3B (screenshots/acessibilidade pendentes) e o restante da Parte 3C (Dashboard, Perfil, sequência de check-ins, comparação de períodos) ficam para fatias seguintes.

## Decisão de escopo

O prompt original da Parte 3C assumia que Dashboard/Insights/Perfil não tinham nenhuma integração de bem-estar. A auditoria (Fase 2 do prompt) mostrou o oposto:

- Dashboard já tem `ReadinessOverviewCard` e `BodyProgressCard` (cards separados).
- Insights já tem `ReadinessInsightsSection` e `BodyWellnessSection` (com comparação de períodos corporal).
- Perfil já tem estatísticas de readiness e `BodyProgressSection`.

O que **não** existia em nenhuma superfície: os engines `wellness-associations.ts` (Parte 3A, associações bem-estar × treino com confiança heurística) e `training-cycle-wellness.ts` (Parte 3B, bem-estar por ciclo) não estavam conectados a nenhuma UI fora de Plano/Ciclo.

Combinado com o usuário: seguir **escopo aditivo** (não duplicar/mesclar cards existentes) e entregar **uma fatia por vez**. Esta fatia cobre apenas a lacuna real em Insights.

## O que foi implementado

### `src/lib/wellness-overview.ts` (novo)

Camada de composição pura — não recalcula nada, apenas seleciona e prioriza resultados de `wellness-associations.ts` e `training-cycle-wellness.ts`:

- `buildWellnessAssociationsOverview(checkIns?, weekSummaries?, config?, maxAssociations = 5)` — roda `computeAllWellnessTrainingAssociations` (7 métricas × 3 dimensões = 21 combinações) e reduz para no máximo uma associação por métrica de bem-estar (`bestPerWellnessMetric`), priorizando achados com direção clara (positiva/negativa) e maior confiança. Evita repetir a mesma coincidência sob eixos de treino diferentes (ex.: energia × frequência e energia × volume). Retorna `dataStatus: 'no_data' | 'insufficient_data' | 'available'`.
- `getActiveCycleWellnessOverview(now?)` — wrapper fino sobre `buildCycleWellnessSummary` para o ciclo ativo (`getActiveCycle()`); retorna `null` sem ciclo ativo.

### `src/components/insights/WellnessAssociationsSection.tsx` (novo)

Nova seção em Insights, montada após `BodyWellnessSection`:

- Card "Bem-estar × treino": lista as associações selecionadas, cada uma com o texto de explicação não-causal já produzido pelo engine, rótulo de confiança visível como texto (`Confiança baixa/média/alta`, nunca só cor) com `title` explicando a heurística, e amostra ("N semanas analisadas").
- Estados: sem dados (`no_data`), amostra insuficiente (`insufficient_data`) e disponível (`available`) — nenhum deles renderiza `0` como valor real.
- Quando há ciclo ativo, reaproveita o componente já existente `CycleWellnessSection` (de `components/plano/`) em vez de duplicar a lógica/UI — mesma seção usada em Plano/Ciclo.
- Retorna `null` quando não há check-ins nem ciclo ativo, seguindo o padrão de `BodyWellnessSection`.

### `src/app/(dashboard)/insights/page.tsx`

Import + montagem de `<WellnessAssociationsSection />` logo após `<BodyWellnessSection />`.

## Engines reutilizados (nenhuma fórmula nova)

- `wellness-associations.ts` — `computeAllWellnessTrainingAssociations`, `DEFAULT_WELLNESS_ASSOCIATION_CONFIG`.
- `training-cycle-wellness.ts` — `buildCycleWellnessSummary`.
- `training-cycles.ts` — `getActiveCycle`.
- `readiness-check-ins.ts` — `getCheckIns`.
- `training-load.ts` — `getWeekSummaries`.

## Regras de seleção de destaques

Uma associação por métrica de bem-estar (`energy`, `soreness`, `sleepQuality`, `motivation`, `stress`, `mood`, `sleepHours`), escolhida por:

1. Direção clara (positiva/negativa) tem prioridade sobre neutra/indefinida.
2. Dentro de achados com direção clara, maior confiança (`high` > `medium` > `low`).
3. Empate: maior tamanho de amostra.

Limite de exibição: até 5 associações (`DEFAULT_MAX_ASSOCIATIONS`), configurável via parâmetro.

## Linguagem não causal

Todo o texto exibido vem literalmente de `wellness-associations.ts` (`explanation`), que já usa "coincidiram", "no seu histórico", "a amostra ainda é pequena e essa diferença pode variar com novos registros". Nenhum texto novo foi escrito para as associações em si — só rótulos de UI ("Confiança alta", "N semanas analisadas").

## Testes

`src/lib/wellness-overview.test.ts` — 6 testes novos:

- `no_data` com zero check-ins.
- `insufficient_data` abaixo do mínimo de semanas.
- seleção de uma associação por métrica, com direção clara priorizada.
- limite de associações exibidas respeitado.
- `getActiveCycleWellnessOverview` retorna `null` sem ciclo ativo.
- `getActiveCycleWellnessOverview` retorna resumo correto com ciclo ativo (mockando `training-cycles` e `readiness-check-ins`).

Total da suíte após esta fatia: **609 testes passando** (603 → 609).

## Gates

- `tsc --noEmit`: limpo.
- `eslint` nos arquivos novos/alterados: limpo.
- `vitest run` (suíte completa): 36 arquivos, 609 testes, todos passando.
- `next build`: build de produção concluído sem erros; rota `/insights` gerada estaticamente (134 kB / 249 kB first load).

## QA visual

Dados sintéticos (10 semanas alternando energia/estresse alta e baixa, ciclo ativo) seedados via Playwright + Microsoft Edge (Browser pane trava em `screenshot` neste ambiente — workaround documentado). Capturas em `docs/screenshots/sprint19-part3c/`:

- `desktop-insights-associations.png` — card de associações com confiança e amostra.
- `desktop-insights-full.png` — página completa com ciclo ativo (`CycleWellnessSection` reaproveitado).
- `desktop-insights-empty.png` — estado sem dados (seção nova corretamente ausente, sem quebrar o empty-state existente).
- `mobile-insights-associations.png` — 390×844, sem overflow horizontal.

Não foi executada auditoria de teclado/leitor de tela formal nesta fatia (pendência — ver abaixo).

## Pendências (não incluídas nesta fatia)

Herdadas do prompt original da Parte 3C, adiadas por acordo de escopo:

- Card de bem-estar consolidado / contexto corporal no Dashboard (Fases 9–16).
- Integração compacta em Perfil + sequência de check-ins (`computeCheckInStreak`) (Fases 34–37).
- Comparação de períodos de bem-estar (7d vs 7d, ciclo vs ciclo) fora do que `BodyPeriodComparisonCard` já cobre (Fases 30–32).
- Gráficos dedicados de sono/energia/estresse/dor muscular/prontidão em Insights além dos stat-cells já existentes (Fases 20–23).
- Screenshots formais e auditoria de acessibilidade pendentes da **Parte 3B** (ciclo ativo/concluído, comparação entre ciclos, revisão) — ainda não feitos.
- Auditoria de acessibilidade dedicada desta fatia (teclado, foco, leitores de tela, contraste) — não executada.
- Atualização de `DATA_MODEL.md`/documentação de wellness/ciclos além deste arquivo.

## Estado do Git

Working tree no início desta sessão já continha a Parte 3B não commitada (`training-cycle-wellness.ts(.test.ts)`, `wellness-associations.ts(.test.ts)`, `CycleWellnessSection.tsx`, e alterações em `CycleComparisonSection.tsx`, `CycleHistorySection.tsx`, `CycleReviewForm.tsx`, `CycleSection.tsx`) — preservado, nada foi sobrescrito.

Também presentes e não relacionados a nenhuma sprint: `DESIGN (1).md`, `README (1).md` (downloads duplicados) e `test-results/` (saída do Playwright) — não tocados.

Nenhum commit foi criado nesta sessão. Nada foi enviado ao remoto.
