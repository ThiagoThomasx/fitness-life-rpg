# Sprint 29 — Health Platform Feasibility & Recovery Experience

**Objetivo duplo:**
- **A — Feasibility**: decidir, com evidências técnicas, o caminho correto para integrações futuras com Health Connect/Samsung Health/Apple Health.
- **B — Recovery Experience**: transformar os dados locais já existentes (Sprint 28) em uma experiência consolidada de saúde e recuperação.

## Parte 1 — Health Platform Feasibility & ADR ✅

**Validação inicial**: repositório limpo, branch `master`, commit `d129bfa` (Sprint 28 Parte 4) confirmado, 14 commits locais à frente de `origin/master`, nada pushado. Gates antes de começar: lint ✅, typecheck ✅, 1393/1393 testes ✅, build ✅.

**Auditoria de plataforma**: Next.js 14.2.35 (App Router) puro, sem Capacitor/Android/iOS. PWA já existe em produção (`public/manifest.webmanifest`, `public/sw.js` manual). Supabase presente no código mas desativado no fluxo ativo (decisão pré-existente do `CLAUDE.md`). 100% local-first via `localStorage`.

**Pesquisa técnica**: Android Health Connect (SDK mín. Android 8/API 26, app mín. Android 9/API 28, parte do framework a partir do Android 14), Samsung Health (converge para Health Connect), Apple HealthKit (framework nativo iOS, sem nenhum acesso via navegador), PWA (sem API Web de saúde), Capacitor (plugins de terceiros existem para ambos, mas exigem toolchain nativa completa). Fontes em `HEALTH-PLATFORM-FEASIBILITY.md`.

**Matriz de feasibility**: 5 opções avaliadas (Web/PWA, Web+importação, Capacitor, app nativo separado, backend de sync). Ver `HEALTH-PLATFORM-FEASIBILITY.md` seção 7.

**Decisão (ADR)**: manter o produto como web app com importação de arquivos como estratégia principal (Opção B) — ver `docs/adr/ADR-HEALTH-PLATFORM.md`. Não adotar Capacitor nem integração nativa produtiva nesta fase. Justificativa central: mantenedor único, sem demanda validada, e a arquitetura de domínio (`health-data/`) já torna essa decisão reversível sem dívida técnica.

**Provider abstraction**: `HealthDataProvider` (`src/lib/health-data/provider.ts`) documentada — `isAvailable`, `requestPermissions`, `readRecords`, `revokePermissions?`. `MockHealthProvider` (`mock-provider.ts`) prova a arquitetura com dados sintéticos, permissão parcial, erro simulado e leitura duplicada. `importFromProvider` (`provider-import.ts`) é a ponte única que leva registros de um provider pela mesma pipeline de importação de arquivo já existente (`buildHealthImportPreview` → `applyHealthImportRecords`) — nenhum atalho direto para storage, nenhum provider alimenta Readiness/Recovery/Fatigue/Coach diretamente. Ver `HEALTH-PROVIDER-INTERFACE.md`.

**Testes**: 15 novos (`mock-provider.test.ts`, `provider-import.test.ts`) cobrindo disponibilidade, permissão total/parcial/negada, leitura, erro simulado, deduplicação via pipeline real, revogação. 1408/1408 no total. Lint/typecheck/build limpos.

**Fora de escopo (confirmado)**: nenhuma integração produtiva, nenhum SDK nativo adicionado, nenhuma credencial, sem impacto no build web.

---

## Parte 2 — Health Recovery Dashboard Foundation ✅

**Agregador**: `buildHealthRecoveryDashboard(period, now)` (`src/lib/health-data/recovery-dashboard.ts`) — ponto de entrada único de página, compõe `getSummaryRange`/`getMetricBaseline`/`getMetricTrend`/`getConflicts`/`getWeightRecordsFromBodyProgress` sem duplicar nenhum cálculo. Nunca lança para "sem dados": `hasAnyData: false` + campos `null`/vazios.

**Rota `/saude`**: nova rota, não adicionada à navegação principal (decisão travada, `CLAUDE.md` regra 6) — acessível via `HealthRecoveryLinkCard` em Configurações, mesmo padrão de `/preferencias`. Filtro de período reutiliza `PERIOD_OPTIONS` do Dashboard Analytics.

**Seções**: resumo (`HealthRecoverySummary`), sono/FC de repouso/passos/atividade (`HealthRecoveryMetricSection` — componente único reutilizado, DRY), peso (`HealthRecoveryWeightSection`, só leitura, linka para `/perfil`/Body Progress), qualidade (`HealthRecoveryQualitySection`, sem score único), conflitos (`HealthRecoveryConflictsSection`, sem resolução automática). Disclaimers exigidos pelo brief presentes (FC de repouso, baseline insuficiente).

