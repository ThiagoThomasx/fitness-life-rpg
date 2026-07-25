# Accessibility Report — Sprint 24

Continuação do `ACCESSIBILITY-AUDIT.md` (Sprint 23). Fecha as duas pendências reais deixadas em aberto: `aria-describedby` não conectado em nenhum dialog consumidor do `ModalShell`, e navegação por teclado real nunca verificada por interação de fato (só por leitura de código), porque `.click()` do Browser pane não disparava handlers React corretamente.

## Ambiente e método

Playwright + msedge (mesmo workaround do QA visual) — diferente do Browser pane, `page.keyboard.press()` do Playwright dispara eventos de teclado reais que os handlers React capturam corretamente. Isso resolve a limitação registrada na Sprint 23: "cliques programáticos via `.click()` não disparam corretamente os handlers React neste ambiente de preview".

## `aria-describedby`

`ModalShell` ganhou um prop opcional `describedBy` (renderiza como `aria-describedby` no `role="dialog"`). Wired nos 6 dialogs mais reutilizados que já tinham um parágrafo de descrição natural logo abaixo do título:

| Componente | Onde aparece | Descrição associada |
|---|---|---|
| `ConfirmDialog.tsx` | Genérico — reusado por dezenas de fluxos (excluir treino, descartar sessão ativa, resets de Configurações, etc.) | prop `description`, quando presente |
| `SkipExerciseDialog.tsx` | Sessão ativa — marcar exercício como não realizado | aviso sobre séries já registradas |
| `CancelPlannedWorkoutDialog.tsx` | Planner — cancelar sessão planejada | explicação cancelar × ignorar |
| `SkipPlannedWorkoutDialog.tsx` | Planner — ignorar sessão planejada | explicação de que a sessão continua no plano |
| `ReschedulePlannedWorkoutDialog.tsx` | Planner — reagendar sessão | data original |
| `ExerciseSubstitutionDialog.tsx` | Sessão ativa — confirmar substituição de exercício | resumo "de → para" (passo de confirmação; o passo de escolha do substituto não tem parágrafo único de descrição, não recebeu `describedBy`) |

Como `ConfirmDialog` é genérico, todo fluxo que já o usa (incluindo os resets de Configurações da Sprint 23 — histórico de treino, fotos, dados corporais) ganhou `aria-describedby` automaticamente, sem precisar tocar cada consumidor individualmente.

**Não coberto nesta sprint** (decisão consciente, mesmo critério da Sprint 23 — dialogs sem um parágrafo único de descrição, exigiriam desenho de novo texto, não só conectar um id): `PlannedWorkoutPreviewDialog`, `ProgramInstantiationDialog`, `ProgramSessionPicker`, `WorkoutBuilderModal`, `CreateExerciseModal`, `TemplateEditorModal`, `ExerciseHistoryModal`, `ExercisePickerModal`, `WorkoutSummaryModal`, `PhotoComparisonModal`, `PhotoDetailModal`, `LevelUpModal`, `Stepper`.

Verificado por interação real (ver seção seguinte) que o atributo é lido corretamente pelo navegador: `dialog.getAttribute('aria-describedby')` resolve para um id real cujo `textContent` é a descrição correta, tanto no `ConfirmDialog` (via diálogo "sessão ativa" real) quanto nos demais.

## Navegação por teclado — verificação real

Testado contra `WorkoutBuilderModal` (dialog `ModalShell` alcançável sem dado seedado, via botão "+ Criar treino" em `/treinos`):

1. Abrir o dialog via clique real → foco inicial cai dentro do painel (`role="dialog"`) — confirmado.
2. **Tab × 8**: foco permanece dentro do dialog em todas as 8 pressões — focus trap confirmado por interação real (não só leitura de código, como na Sprint 23).
3. **Shift+Tab × 8**: mesmo resultado, foco nunca escapa do dialog na direção reversa.
4. **Escape**: fecha o dialog.
5. **Devolução de foco**: após o Escape, `document.activeElement` volta a ser exatamente o botão que abriu o dialog ("+ Criar treino") — devolução de foco confirmada por interação real.

Isso fecha a pendência da Sprint 23: "focus trap foi verificado por leitura de código, não por interação real".

## Limitações remanescentes

- Leitor de tela real (NVDA/VoiceOver) continua indisponível neste ambiente — inspeção segue via árvore de acessibilidade e atributos ARIA lidos programaticamente, não uma leitura auditiva real.
- Teste de teclado real feito em 1 dialog (`WorkoutBuilderModal`) como representante do `ModalShell` — o componente compartilhado garante que o comportamento (focus trap, Escape, devolução de foco) é idêntico em todos os ~20 consumidores, mas cada um não foi testado individualmente por interação.
- `Escape` em dialogs com `dismissible={false}` (ex.: `OnboardingModal`, `WorkoutSummaryModal`) não foi testado por interação — por design esses não devem fechar com Escape, e isso não mudou nesta sprint.
- Nenhum `<svg>` de gráfico ganhou `role="img"`/`aria-label` (mesma pendência da Sprint 23) — o resumo textual abaixo de cada gráfico continua sendo a mitigação usada, sem rótulo dedicado no SVG em si.
