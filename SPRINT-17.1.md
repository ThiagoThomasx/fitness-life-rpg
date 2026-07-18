# Sprint 17.1 — Cycle Reviews, Comparisons & Lifecycle Management

## Objetivo

Completar o ciclo de vida do sistema de ciclos de treino introduzido na Sprint 17, sem reescrever seu núcleo: revisões subjetivas (meio de ciclo e final), classificação manual de semanas, comparação entre dois ciclos concluídos, arquivamento/restauração, e integração com Dashboard, Insights e Perfil.

## Auditoria (Fase 1)

Antes de qualquer código, foi lido: `training-cycles.ts`, `training-cycle-summary.ts`, `CycleSection.tsx`/`CycleForm.tsx`/`CycleSummaryCard.tsx`, `backup.ts`, os testes da Sprint 17, e as páginas Dashboard/Insights/Perfil.

Respostas às perguntas da auditoria:

1. **Dados persistidos na Sprint 17:** apenas `TrainingCycle` (identidade, meta, status, datas). Nenhuma métrica é armazenada.
2. **Métricas derivadas:** tudo em `training-cycle-summary.ts` (`buildCycleSummary`), recalculado a partir de `workout-history`, `exercise-records`, `readiness-check-ins`, `training-load`.
3. **Revisões vs. ciclos:** relação 1-para-N via `cycleId`, storage próprio (`lrpg-fit:cycle-reviews`), nunca influenciam o cálculo do resumo.
4. **Anotações semanais:** identificadas por `cycleId + weekStartDate` (normalizado para a segunda-feira via `getWeekStart`), storage próprio (`lrpg-fit:cycle-week-annotations`).
5. **Evitar duplicação com Insights:** a seção de Insights (`CycleEvolutionSection`) agrega os mesmos `buildCycleSummary`/`buildCycleReviewAnalytics` já usados em `/plano`, sem recalcular nada novo — e reutiliza o próprio `CycleComparisonSection`.
6. **Ciclos arquivados:** novo status `'archived'` em `TrainingCycleStatus`; `getCompletedCycles()` já filtra estritamente por `'completed'`, então arquivados somem da lista principal sem precisar de filtro adicional.
7. **Durações diferentes:** o motor de comparação (`training-cycle-comparison.ts`) sempre compara totais **e** médias semanais/por-sessão; a UI usa mensagens narrativas para indicar quando a duração diverge.
8. **Exercícios diferentes:** comparação restrita à interseção de `exerciseId`; exercícios exclusivos de cada ciclo aparecem em listas separadas (`exclusiveToFirstExercises`/`exclusiveToSecondExercises`).
9. **Ciclos vazios/curtos:** `MIN_SESSIONS_FOR_RELIABLE_COMPARISON = 4`; abaixo disso, `firstHasInsufficientData`/`secondHasInsufficientData` ficam `true` e a narrativa avisa antes de qualquer comparação de métricas.
10. **Compatibilidade com backups da Sprint 17:** testado explicitamente — um backup sem as chaves novas importa normalmente, com as chaves ausentes reportadas em `skippedKeys` (nunca erro).
11. **Componentes reaproveitados:** `CycleSummaryCard` ganhou props opcionais (`reviewAnalytics`, `onAddReview`) em vez de um componente paralelo; o padrão de card/confirmação inline de `CycleSection.tsx` foi replicado nos novos formulários.
12. **Sem rota nova:** tudo em `/plano` (aba Ciclo), mais três seções novas em Dashboard/Insights/Perfil que já existiam como páginas.

## O que foi implementado

### Revisões de ciclo
- `src/lib/training-cycle-reviews.ts` — modelo (`CycleReview`, fases `mid_cycle`/`end_cycle`/`manual`), storage (`lrpg-fit:cycle-reviews`), CRUD, `isMidCycleReviewAvailable` (metade do trajeto planejado, sem revisão de meio de ciclo ainda).
- `src/lib/training-cycle-review-analytics.ts` — médias de progresso/recuperação/satisfação percebidos, última revisão, variação entre meio de ciclo e final. Sem inferência de causalidade.
- `src/components/plano/CycleReviewForm.tsx` — formulário reutilizável com escalas 1–5 com labels descritivos (nunca "sucesso/fracasso").
- `src/components/plano/CycleReviewPrompt.tsx` — aviso de meio de ciclo com estatísticas-chave e ação "Agora não" (não bloqueia o ciclo).
- Oferta de revisão final ao concluir um ciclo, e opção de adicionar depois em qualquer ciclo concluído sem revisão final (`CycleSummaryCard`).

