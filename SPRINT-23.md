# Sprint 23 — Mobile Polish, Accessibility & Product Reliability

**Objetivo:** camada transversal de acabamento e robustez sobre tudo que já existe (navegação, acessibilidade, mobile, confiabilidade de dados, performance, consistência) — sem novo domínio funcional. Ver `ACCESSIBILITY-AUDIT.md`, `MOBILE-QA.md` e `DATA-SAFETY-INVENTORY.md` para o detalhe de cada frente.

## Auditoria

Executada antes de qualquer alteração, via 4 agentes de exploração paralelos cobrindo rotas/navegação, acessibilidade, mobile/responsivo e dados/performance. Achados classificados por severidade — ver os 3 documentos de detalhe. Resumo dos achados **Alto**:

- `GoalForm`/`BodyProgressForm`: `<label>` visual sem `htmlFor`/`id`.
- `OnboardingModal` não usava o `ModalShell` compartilhado (sem foco inicial, sem Escape, sem devolução de foco).
- Gráficos de exercício sem resumo textual (só tooltip por hover/toque).
- `PrsSection`, `RecentBadges`/`RecentRecordsCard`/`RecordsSection`/`ExerciseRecordsSection`: recordes com `exerciseId`/`workoutId` disponíveis mas renderizados como texto plano, não link.
- Sessão ativa: botão "Finalizar" não sticky — some da tela em listas de exercícios longas.

Achados que **não** viraram tarefa (escopo descartado, com justificativa):

- Badges (`RecentBadges`/`BadgesGrid`): `EarnedBadge` não carrega `workoutId`/`exerciseId`/`recordType` (é baseado em contadores agregados — `workout_count`, `pr_count`, `level`, etc.), então não há destino real para linkar. A regra do próprio sprint (§5.2) veta tornar todo badge clicável sem destino real — mantidos como estão.
- Refatoração de `plano/page.tsx` (700 linhas) e `sessao/page.tsx` (691 linhas) em módulos menores: identificado como candidato, mas não executado — risco de introduzir regressão no fluxo de sessão ativa sem ganho medido, contra a regra do próprio sprint de não otimizar sem problema concreto (§26/§28).
- Seletores whole-store (`useSessionStore()`, `useCharacterStore()` sem seletor) em `sessao/page.tsx`/`treinos/page.tsx`/`dashboard/page.tsx`: mesma decisão — severidade Baixa na auditoria, sem medição concreta de re-render excessivo, não mexido.
- `ProgramAdherenceInsightsSection` recalcula por render sem `useMemo`: não é hot-path (roda uma vez por carregamento de Insights, sem estado que force re-render frequente) — só `ExerciseChartsSection` (com filtro de período interativo) tinha o padrão realmente redundante, e foi corrigido.
- Grids sem breakpoint responsivo em `DashboardHero`/stat-grids de 3 colunas: severidade Baixa, sem evidência de overflow real — não alterado.
- Focus trap real e `aria-describedby` consistente em todos os dialogs: focus trap foi implementado no `ModalShell` (beneficia todos os consumidores automaticamente); `aria-describedby` exigiria auditar individualmente o conteúdo de cada dialog consumidor — maior que uma tarefa de 1-4h, não executado nesta sprint.

## Implementado

### Parte 1 — Navegação & Acessibilidade (commit `eb294f9`)

- Links de `/exercicios/[id]` e `/historico/[id]` adicionados em: `PrsSection`, `RecentRecordsCard`, `RecordsSection` (incluindo novo campo `heaviestWeightExerciseId` em `ProfileRecordStats`), `ExerciseRecordsSection` (resolvendo a pendência documentada desde a Sprint 22 Parte 2 — a rota `/historico/[id]` já existe desde a Parte 3, só faltava conectar).
- `/programas/[id]`: nova seção "Sessões concluídas" listando `CompletedWorkout`s do programa (via `source.programId`), cada um linkando para `/historico/[id]`.
- `OnboardingModal` reconstruído sobre `ModalShell` (foco inicial, devolução de foco, `aria-labelledby` consistente) em vez de um dialog não gerenciado.
- `ModalShell`: focus trap por teclado (Tab/Shift+Tab não escapam mais do dialog).
- `GoalForm`/`BodyProgressForm`: todo `<label>` visual ganhou `htmlFor`/`id` pareado.
- `ExerciseChartsSection`: os 4 gráficos que só expunham dados via tooltip ganharam resumo textual (mesmo padrão do gráfico "Carga por execução", que já tinha).

