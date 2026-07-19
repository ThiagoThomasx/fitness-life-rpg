# Sprint 19 (v2) — Body Progress, Measurements & Wellness Trends (parte 1)

> Nota de nomenclatura: `SPRINT-19.md` já existia no repositório documentando um sprint diferente da v1 (redesign visual de Insights/Dashboard, anterior à renumeração v2). Este relatório usa o sufixo `-v2` para preservar aquele histórico intacto, seguindo a mesma distinção que o `CHANGELOG.md` já faz entre entregas `(v1)` e `(v2)`.

Data: 2026-07-19

## Escopo

A especificação original desta sprint tinha 45 fases (peso, medidas, fotos de progresso com IndexedDB, wellness check-ins, engine de tendências, associações com treino, comparação por período/ciclo, backup de blobs, integração em Dashboard/Perfil/Insights, exportação CSV/Markdown, matriz completa de testes e QA visual em 20+ estados). Seguindo o mesmo padrão das Sprints 17/18 e a regra do `CLAUDE.md` de manter tarefas granulares, o escopo foi reduzido e as decisões de arquitetura confirmadas com o usuário (via `AskUserQuestion` em modo de planejamento) antes de implementar.

**Incluído:**
- Modelo de progresso corporal + persistência (`body-progress.ts`)
- Extensão do `WorkoutReadinessCheckIn` existente com `stress`/`mood`/`sleepHours` (em vez de um domínio "wellness" paralelo)
- Motor compartilhado de classificação de tendência (`trend-math.ts`) reaproveitado por peso, medidas e bem-estar
- Motor de tendências de corpo (`body-progress-trends.ts`): peso, qualquer medida, comparação de dois períodos (30/90 dias)
- Motor de tendências de bem-estar (`wellness-trends.ts`): médias por campo + duas associações com treino, sempre com amostra mínima e linguagem não causal
- Backup + testes unitários
- UI: formulário + histórico editável no Perfil, card no Dashboard, seção de gráficos/associações em Insights

**Deixado fora deste corte** (candidato a Sprint 19.1+):
- Fotos de progresso e tudo que depende delas: IndexedDB, upload, galeria, comparação de fotos, aviso de privacidade, backup com blobs (ZIP)
- Comparação por ciclo atual/anterior — só janelas fixas de 30/90 dias foram implementadas, já que resolver a data de término de um ciclo hoje depende de recalcular `plannedWeeks`/`buildCycleWeekBreakdown` e não existe um campo `endDate` persistido
- Exportação em CSV/Markdown
- Novos tipos de meta de peso/medida em `training-goals.ts` — o vínculo com metas é só informativo, por `cycleId`/data, sem estender `TrainingGoalType`
- Reset granular por domínio (fotos/registros/check-ins separadamente) — não implementado, já que fotos (o motivo original da granularidade) não existem nesta versão
- Preferência de unidades (kg/lb, cm/in) — tudo em métrico nesta versão

## Auditoria (Fase 1 da especificação original)

Executada via agente de exploração antes de qualquer código. Principais achados:

1. **Nenhum campo de peso corporal existia.** Toda ocorrência de `weight` no código já se referia a carga de treino (`targetWeeklyVolumeKg`, `PersonalRecordType = 'weight'`, pesos de série).
2. **`WorkoutReadinessCheckIn`** (`src/lib/readiness-check-ins.ts`, Sprint 14) já cobria `energy`/`soreness`/`sleepQuality`/`motivation` (escala 1–5) — faltavam apenas estresse e humor/disposição.
3. **Sem IndexedDB no projeto** — zero ocorrências de `indexedDB`/`IDBDatabase` em `src`. Toda persistência é `localStorage` via chaves `lrpg-fit:*`.
4. **`src/lib/backup.ts` é JSON-only** — `exportBackup`/`downloadBackup` serializam `STORAGE_KEYS` como texto; não há suporte a blob/binário. Qualquer chave nova precisa entrar em `STORAGE_KEYS` e no conjunto `ARRAY_KEYS`/`OBJECT_KEYS` para validação estrutural.
5. **`resetAllData()` é tudo-ou-nada** — sem reset granular por domínio hoje.
6. **Padrão de domínio real do projeto**: módulo funcional `src/lib/<domínio>.ts` + `localStorage` direto (`readiness-check-ins.ts`, `training-goals.ts`) — **não** Zustand store (só 4 stores existem, para outro tipo de estado: personagem, badges, recompensas, sessão).
7. **Sem zod** — validação é manual (`validate<X>Input(input): string | null`), seguido nesta sprint por consistência com o resto do código.
8. **Recharts + `ChartCard.tsx`** (`ChartHeader`/`EmptyChart`/`TOOLTIP_STYLE`/`GRID_STROKE`/`AXIS_TICK`) é o padrão de gráfico do projeto, reaproveitado sem modificação.
9. **`training-goal-progress.ts` + `training-goal-*-progress.ts`** são o modelo de "engine puro" a seguir: módulo sem efeito colateral (exceto registro idempotente de fatos), config exportada com defaults documentados, nunca promete resultado.