### Classificação de semanas
- `src/lib/training-cycle-weeks.ts` — modelo (`CycleWeekAnnotation`, tipos `normal`/`recovery`/`test`/`transition`), storage (`lrpg-fit:cycle-week-annotations`), upsert único por ciclo+semana; semanas "normal" sem nota não são persistidas.
- `src/lib/training-cycle-week-summary.ts` — `buildCycleWeekBreakdown` (uma linha por semana, incluindo a semana corrente parcial), `countWeeksByType`, `buildWeekTypeTrendNote` (explica quedas de volume coincidentes com semanas de recuperação/teste/transição sem tratá-las como regressão).
- `src/components/plano/CycleWeeksSection.tsx` — lista de semanas com classificação/nota inline.

### Comparação entre ciclos
- `src/lib/training-cycle-comparison.ts` — `compareCycles` (puro, recebe ciclo+resumo já calculados dos dois lados): métricas com `MetricComparison` (`higher`/`lower`/`equal`/`not_comparable`), comparação de exercícios e grupos musculares compartilhados, listas de exclusivos, mensagens narrativas limitadas (máx. 8), nunca declara "vencedor".
- `src/components/plano/CycleComparisonSection.tsx` — seletores de ciclo (apenas concluídos, sem repetir seleção), reaproveitado em `/plano` e em Insights.

### Arquivamento
- `archiveCycle`/`restoreCycle`/`getArchivedCycles` em `training-cycles.ts`. Ciclo ativo não pode ser arquivado diretamente (precisa ser encerrado antes). Restaurar volta para `'completed'`, nunca para `'active'`.
- `src/components/plano/CycleHistorySection.tsx` — substitui a antiga lista única por duas seções (`Ciclos concluídos` / `Ciclos arquivados`), com confirmação antes de arquivar.

### Exclusão
- **Não implementada de propósito.** O app não tem nenhum fluxo de exclusão permanente em nenhum outro domínio (histórico de treino, badges, diário) — apenas `resetAllData()` apaga tudo de uma vez. Arquivamento cobre a necessidade de "tirar da lista principal sem perder dados". Reabrir esta decisão exige alinhamento explícito, já que contraria o padrão do resto do app.

### Integração Dashboard/Insights/Perfil
- `CurrentCycleCard` (Dashboard): ciclo ativo, semana atual, tipo da semana, próxima revisão disponível, tendência.
- `CycleEvolutionSection` (Insights): agregados entre todos os ciclos concluídos + comparação reaproveitada.
- `CycleStatsSection` (Perfil): concluídos/arquivados, duração média, aderência média, ciclo com mais PRs, semanas de recuperação, satisfação média, objetivo mais usado.

### Backup
- `lrpg-fit:cycle-reviews` e `lrpg-fit:cycle-week-annotations` adicionados a `STORAGE_KEYS`/`ARRAY_KEYS` em `backup.ts`.
- Testes cobrindo: round-trip completo, importação de um backup da Sprint 17 sem os campos novos (compatibilidade), rejeição de dado malformado.

## Bug encontrado e corrigido durante o QA visual

`buildCycleWeekBreakdown` computava os limites de cada semana usando `getWeekEnd(cursor)` sem respeitar o `endDate` real do ciclo. Para um ciclo concluído no meio de uma semana de calendário, isso fazia a última semana exibida somar sessões ocorridas *depois* do encerramento do ciclo — inconsistente com o resumo principal (`buildCycleSummary`), que já corta em `completedAt`. Corrigido limitando `effectiveWeekEnd = min(weekEnd, endDate)`; teste de regressão adicionado em `training-cycle-week-summary.test.ts`.

## Decisões arquiteturais

- Todo módulo novo segue o padrão da Sprint 17: função pura de leitura/derivação separada de storage separada de UI.
- `compareCycles` recebe `{ cycle, summary }` já calculados em vez de recalcular — evita duplicar `buildCycleSummary` e mantém o motor 100% testável sem mocks de storage.
- Nenhuma store Zustand foi tocada; nenhuma lógica de XP/badges/PR/prontidão/ajuste de sessão foi alterada.

## Arquivos criados

