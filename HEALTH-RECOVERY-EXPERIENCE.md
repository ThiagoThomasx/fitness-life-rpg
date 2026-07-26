# Health Recovery Experience — Sprint 29 Parte 2

Documenta a fundação da experiência de Saúde e Recuperação: `buildHealthRecoveryDashboard` (`src/lib/health-data/recovery-dashboard.ts`) e a rota `/saude`.

## Por que uma rota nova

Regra do brief (seção 11): só criar rota principal se houver conteúdo suficiente e navegação coerente. A experiência cobre 4 métricas com gráfico + baseline, peso (linkado), qualidade e conflitos — conteúdo suficiente para uma página própria. A rota **não** foi adicionada à navegação principal (sidebar/tab bar): a decisão de navegação está travada desde o Sprint 1 (`CLAUDE.md` regra 6). `/saude` é acessível via card em Configurações → "Dados de saúde" (`HealthRecoveryLinkCard`), mesmo padrão já usado por `/preferencias` (`PreferencesLinkCard`).

## `buildHealthRecoveryDashboard(period, now)`

Agregador puro de página — uma única chamada por troca de período, composta a partir dos motores já existentes (nenhum recálculo duplicado):

- `getSummaryRange` → série diária (`dailySeries`, ordem cronológica para gráficos).
- `getMetricBaseline` + `getMetricTrend` → um `HealthRecoveryMetricView` por métrica (sono, FC de repouso, passos, atividade, calorias ativas, distância), com `deltaFromBaseline`, `daysAboveBaseline`/`daysBelowBaseline`.
- `getWeightRecordsFromBodyProgress` → peso (nunca duplicado — só leitura).
- `getConflicts` → conflitos do período.
- Qualidade agregada por nível (`high`/`medium`/`low`/`unknown`), nunca um score único.

Nunca lança para "sem dados" — `hasAnyData: false` e campos `null`/vazios quando não há nenhum registro, para que a UI renderize um estado vazio explícito.

## UI (`/saude`)

- Filtro de período (`7d/30d/90d/6m/1y/all`), reaproveitando `PERIOD_OPTIONS` já usado pelo Dashboard Analytics.
- Resumo no topo (`HealthRecoverySummary`) com os valores mais recentes, sem score único, cada card linkando por âncora à seção detalhada.
- `HealthRecoveryMetricSection` — componente único reutilizado para sono, FC de repouso, passos e atividade (DRY: evita 4 componentes quase idênticos). Mostra valor mais recente, baseline (com contagem de amostra), delta, tendência e um `LineChart` (Recharts) da série do período. Quando não há baseline, mostra o texto exigido pelo brief: "São necessários mais dados para criar uma linha de base."
- `HealthRecoveryWeightSection` — só leitura, linka para `/perfil` (Body Progress continua a única fonte de verdade e o único gráfico de peso).
- `HealthRecoveryQualitySection` — distribuição por nível de qualidade, nunca score numérico.
- `HealthRecoveryConflictsSection` — lista de conflitos com métrica, data, fontes, motivo e severidade; resolução automática não implementada (fora de escopo, ver `CLAUDE.md`).
- FC de repouso exibe o disclaimer exigido pelo brief: "A frequência cardíaca de repouso pode variar por diversos fatores. Este dado é informativo e não representa diagnóstico."

## QA manual realizado

- Testado com dados reais no dev server: resumo, sono (estado "dados insuficientes" com 1 dia), FC de repouso e passos (valores reais, sem baseline ainda), peso (leitura de Body Progress), qualidade (2 dias, alta/média) e conflitos (estado vazio) — todos renderizaram corretamente, sem erro de console.
- 375px (mobile): sem overflow horizontal (`document.body.scrollWidth === window.innerWidth`).

## Fora de escopo nesta parte

- Relações Saúde × Treino e explicabilidade de uso de dados (`Coach`/`Readiness`/`Recovery`/`Fatigue`) — Sprint 29 Parte 3.
- QA completo de breakpoints/acessibilidade — Sprint 29 Parte 4.