## Decisões Arquiteturais

### Bem-estar estende Readiness, não um domínio novo

`WorkoutReadinessCheckIn` ganhou `stress?`, `mood?` e `sleepHours?` opcionais em vez de um `WellnessCheckIn` separado. Motivo: os dois cobrem o mesmo momento do dia (antes do treino), e um domínio paralelo criaria duas entradas diárias parecidas — exatamente o que a especificação original pedia para evitar (Fase 5, Opção B). Registros anteriores à Sprint 19 continuam válidos sem migração, já que os campos novos são opcionais e `isValidCheckIn` foi atualizado para aceitá-los apenas quando presentes.

### Fotos adiadas para uma sub-sprint

Fotos de progresso exigem: IndexedDB (sem precedente no projeto — teria que ser desenhado do zero), uma estratégia de backup que hoje não existe (o `backup.ts` atual é JSON puro, sem suporte a blob), e um fluxo de privacidade/consentimento próprio. Implementar isso na mesma leva que o modelo de peso/medidas violaria a regra de tarefas granulares (1–4h) do `CLAUDE.md`. Confirmado com o usuário antes de implementar.

### Motor de tendência compartilhado, não duplicado

`trend-math.ts` isola a única peça de lógica que peso, medidas e bem-estar têm em comum: "classificar uma série numérica ao longo do tempo". Método documentado: regressão linear (mínimos quadrados) sobre uma janela recente (`recentWindowEntries`, padrão 5), com estabilidade tendo prioridade sobre irregularidade — ruído pequeno em torno de uma linha praticamente reta é `stable`, não `irregular`. Irregularidade só é declarada quando a série não é estável **e** tem uma proporção alta de inversões de direção ponto-a-ponto na janela. Abaixo de `minimumSamples` (padrão 3), retorna sempre `insufficient_data`.

### Associações nunca causais, sempre com amostra mínima

`computeSleepEnergyAssociation`/`computeStressFrequencyAssociation` dividem as amostras pela mediana (sono ou estresse) e comparam a média do outro lado (energia ou frequência de treino) entre os dois grupos. Abaixo de `minimumPairedSamples`/`minimumWeeks`, retornam sempre uma mensagem de dados insuficientes. Quando a diferença entre grupos é pequena (`meaningfulDifferenceThreshold`), retornam explicitamente "não há uma diferença clara" em vez de forçar uma narrativa. As mensagens finais usam apenas "no seu histórico"/"coincidiram" — testado com `expect(message).not.toMatch(/causou|porque/i)` nos dois motores.

### Comparação de períodos nunca declara vencedor

`comparePeriods` retorna dois blocos (`PeriodSummary`) lado a lado — médias, primeiro/último valor, frequência — sem nenhum campo de "melhor período". Testado explicitamente (`expect(result.periodA).not.toHaveProperty('winner')`).

## Arquivos Criados

- `src/lib/body-progress.ts` — modelo + CRUD + validação
- `src/lib/body-progress.test.ts` — 19 testes
- `src/lib/trend-math.ts` — motor compartilhado de classificação de tendência
- `src/lib/trend-math.test.ts` — 7 testes
- `src/lib/body-progress-trends.ts` — tendência de peso/medidas + comparação de períodos
- `src/lib/body-progress-trends.test.ts` — 8 testes
- `src/lib/wellness-trends.ts` — médias/tendências de bem-estar + associações com treino
- `src/lib/wellness-trends.test.ts` — 7 testes
- `src/lib/readiness-check-ins.test.ts` — 6 testes (arquivo não existia antes desta sprint)
- `src/components/profile/BodyProgressForm.tsx` — formulário progressivo (criação e edição)
- `src/components/profile/BodyProgressSection.tsx` — resumo + histórico + editar/excluir com confirmação
- `src/components/dashboard/BodyProgressCard.tsx` — card compacto do Dashboard
- `src/components/insights/BodyWellnessSection.tsx` — gráfico de peso, tendência de medidas, médias de bem-estar, associações
- `src/components/insights/BodyPeriodComparisonCard.tsx` — comparação 30/90 dias

## Arquivos Alterados