```
src/lib/training-cycle-reviews.ts (+ .test.ts)
src/lib/training-cycle-review-analytics.ts (+ .test.ts)
src/lib/training-cycle-weeks.ts (+ .test.ts)
src/lib/training-cycle-week-summary.ts (+ .test.ts)
src/lib/training-cycle-comparison.ts (+ .test.ts)
src/components/plano/CycleReviewForm.tsx
src/components/plano/CycleReviewPrompt.tsx
src/components/plano/CycleWeeksSection.tsx
src/components/plano/CycleComparisonSection.tsx
src/components/plano/CycleHistorySection.tsx
src/components/dashboard/CurrentCycleCard.tsx
src/components/insights/CycleEvolutionSection.tsx
src/components/profile/CycleStatsSection.tsx
```

## Arquivos alterados

```
src/lib/training-cycles.ts        — status 'archived', archiveCycle/restoreCycle/getArchivedCycles
src/lib/backup.ts                 — duas chaves novas em STORAGE_KEYS/ARRAY_KEYS
src/lib/backup.test.ts            — seeds + testes de compatibilidade/round-trip
src/lib/training-cycles.test.ts   — testes de archive/restore/import
src/components/plano/CycleSection.tsx        — orquestração de revisões, semanas, comparação, arquivamento
src/components/plano/CycleSummaryCard.tsx    — props opcionais reviewAnalytics/onAddReview
src/app/(dashboard)/dashboard/page.tsx        — + CurrentCycleCard
src/app/(dashboard)/insights/page.tsx         — + CycleEvolutionSection
src/app/(dashboard)/perfil/page.tsx           — + CycleStatsSection
```

(Sprint 17 — `training-cycles.ts`, `training-cycle-summary.ts`, `CycleForm.tsx`, `CycleSummaryCard.tsx`, `CycleSection.tsx` e seus testes chegaram sem commit anterior a esta sprint; foram estendidos, não reescritos.)

## Testes

357 testes no total (17 arquivos), todos passando. Novos nesta sprint: revisões (19), analytics de revisão (6), anotações semanais (16), resumo semanal do ciclo (11, incluindo o teste de regressão do bug de corte de data), comparação de ciclos (14), archive/restore (8), backup (3 novos casos).

## Gates

```
lint      ✅ sem warnings
typecheck ✅ sem erros
test      ✅ 357/357
build     ✅ next build completo, 19 rotas geradas
```

## QA visual

Funcional, via Browser pane (criação de ciclo, revisão intermediária/final, classificação de semana, arquivamento, restauração, comparação com dados insuficientes) — confirmado passo a passo contra um ciclo pré-existente no localStorage do ambiente de dev.

Screenshots (desktop 1280×900 e mobile 390×844, via Playwright + Microsoft Edge — o Browser pane trava no `screenshot` nativo neste ambiente): `docs/screenshots/sprint17-1/`
- `{desktop,mobile}-01-ciclo-ativo.png`
- `{desktop,mobile}-02-ciclo-concluido-expandido.png` (revisão, semanas, arquivar)
- `{desktop,mobile}-03-comparar-ciclos.png`
- `{desktop,mobile}-04-dashboard.png` (Ciclo atual)
- `{desktop,mobile}-05-perfil.png` (Ciclos de treino)

## Limitações conhecidas

- Exclusão permanente de ciclo não implementada (decisão documentada acima).
- `CycleEvolutionSection` (Insights) só renderiza quando a página já tem `hasAnyData` (algum treino registrado) — um ciclo criado sem nenhum treino associado não aparece em Insights até o primeiro treino ser registrado. Comportamento herdado da estrutura existente da página, não uma regressão desta sprint.
- Durante o QA, um indicador "1 error" do overlay de dev do Next.js apareceu no canto inferior esquerdo em uma sessão de screenshot isolada (Playwright). Não foi possível reproduzir no console do Browser pane nem nos logs do servidor, e o `next build` de produção completou sem erros — tratado como artefato de dev-mode não relacionado a este sprint, não investigado further para não expandir escopo.

## Não regressão confirmada

Criação/encerramento/histórico/resumo de ciclo (Sprint 17) continuam funcionando; XP, badges, PRs, 1RM, progressão, prontidão, ajustes de sessão e carga semanal intocados; backup anterior à Sprint 17 e da Sprint 17 continuam compatíveis; app funciona normalmente sem nenhum ciclo criado; nenhuma classificação de semana ou revisão altera métricas de treino; nenhum ciclo arquivado teve dado apagado; nenhuma rota nova foi criada.

## Status do Git

Nada foi commitado ou enviado ao remoto nesta sessão — todas as mudanças permanecem no working tree, conforme escopo da tarefa. Arquivos estranhos preexistentes no working tree, não relacionados a esta sprint e não tocados: `DESIGN (1).md`, `README (1).md`, `SPRINT-17.md`, `test-results/`.