### Parte 2 — Mobile Polish (commit `e671c62`)

- `.session-header` (sessão ativa) tornou-se `position: sticky; top: 0` — o botão "Finalizar" permanece visível ao rolar uma lista de exercícios longa.
- `env(safe-area-inset-*)` adicionado ao hambúrguer, botão de fechar do drawer, rodapé da sidebar, reward toast e `padding-top` do `.app-main` — evita sobreposição com notch/gesture bar em dispositivos com tela sem bordas.
- Alvos de toque `.icon-btn`, hambúrguer, botão de fechar e `.nav-link` elevados de 36-40px para 44px.

### Parte 3 — Data Safety (commit `927b759`)

- Auditoria confirmou que backup/restore já cobre 100% das chaves persistidas, valida tudo antes de escrever, e faz rollback em falha — sem gap real ali.
- Único gap real: histórico de treinos só podia ser apagado via reset total. Adicionado `resetWorkoutHistory()` (`workout-history.ts`) e `resetPersonalRecordEvents()` (`personal-record-events.ts`), sempre disparados juntos por uma nova seção em Configurações (`WorkoutHistoryResetSection`) — evita órfãos (eventos de recorde apontando para `workoutId`s apagados).
- 4 testes novos cobrindo os dois resets.

### Parte 4 — Performance & Consistência (commit `09bc295`)

- `ExerciseChartsSection`: as 5 séries de gráfico (carga, 1RM, volume, reps, frequência) eram recalculadas independentemente a cada render — cada uma re-parseando e renormalizando o histórico completo do zero. Memoizadas juntas via `useMemo`, chave `[exerciseId, period]`.

## Rotas

| Link adicionado | De | Para |
|---|---|---|
| Recorde pessoal (Insights) | `PrsSection` | `/exercicios/[id]` |
| Último recorde (Dashboard) | `RecentRecordsCard` | `/exercicios/[id]` |
| Maior carga / maior evolução (Perfil) | `RecordsSection` | `/exercicios/[id]` (quando o dado tem id — maior carga sempre tem; maior evolução só quando há dado) |
| Recorde pessoal (Exercício) | `ExerciseRecordsSection` | `/historico/[id]` |
| Sessão concluída (Programa) | `programas/[id]` (novo) | `/historico/[id]` |

Não-links (decisão consciente): badges recentes/grade de badges — sem `workoutId`/`exerciseId` no modelo de dados, sem destino real.

## Acessibilidade

- Teclado: focus trap adicionado ao `ModalShell` (beneficia todos os dialogs que o usam — sessão, substituições, Planner, programas, recomendações, reset, backup, histórico, filtros).
- `OnboardingModal`: foco inicial, Escape (não aplicável — modal não-dismissível por design, fluxo obrigatório de primeiro acesso), devolução de foco ao fechar.
- Formulários: `GoalForm`/`BodyProgressForm` com labels programaticamente associados.
- Gráficos: resumo textual adicionado aos 4 gráficos de `ExerciseChartsSection` que só expunham dado via tooltip.
- Árvore de acessibilidade inspecionada via Browser pane (`read_page`) em vez de leitor de tela real (não disponível neste ambiente) — limitação documentada.

## Mobile

