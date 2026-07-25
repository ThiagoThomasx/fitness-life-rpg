# Mobile QA — Sprint 23

## Ambiente de teste

Browser pane (Chromium via CDP), viewport 375×812 (preset mobile). **Screenshot/zoom do Browser pane trava consistentemente neste ambiente** (limitação conhecida, documentada em memória de sessões anteriores) — QA feito via `read_page` (árvore de acessibilidade), `get_page_text`, `javascript_tool` (estilos computados, dimensões) e navegação/cliques reais, não inspeção visual pixel-a-pixel. 320/430/768/1440px e dispositivo físico não testados nesta sprint.

## App shell (auditoria)

- Não existe `BottomNav` no projeto — navegação mobile é hambúrguer (canto superior esquerdo) abrindo um drawer full-height à esquerda. Isso é uma decisão de navegação já tomada (Sprint 1, spike travado) e fora de escopo reabrir nesta sprint.
- `.app-main` já compensava a barra fixa mobile com `padding-top: var(--mobile-header-height)` — correto, mas não considerava `env(safe-area-inset-top)`.
- Nenhum uso de `safe-area-inset-*` em todo o codebase antes desta sprint (`grep` confirmou 0 ocorrências).

## Correções aplicadas

| Elemento | Antes | Depois |
|---|---|---|
| `.session-header` (Finalizar treino) | Rolava com a página — em lista de exercícios longa, o botão "Finalizar" saía da tela e exigia rolar de volta ao topo. | `position: sticky; top: 0` — permanece visível durante o scroll. |
| `.hamburger-btn` | `top/left: var(--space-3)`, 40×40px | `+ env(safe-area-inset-top/left)`, 44×44px |
| `.sidebar__close-btn` | `top/right: var(--space-3)`, 36×36px | `+ env(safe-area-inset-top/right)`, 44×44px |
| `.sidebar__footer` (avatar/email no rodapé do drawer) | `padding-bottom: var(--space-3)` | `+ env(safe-area-inset-bottom)` |
| `.reward-toast` | `top: mobile-header-height + space-3` | `+ env(safe-area-inset-top)` |
| `.app-main` (mobile) | `padding-top: var(--mobile-header-height)` | `+ env(safe-area-inset-top)` |
| `.icon-btn` (genérico, toda a UI) | min 36×36px | min 44×44px |
| `.nav-link` (sidebar/drawer) | min-height 40px | min-height 44px |

Verificado via `javascript_tool` (computed style) que `.hamburger-btn` renderiza 44×44px em 375px de viewport.

## Fluxos navegados em 375px (funcional, sem captura visual)

1. Dashboard → onboarding modal (dialog acessível, dispensável via "Pular") → cards de recorde/badge renderizando.
2. Recorde recente (Dashboard) → `/exercicios/ex-4` → seção de gráficos com resumos textuais, seção de recordes pessoais linkando para `/historico/[id]`.
3. `/historico/[id]` → resumo da sessão, recordes da sessão, exercícios — carregado sem erro.
4. `/treinos` → iniciar treino → `/sessao` (sessão ativa criada e persistida corretamente).
5. `/configuracoes` → nova seção "🏋️ Apagar histórico de treinos" renderizada corretamente, junto das seções de reset já existentes.

Console sem erros em nenhuma dessas navegações.

## Achados não corrigidos nesta sprint (severidade Baixa, sem overflow confirmado)

- `DashboardHero`: `grid-cols-5` para os 5 atributos, sem breakpoint responsivo — visualmente pode ficar apertado em 320-360px, mas não há evidência de overflow real (não verificável sem screenshot neste ambiente).
- `ProgramAdherenceSummary`/`programas/[id]`: `grid-cols-3` para stats, mesma observação.

## Não aplicável / já correto (confirmado por auditoria de código, não alterado)

- Nenhuma tabela (`<table>`) no app — dados densos já usam cards/listas.
- Gráficos já usam `ResponsiveContainer` (Recharts) — sem largura fixa em pixels.
- Truncamento de texto (`truncate`/`line-clamp`) já aplicado só a nomes/labels, nunca a números/datas.
- Modais já usam `width: 100%` + `max-width`, ou variante `sheet` (bottom-sheet) — escalam corretamente em 320-375px sem overflow.