- `src/lib/readiness-check-ins.ts` — campos opcionais `stress`/`mood`/`sleepHours`, `isValidCheckIn` atualizado
- `src/lib/preferences.ts` — `favoriteMeasurements` opcional + `getFavoriteMeasurements`/`setFavoriteMeasurements`
- `src/lib/backup.ts` — `lrpg-fit:body-progress` em `STORAGE_KEYS`/`ARRAY_KEYS`
- `src/lib/backup.test.ts` — 3 testes novos (round-trip, backup legado, dado malformado)
- `src/components/session/ReadinessCheckIn.tsx` — seção opcional recolhida de estresse/humor
- `src/components/dashboard/ReadinessOverviewCard.tsx` — exibe estresse/humor do último check-in quando presentes
- `src/app/(dashboard)/dashboard/page.tsx` — `BodyProgressCard` na coluna direita
- `src/app/(dashboard)/perfil/page.tsx` — seção "Progresso corporal"
- `src/app/(dashboard)/insights/page.tsx` — `BodyWellnessSection` (fora do gate `hasAnyData`, já que progresso corporal não depende de treinos registrados)

## Testes

50 testes novos, 511/511 no total do projeto (era 461/461 ao final da Sprint 18.1a). Cobertura inclui: CRUD e validação de registro corporal (peso, medidas nomeadas, medidas customizadas, campos vazios), classificação de tendência (crescente/decrescente/estável/irregular/dados insuficientes, ordem de prioridade estabilidade > irregularidade, janela recente vs. histórico completo, entrada não ordenada), tendência de peso e de medida nomeada/customizada, comparação de períodos sem vencedor e com período vazio, extensão de Readiness (campos ausentes/presentes, validação de rating inválido e horas de sono negativas, import de check-ins legados e novos), associações de bem-estar (amostra insuficiente, associação encontrada, sem diferença clara, linguagem não causal testada explicitamente), backup round-trip e compatibilidade com backups anteriores à Sprint 19.

## QA

QA manual no dev server (`fitness-rpg` launch config) via Browser pane:

- Perfil, estado vazio → "Adicionar registro" → formulário (peso + expandir medidas + adicionar campo "Cintura" + preencher) → salvar → resumo e histórico atualizados corretamente (82.5 kg, 1 medida)
- Dashboard refletindo o mesmo registro (peso atual, "há 0 dias", tendência `insufficient_data` corretamente com apenas 1 amostra — sem inventar tendência)
- Insights → seção "Corpo e bem-estar": gráfico de peso renderizado, "Bem-estar recente" com estado vazio correto (nenhum check-in ainda), medidas mostrando primeiro→atual, comparação de períodos (30/90 dias) funcionando
- Editar registro → formulário reabre pré-preenchido (peso, medida, data) → cancelar preserva o registro original
- Excluir registro → diálogo de confirmação → confirmar → estado vazio retorna corretamente
- Viewport mobile (375×812) → mesma estrutura de componentes (`card`, `stat-grid`) já responsivos no resto do app
- Console verificado: um warning de hidratação pré-existente em `WeeklyStatsSection.tsx`, confirmado via `git diff --stat` como não tocado nesta sprint — fora de escopo corrigir

## Gates

- `npm run test` — 511/511 ✅
- `npm run lint` — limpo ✅
- `npx tsc --noEmit` — limpo ✅
- `npm run build` — limpo ✅

## Não Regressão

XP, badges, PRs, ciclos de treino, campanhas, metas de treino e navegação principal permanecem intocados — nenhum desses módulos foi importado ou modificado além da adição de uma chave de backup e da extensão aditiva (campos opcionais) de `WorkoutReadinessCheckIn`. Nenhuma rota nova. Nenhuma imagem enviada, nenhuma análise corporal, nenhuma recomendação médica, nenhuma tendência tratada como garantia — confirmado por teste explícito de linguagem não causal nas associações.

## Limitações Conhecidas

- Fotos de progresso não implementadas — maior item de escopo adiado, exige IndexedDB e estratégia de backup para blobs do zero (Sprint 19.1).
- Comparação de período está limitada a janelas fixas de 30/90 dias; comparação por ciclo atual/anterior exigiria resolver a data de término real de um ciclo (hoje só derivada via `plannedWeeks`).
- Sem preferência de unidades — tudo em kg/cm. Suporte a imperial não existe em nenhuma parte do projeto hoje.
- `readiness-check-ins.test.ts` não existia antes desta sprint — a cobertura pré-Sprint 19 desse módulo vinha apenas indiretamente de `workout-readiness.test.ts`.

## Status do Git

Nada commitado ao final desta sessão — aguardando aprovação do usuário, seguindo o mesmo padrão das Sprints 17/17.1/18.
