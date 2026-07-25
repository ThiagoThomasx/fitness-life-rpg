# Accessibility Audit — Sprint 23

Auditoria estática (leitura de código + inspeção de árvore de acessibilidade via Browser pane). Sem leitor de tela real disponível neste ambiente — ver limitação na seção final.

## 1. Modais / Dialogs / Drawers

| Componente | Situação antes | Ação |
|---|---|---|
| `ModalShell.tsx` (base compartilhada — sessão, substituições, Planner, programas, recomendações, reset, backup, histórico, filtros) | Foco inicial ✅, Escape ✅, devolução de foco ✅, `aria-labelledby` ✅. Sem focus trap (Tab escapava para o conteúdo de fundo). Sem `aria-describedby`. | **Focus trap adicionado** (Tab/Shift+Tab ciclam dentro do painel). `aria-describedby` não wired — exigiria auditar o conteúdo de cada consumidor individualmente, maior que uma tarefa de 1-4h. |
| `OnboardingModal.tsx` | Dialog customizado, não usava `ModalShell`: sem foco inicial, sem Escape, sem devolução de foco. | **Reconstruído sobre `ModalShell`** (`dismissible={false}` — é um fluxo obrigatório de primeiro acesso, não deve fechar com Escape/clique fora). `aria-labelledby` aponta para o `<h2>` de cada etapa (mesmo id, uma única etapa renderizada por vez). |
| Drawer mobile (`AppSidebar.tsx`) | Escape + foco in/out já implementados. Sem focus trap. | Não alterado nesta sprint (fora do escopo do `ModalShell`; focus trap dedicado ficaria para uma tarefa própria). |

## 2. Botões só-ícone

`.icon-btn` amostrado em `ExerciseLibrary`, `WorkoutBuilderModal`, `TemplateExerciseRow`, `ExerciseExecutionActions`, `SessionExerciseCard`, `AppSidebar` — todos com `aria-label`. Sem achados aqui além do alvo de toque (ver `MOBILE-QA.md`).

## 3. Formulários

| Componente | Situação antes | Ação |
|---|---|---|
| `GoalForm.tsx` | `<label>` visual sem `htmlFor`/`id` em título, tipo de meta, meta/reps, sessões/semana, duração, volume semanal, ciclo, datas, observações. | Todos os pares label/input/select/textarea ganharam `htmlFor`/`id` (`goal-title`, `goal-target-value`, `goal-target-reps`, `goal-sessions-per-week`, `goal-target-weeks`, `goal-weekly-volume`, `goal-cycle`, `goal-start-date`, `goal-target-date`, `goal-notes`). |
| `BodyProgressForm.tsx` | Mesmo padrão: data, peso, medidas dinâmicas, ciclo, observações sem `htmlFor`. | Idem (`body-progress-date`, `body-progress-weight`, `body-progress-measurement-${field}`, `body-progress-cycle`, `body-progress-notes`). |
| `ReadinessCheckIn.tsx`, `WorkoutFilters.tsx`, `CreateExerciseModal.tsx`, `ProgramEditorWizard.tsx` | Já usavam `htmlFor`/`id` ou `role="group"`/`aria-label` corretamente. | Sem alteração. |

## 4. Headings

Cada rota do dashboard renderiza exatamente um `<h1>` (via componente de cabeçalho próprio). Nenhum achado.

## 5. Status/cor

`ReadinessCard`, `RecoveryBadge` e badges de status já pareiam cor com texto/ícone. Nenhum achado de "cor como única informação".

## 6. Gráficos

| Situação antes | Ação |
|---|---|
| `ChartHeader`/`EmptyChart` já dão título + descrição + empty state consistentes a todo gráfico. Só 1 dos 5 gráficos de `ExerciseChartsSection` tinha resumo textual dos dados (o resto só expunha valores via tooltip de mouse/toque). | Resumo textual adicionado aos outros 4 gráficos (`1RM estimado`, `Volume por execução`, `Repetições`, `Frequência`), mesmo padrão do gráfico que já tinha ("Carga por execução"). |
| Nenhum `<svg>` de gráfico tem `role="img"`/`aria-label` sumarizando os dados para leitor de tela. | Não corrigido — o resumo textual abaixo do gráfico cobre a mesma necessidade de forma mais simples (texto real na árvore de acessibilidade, não uma descrição de SVG), mas o SVG em si continua sem rótulo próprio. |

## 7. Teclado

Interatividade quase inteiramente via `<button>`/`<a>` nativos. `onKeyDown` usado para Enter/Escape em campos de confirmação de reset. Nenhum componente customizado não-nativo encontrado sem suporte a teclado.

## 8. Navegação / alvos de toque

`aria-current="page"` já usado na sidebar (não depende só de cor). Alvos de toque — ver `MOBILE-QA.md`.

## Limitações desta auditoria

- Sem leitor de tela real neste ambiente (Windows, sessão headless) — inspeção feita via árvore de acessibilidade do Browser pane (`read_page`), não um NVDA/VoiceOver real.
- Teste de navegação por teclado real (Tab físico) não executado interativamente nesta sprint — cliques programáticos via `.click()` não disparam corretamente os handlers React neste ambiente de preview (confirmado com um componente pré-existente, não é uma regressão introduzida). O focus trap foi verificado por leitura de código, não por interação real.
