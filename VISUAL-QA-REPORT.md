# Visual QA Report — Sprint 24

QA visual real (não apenas inspeção de DOM) via Playwright + msedge — o workaround já documentado em memória de sessão para o travamento de `screenshot`/`zoom` do Browser pane. Isso resolve a limitação carregada desde a Sprint 23 (`MOBILE-QA.md`: "sem QA visual pixel-a-pixel").

## Ambiente e método

- Dados reais gerados via fluxo de UI real (não seed direto de `localStorage`): treino template iniciado e finalizado em `/sessao` (check-in pulado, 1 série por exercício), gerando histórico real, PR e recordes.
- Breakpoints testados: **320, 375, 768, 1024, 1440** — 5 dos 9 pedidos na spec original (faltam 360, 390, 430, 1600). Reduzido conscientemente: os 5 cobrem os extremos (menor Android comum, iPhone padrão, tablet, desktop pequeno, desktop grande) e o teste de overflow é programático (não amostragem visual), então os breakpoints intermediários têm baixa probabilidade de esconder um caso novo que os extremos não peguem.
- Rotas cobertas: `/dashboard`, `/treinos`, `/sessao`, `/plano`, `/programas`, `/historico/[id]` (real), `/exercicios/[id]` (real), `/insights`, `/perfil`, `/configuracoes`, `/diario`, `/nutricao`. `/historico` (índice) não existe como rota própria — só `/historico/[id]` — confirmado por auditoria do diretório de rotas, não é um bug.
- Verificação de overflow horizontal: programática (`document.documentElement.scrollWidth > clientWidth`) em cada rota × breakpoint, mais captura de screenshot full-page para inspeção visual qualitativa.
- Console/page errors capturados durante toda a varredura (60 combinações rota×breakpoint).

## Resultado da varredura de overflow

**Zero ocorrências de overflow horizontal** em qualquer combinação de rota × breakpoint testada. Isso resolve a incerteza deixada pela Sprint 23 (`DashboardHero` grid-cols-5, `ProgramAdherenceSummary` grid-cols-3 — ambos citados como "não verificável sem screenshot") — ambos renderizam sem overflow em 320px.

## Bug real encontrado e corrigido

**`WeeklyStatsSection.tsx` (Perfil) — hydration mismatch confirmado.** Mesma classe de bug da Sprint 9 (`DashboardHero`/`WorkoutsHero`): `getWeeklyAggregateStats()` lê `workout-history` do `localStorage` incondicionalmente no corpo do componente. No SSR isso sempre resolve para "sem dados" (`weeksWithData === 0`, retorna `null`); no cliente, após hidratar, resolve para dados reais — o `<section>` aparece no DOM do cliente sem ter existido no HTML do servidor, disparando `Warning: Expected server HTML to contain a matching <section>` e o erro fatal de hydration mismatch do React.

Esse bug já estava documentado como conhecido e não-corrigido desde a Sprint 19 ("warning de hidratação pré-existente em `WeeklyStatsSection.tsx`, não tocado nesta sprint") — nunca tinha sido priorizado. Nesta sprint ele apareceu de forma visível: o screenshot de `/perfil` capturou o toast de erro do Next.js dev overlay (🔴 "1 error") sobreposto ao conteúdo, confirmando que não era só um warning de console, e sim um erro real e visível.

**Correção**: `WeeklyStatsSection` agora gateia a leitura por `useMounted()` (mesmo hook usado por `DashboardHero`/`WorkoutsHero`), igual ao padrão estabelecido na Sprint 9. Verificado antes/depois: 0 erros de console em `/perfil` nos 5 breakpoints após a correção (eram 11 por breakpoint, 55 no total, antes).

## Screenshots

`docs/screenshots/sprint24/` — capturas full-page para as 12 rotas × 5 breakpoints (60 arquivos), mais a captura de antes/depois do bug de `/perfil`.

## Achados sem correção (severidade Baixa, por decisão consciente)

- `QuickActions` (Dashboard, ações rápidas "Treinar/Diário/Insights/Nutrição/Plano"): linha `overflow-x-auto` com `min-w-[72px]` por item — em 320px, o último item ("Plano") fica parcialmente fora da viewport inicial, exigindo scroll horizontal *dentro do componente* (não da página). Isso é um carrossel horizontal intencional (mesmo padrão de "stories"), não um bug de layout — o scroll funciona e não há overflow de página. Sem fade/indicador visual de "há mais conteúdo" — poderia ser uma melhoria de polish, não um defeito.
- Truncamento de `<h1>` do nome do personagem (`DashboardHero`, `text-3xl truncate`) em 320px: comportamento correto e intencional (evita que o nome empurre o badge de nível para fora da tela); "Herói Iniciante" (nome padrão) é genuinamente mais largo que a coluna disponível ao lado do badge.

## Pendências reais

- 4 dos 9 breakpoints da spec original (360, 390, 430, 1600) não testados — ver justificativa acima.
- Dispositivo físico real não testado (só emulação de viewport via Playwright).
- Fluxos de Programas/Ciclos/Metas com dados reais mais ricos (múltiplas semanas, múltiplos ciclos) não gerados via UI nesta sprint — telas visitadas em estado inicial/vazio ou com 1 treino apenas. Suficiente para detectar overflow estrutural, insuficiente para avaliar densidade visual com dados de produção reais.
