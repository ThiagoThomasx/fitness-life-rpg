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

## Parte 3 — Health × Training Relationships & Explainability

Pendente.

## Parte 4 — Visual QA, Mobile, Accessibility & Final Hardening

Pendente.