**QA manual real**: dev server, dados reais de FC de repouso/passos/peso, estado "dados insuficientes" honesto para sono/atividade (1 dia de amostra), qualidade (2 dias, alta/média), conflitos (estado vazio) — sem erro de console. 375px sem overflow horizontal.

**Testes**: 6 novos (`recovery-dashboard.test.ts`) cobrindo estado vazio, baseline com 7+ dias, amostra insuficiente, adapter de peso, conflitos, distribuição de qualidade. 1414/1414 no total. Lint/typecheck/build limpos.

Ver `HEALTH-RECOVERY-EXPERIENCE.md`.

## Parte 3 — Health × Training Relationships & Explainability ✅

**Relações**: `buildHealthTrainingRelationships` (`src/lib/health-data/relationships.ts`) — 4 relações (sono × volume, sono × prontidão relatada, FC de repouso × prontidão relatada, atividade × carga), comparando dois grupos (sinal abaixo/na-ou-acima da baseline), amostra mínima de 5 dias por grupo, texto neutro sem causalidade (testado explicitamente). "Prontidão relatada" usa o campo bruto `energy` do check-in, não o score completo recalculado — decisão documentada.

**Data Usage Explainability**: `buildHealthDataUsageExplainability` (`src/lib/health-data/data-usage.ts`) — traduz o `HealthContext` do dia (mesmo objeto que Readiness/Recovery/Fatigue/Coach consomem) em `used`/`reasons` por sinal, sem reimplementar gating.

**UI**: `HealthRelationshipsSection` e `HealthDataUsageSection`, adicionadas a `/saude` abaixo de Qualidade e Conflitos.

**QA manual real**: dev server, ambas as seções renderizam estados honestos de "amostra insuficiente"/"não utilizado" com motivo, sem erro de console.

**Testes**: 9 novos (`relationships.test.ts` × 5, `data-usage.test.ts` × 4). 1423/1423 no total. Lint/typecheck/build limpos.

**Pendência consciente**: relação "saúde × conclusão de treino" (sessão pulada/reagendada) não implementada — não existe log consultável de sessões puladas hoje; registrado em `HEALTH-TRAINING-RELATIONSHIPS.md` para sprint futura.

Ver `HEALTH-TRAINING-RELATIONSHIPS.md`.

## Parte 4 — Visual QA, Mobile, Accessibility & Final Hardening ✅

**Breakpoints testados em `/saude`** (dev server real, dados reais): 320px, 390px, 768px, 1440px — sem overflow horizontal em nenhum (`document.body.scrollWidth <= window.innerWidth` confirmado em todos).

**Acessibilidade**: 1 único `h1` na página; todas as 10 `<section>` têm `aria-label`/`aria-labelledby`; filtro de período com `role="group"` + `aria-pressed`; hierarquia de heading (`h1` → `h3`) consistente com o padrão já existente em todo o app (ex.: Configurações) — não é uma regressão introduzida nesta sprint.

**Data safety**: nenhuma chave de `localStorage` nova foi introduzida nas Partes 2-3 (`recovery-dashboard.ts`/`relationships.ts`/`data-usage.ts` são 100% derivados, sem persistência própria); `resetHealthData`/backup/restore continuam cobertos pelos testes existentes de `backup.test.ts`, sem alteração.

**Documentação final**: `ARCHITECTURE.md` atualizado com a seção `lib/health-data/*`; `CHANGELOG.md` e `ROADMAP_SPRINTS.md` atualizados a cada parte.

**Gates finais**: lint ✅, typecheck ✅, 1423/1423 testes ✅, build ✅.

**Pendências reais** (não maquiadas):
- Sem screenshot automatizado por breakpoint (Playwright) — QA via `document.body.scrollWidth`/DOM assertions no navegador do dev server, mesmo padrão de rigor, formato diferente.
- Sem teste de leitor de tela real (NVDA/VoiceOver) — fora do alcance desta sessão.
- Relação "saúde × conclusão de treino" (sessão pulada/reagendada) não implementada — sem log de sessões puladas hoje (ver `HEALTH-TRAINING-RELATIONSHIPS.md`).
- Nenhuma integração nativa real (Health Connect/Samsung Health/Apple Health) — decisão consciente do ADR, não uma limitação técnica desta sprint.

## Próximo passo recomendado

**Sprint 30 — Health Import Expansion.** Justificativa: o ADR (`docs/adr/ADR-HEALTH-PLATFORM.md`) recomenda importação de arquivos como estratégia principal para fontes externas; a experiência de Recovery (Partes 2-3) já prova que dados manuais/importados geram valor real (baseline, tendência, relações). O próximo incremento de maior valor é expandir a importação (mais formatos, exportações comuns de apps de saúde populares, talvez importação recorrente/agendada) — não um protótipo de Health Connect, que o ADR explicitamente adia até haver demanda validada.