Breakpoint testado: 375px (mobile preset do Browser pane). 320/430/768/1440 não teve QA visual real nesta sprint — screenshot do Browser pane trava neste ambiente (limitação conhecida, ver `MOMORY.md`/memória de sessão); verificação feita via `read_page`/`javascript_tool` (estrutura, computed styles, navegação funcional) em vez de inspeção visual pixel-a-pixel. Ver `MOBILE-QA.md`.

## Data Safety

Ver `DATA-SAFETY-INVENTORY.md` para o inventário completo de chaves persistidas × cobertura de backup/restore/reset.

## Performance

- Gargalo encontrado e corrigido: `ExerciseChartsSection` (5x recompute por render).
- Gargalos identificados e **não** corrigidos por decisão consciente (sem problema concreto medido): seletores whole-store em páginas de alto tráfego, `ProgramAdherenceInsightsSection` sem memo (não é hot-path).

## Testes

- `personal-record-events.test.ts`: +2 testes (`resetPersonalRecordEvents`).
- `workout-history.test.ts` (novo arquivo): +2 testes (`resetWorkoutHistory`).
- Total: 952/952 (era 948/948 na Sprint 22 Parte 3).

## QA

- Desktop: não testado nesta sprint (foco declarado era mobile+a11y+confiabilidade).
- Mobile (375px): dashboard, onboarding, exercício, histórico, treinos, sessão ativa, configurações — navegado e inspecionado via `read_page`/`javascript_tool`. Screenshot visual não disponível neste ambiente (ver limitação acima).
- Teclado: dialog do `ModalShell` e `OnboardingModal` expõem `role="dialog"`/dialog tree corretamente na árvore de acessibilidade; focus trap implementado mas não verificado por interação real de Tab neste ambiente (clique programático via `.click()` não aciona corretamente os handlers React neste Browser pane — confirmado com um componente pré-existente também falhando da mesma forma, então é uma limitação do ambiente, não um bug introduzido).
- Dados: reset de histórico verificado por teste unitário, não por clique real na UI (mesma limitação de `.click()` acima).
- Console: zero erros observados durante a navegação manual feita.

## Gates

```
Lint: aprovado
Typecheck: aprovado
Tests: 952/952
Build: aprovado
```

## Commits

- `eb294f9` — fix: close workout and exercise navigation gaps, harden a11y (Sprint 23 part 1)
- `e671c62` — fix: polish mobile layouts and interaction targets (Sprint 23 part 2)
- `927b759` — fix: harden granular workout-history reset flow (Sprint 23 part 3)
- `09bc295` — refactor: memoize exercise chart series to avoid redundant recompute (Sprint 23 part 4)

Nenhum commit foi enviado ao remoto (`origin/master` segue parado em Sprint 20 parte 1 — ver histórico local).

## Pendências reais

- `aria-describedby` não wired em nenhum dialog consumidor do `ModalShell` (só o shell em si ganhou capacidade de focus trap).
- Sem QA visual pixel-a-pixel (screenshot do Browser pane indisponível neste ambiente) — verificação foi estrutural/funcional via DOM, não visual.
- Sem leitor de tela real disponível para QA — inspeção via árvore de acessibilidade do navegador.
- `plano/page.tsx`/`sessao/page.tsx` seguem grandes (700/691 linhas) — candidatos a split futuro, não executado.
- Seletores whole-store em páginas de alto tráfego não estreitados — sem medição concreta que justifique o risco nesta sprint.

## Próximo passo recomendado

**Sprint 24 — Product Reliability Part 2**, não Analytics 2.0. Razões: (1) QA visual real (screenshot/dispositivo físico) ainda não foi feito nesta sprint por limitação de ambiente — vale confirmar em um ambiente com screenshot funcional antes de adicionar mais superfície; (2) `aria-describedby`, teste de teclado real e leitor de tela real ficaram pendentes; (3) os dois arquivos grandes (`plano`, `sessao`) seguem sem split. Fechar essas pendências deixa a base mais sólida antes de ampliar escopo com Analytics 2.0.
