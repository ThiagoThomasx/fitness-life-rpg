# Accessibility Audit v2 — Sprint 31

Segunda rodada de auditoria de acessibilidade (WCAG 2.2), cobrindo o app
inteiro (`src/app`, `src/components`). Complementa
[`ACCESSIBILITY-AUDIT.md`](ACCESSIBILITY-AUDIT.md) (Sprint anterior, escopo
mais restrito). Nenhum arquivo modificado durante a fase de leitura — só
depois, nas correções listadas na seção final.

## 1. Estrutura de heading — limpo

Cada rota renderiza exatamente um `h1`. `h2`/`h3` aninham logicamente.
Títulos de modal usam `h3` diretamente (pulando `h2`) — aceitável, pois
diálogos (`role="dialog"`) são uma subárvore de documento separada da outline
da página host.

## 2. Landmarks — limpo

Um único `<main>` no `layout.tsx` do dashboard. `<aside>` para sidebar
desktop e drawer mobile, `<nav aria-label="Navegação principal">` único.
Nota: o drawer mobile fechado usa `aria-hidden` mas não `inert`/`tabindex="-1"`
nos links internos — recomenda-se confirmação manual com teclado de que os
links do drawer fechado não são alcançáveis via Tab (não verificado
diretamente nesta sessão, `aria-hidden` sozinho não garante isso).

## 3. `aria-live` — forte, um gap real

Toasts, erros de formulário e status de import/export usam
`role="status"`/`role="alert"` com `aria-live` de forma consistente. **Gap**:
vários desses containers (`treinos/page.tsx`, `GoalForm.tsx`,
`BodyProgressForm.tsx`, `BodyProgressPhotoSection.tsx`) só existem no DOM
depois que a condição vira verdadeira — para uma live region ser confiável em
todo leitor de tela, o container deveria existir sempre no DOM com conteúdo
alternando, não ser montado/desmontado. Não corrigido nesta sprint (mudança
de padrão espalhada por vários componentes, risco de regressão maior que o
ganho imediato) — registrado como pendência.

`RewardToast` também não pausa o timer de auto-dismiss (3.5s) em hover/focus
— WCAG 2.2.1 (Timing Adjustable). Não corrigido nesta sprint.

## 4. Labels em widgets custom — corrigido nesta sprint

- `EnergyStars.tsx` (Diário): 5 botões com emoji "⭐" sem `aria-label`/
  `aria-pressed` — todos anunciados de forma idêntica, seleção comunicada só
  por `opacity` (invisível para leitor de tela). **Corrigido**: `role="group"
  aria-label="Nível de energia"`, `aria-label="Energia nível N de 5"` por
  botão, `aria-pressed` no estado ativo.
- `MoodPicker.tsx` (Diário): mesmo padrão, usava `title` (não confiavelmente
  exposto a AT) em vez de `aria-label`. **Corrigido**: `role="group"
  aria-label="Humor"`, `aria-label={m.label}`, `aria-pressed`.
- `EntryForm.tsx`: labels de "Horas de sono" e "Notas (opcional)" eram
  `<label>` soltos, sem `htmlFor`/`id` ligando ao `<input type="range">`/
  `<textarea>`. **Corrigido**: `useId()` + `htmlFor`/`id`.
- `NumberInput.tsx` (Nutrição, reusado em todo `/nutricao`): mesmo padrão de
  label solto. **Corrigido**: `useId()` + `htmlFor`/`id`.

Verificado em QA manual (árvore de acessibilidade real, `/diario`): grupos
agora anunciam "Nível de energia" / "Humor", botões anunciam "Energia nível 3
de 5", campo de sono anuncia "Horas de sono:" como nome acessível do slider.

## 5. Foco em modais/drawers — limpo

`ModalShell.tsx` (base de praticamente todo modal do app) já move foco ao
abrir, restaura ao fechar, implementa trap de Tab e fecha com Escape quando
`dismissible`. Drawer mobile do `AppSidebar` replica a mesma disciplina
manualmente.

**Não verificado individualmente nesta sprint**: os 8 componentes de reset em
Configurações usam `role="alertdialog"` — evidência forte (via
`ConfirmDialog`) de que passam por um wrapper com foco gerenciado, mas não
confirmado arquivo a arquivo. Recomendado como checagem rápida antes do
release.

## 6. Navegação por teclado — limpo

Nenhum `<div>`/`<span>` com `onClick` e sem suporte a teclado em todo
`src/components`/`src/app`. Único `onClick` fora de um elemento nativamente
focável é o backdrop de `ModalShell` (click-outside-to-dismiss), que tem
Escape e botão de fechar como alternativas por teclado — padrão aceitável.

## 7. Contraste de cor — corrigido nesta sprint

`--color-text-muted: #7a7a7a` (`tokens.css`) tinha contraste ~3.8:1 contra
`--color-surface` (#1c1c1c) e ~4.3:1 contra `--color-canvas` (#121212) —
abaixo do mínimo AA de 4.5:1 para texto normal. Usado em 294 ocorrências / 108
arquivos, quase sempre em `text-xs`/`text-sm` (nunca no tamanho "grande" que
permitiria a exceção de 3:1). **Corrigido**: token clareado para `#949494`
(~4.6:1+ contra ambas as superfícies).

`--color-text-disabled` (baixo contraste) é aceitável — WCAG 1.4.3 isenta
componentes de UI inativos. `--color-danger` como texto (~4.9:1) passa, mas
com margem apertada — vale monitorar se a superfície escurecer em um redesign
futuro.

## 8. Comunicação de estado — majoritariamente limpo

`disabled` nativo usado corretamente (exposto a AT sem precisar de
`aria-disabled`). Nenhum uso de `aria-busy` encontrado no projeto — estados de
loading dependem de texto ("Salvando…") e toasts, não de `aria-busy` no
container pendente. Gap menor, não corrigido nesta sprint. O estado
selecionado de `EnergyStars`/`MoodPicker` (corrigido na seção 4) era também um
gap de comunicação de estado (`aria-pressed` ausente).

## Corrigido nesta sprint (resumo)

1. `EnergyStars.tsx` — `aria-label`/`aria-pressed`/`role="group"`
2. `MoodPicker.tsx` — `aria-label`/`aria-pressed`/`role="group"` (troca de `title`)
3. `EntryForm.tsx` — labels associados via `useId()`
4. `NumberInput.tsx` — label associado via `useId()`
5. `tokens.css` — `--color-text-muted` com contraste AA

## Pendências (não corrigidas nesta sprint)

- Live regions de sucesso/erro montadas condicionalmente (múltiplos
  componentes) — mudança de padrão espalhada, fora do escopo desta sprint.
- `RewardToast` sem pausa de timer em hover/focus.
- Confirmação individual de focus-trap nos 8 `alertdialog` de reset.
- `aria-hidden` no drawer mobile sem `inert`/`tabindex="-1"` complementar —
  verificação manual de teclado recomendada.
- Sem `aria-busy` em containers de loading.
