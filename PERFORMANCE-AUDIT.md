# Performance Audit — Sprint 31

## Bundle (antes da correção)

```text
/dashboard      299 kB First Load JS   (rota mais pesada do app)
/insights       292 kB
/saude          240 kB
/exercicios/[id] 237 kB
shared-by-all    87.5 kB
```

`recharts` compila para um único chunk compartilhado
(`8521-73554e29b0b11253.js`, ~85-90 kB gzip) — a maior dependência do bundle,
maior que `framework` + `main` juntos. Next.js já deduplica corretamente esse
chunk entre as 4 rotas que o usam (`dashboard`, `insights`, `saude`,
`exercicios/[id]`) — não havia duplicação de bundle, o problema era **quando**
ele carregava.

## Achado corrigido

`AnalyticsSection.tsx` (renderizado sem condição em `/dashboard`, a rota mais
visitada do app) importava `PerformancePanel` e `MuscleBalancePanel`
estaticamente, mesmo eles sendo os únicos 2 dos 6 painéis da seção que usam
`recharts`, e mesmo a aba padrão ("Destaques") não precisar de gráfico
nenhum. Todo visitante do dashboard pagava o custo de `recharts` mesmo sem
nunca clicar em "Performance" ou "Músculos".

**Correção**: `PerformancePanel` e `MuscleBalancePanel` convertidos para
`next/dynamic(() => import(...), { ssr: false, loading: () => <SkeletonCard /> })`
em `src/components/dashboard/analytics/AnalyticsSection.tsx`. Nenhuma mudança
de comportamento — os painéis carregam sob demanda ao trocar de aba.

**Resultado medido** (build real, antes/depois):

```text
/dashboard: 299 kB → 189 kB First Load JS (-110 kB, -37%)
```

Verificado em QA manual: clicar na aba "Performance" após a mudança carrega o
painel normalmente, sem erro de console.

## Outras rotas com `recharts` (não alteradas)

`/insights`, `/saude`, `/exercicios/[id]` renderizam seções de gráfico sem
abas — o usuário que navega para essas páginas presumivelmente quer o
gráfico, e o custo já fica isolado à rota (não vaza para `/dashboard` ou
`/treinos`). Lazy-loading ali só trocaria o custo por um flicker de loading
sem ganho líquido claro — não alterado (regra do projeto: só otimizar com
ganho objetivo demonstrável).

## Memoização

Revisão de todos os 17 usos de `useMemo`/`useCallback` no projeto — nenhuma
memoização inútil (todas guardam computação não-trivial: `buildDashboardAnalytics`,
`runCoachEngine`, `buildHealthRecoveryDashboard`, transforms de série de
gráfico) e nenhuma computação cara sem memo em componente de re-render
frequente foi encontrada com custo objetivamente mensurável. Um candidato
(`ActiveSessionBanner.tsx`, reduce sobre sets a cada tick de 1s do timer de
sessão) foi avaliado e descartado — itera sobre menos de 20 itens tipicamente,
custo de microssegundos, não vale a complexidade extra de memo.

## Componentes presentes em toda rota

`AppSidebar`, `StoreHydrationBoundary`, `RewardToast` (montados no
`layout.tsx` do grupo `(dashboard)`) — todos leves, sem subscrição de store
ampla desnecessária (`RewardToast` já usa seletores estreitos), sem
recomputação sem memo de estado derivado.

## Imports desnecessários

Nenhuma biblioteca "importar tudo" encontrada (`recharts`, `lucide-react`,
`zustand`, clientes Supabase, `clsx`, `class-variance-authority` — dependências
enxutas). Nota de higiene, não de performance: `lucide-react` está no
`package.json` mas nunca é importado no código (ícones são todos SVG inline)
— candidato a remoção do `package.json`, sem impacto de bundle (imports não
usados já são tree-shaken).

## Conclusão

Uma correção com ganho objetivo e medido (`-110 kB` no First Load JS da rota
mais visitada). Todo o resto do bundle, memoização e lazy loading já está
adequado — nenhuma outra mudança de performance foi aplicada nesta sprint.
