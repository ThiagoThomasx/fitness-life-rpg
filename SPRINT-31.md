# Sprint 31 — Release Candidate v2: Cross-Domain QA, Hardening & Release Readiness

## 1. Objetivo

Sprint de consolidação, não de features. Pergunta a responder: *"Se este projeto
fosse entregue hoje para centenas de usuários, existe algum problema estrutural
conhecido que impediria essa entrega?"* Resposta ao final deste documento
(seção 9).

## 2. Estado inicial

```text
git status                → working tree limpo
git branch --show-current → master
git log --oneline -5      → 9c0cd4d no topo (Sprint 30 Parte 4)
git remote -v             → origin/ThiagoThomasx/fitness-life-rpg, up to date
```

Baseline reproduzido antes de qualquer alteração:

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1616/1616 (128 arquivos)
Build:     ✅
```

## 3. Metodologia

Como o escopo cobre o projeto inteiro (não só Health Data, como nas sprints
anteriores), a auditoria foi paralelizada em 6 frentes independentes, cada uma
lendo o código real e citando `arquivo:linha` para cada achado — nenhuma
lista de "possíveis problemas" sem verificação:

1. Arquitetura, dead code e rotas
2. Dados, storage, backup/restore/reset
3. Segurança
4. Acessibilidade (WCAG 2.2)
5. Performance e bundle
6. Cobertura de testes

Depois da síntese, apenas correções de baixo risco e sem alteração de lógica
de negócio foram aplicadas (regra 2 do `CLAUDE.md`). Achados estruturais mais
profundos (duplicação de helpers matemáticos entre engines, funções/arquivos
grandes, ausência de `version`/`migrate` no `persist` do Zustand) foram
documentados como risco residual, não corrigidos às pressas nesta sprint —
mexer neles sem plano dedicado violaria a mesma regra que motivou este
documento existir.

## 4. Achados por domínio

### 4.1 Arquitetura, dead code e rotas

- **Sem dead code confirmado.** Candidatos verificados por grep (`campaigns.ts`,
  `greeting.ts`, `weekly-progress.ts`) — todos importados e em uso.
- **Sem TODO/FIXME/HACK reais** — únicos hits eram a palavra portuguesa
  "todo/todos" ("all") em comentários de prosa.
- **Sem ciclos de dependência** — `lib` nunca importa de `components`; stores
  não se importam entre si; `adaptive-planning` → `coach/types` é
  unidirecional (só tipos).
- **21 rotas, nenhuma com `loading.tsx`/`error.tsx`** — corrigido nesta sprint
  com boundaries globais no grupo `(dashboard)` (seção 5).
- **Rota órfã**: `/style-guide` existe e builda, mas não tem nenhum link
  interno — página de referência interna, mantida como está (decisão:
  documentar, não remover nem linkar da navegação principal, que está travada
  desde o Sprint 1).
- **Um import de tipo invertido**: `src/lib/workout.ts:2` importa
  `XpGainResult` de `@/stores/useCharacterStore` (lib depende de store). Não é
  um ciclo em runtime, só uma inversão de camada — não corrigido nesta sprint
  (mudança estrutural sem ganho objetivo imediato, YAGNI).
- **Helpers duplicados**: `round()`/`average()`/`clamp()` reimplementados
  localmente em ~10 arquivos de `lib/analytics`, `lib/health-data` e
  engines de readiness/wellness. Real violação de DRY, mas consolidar exigiria
  tocar lógica de cálculo em múltiplos domínios simultaneamente — fora do
  escopo de bugfix desta sprint, registrado como débito técnico.
- **Arquivos e funções grandes**: `sessao/page.tsx` (691 linhas, função
  `getReadinessHint` com 220 linhas) e `plano/page.tsx` (700 linhas) são os
  maiores pontos de concentração de complexidade do app. Não refatorados
  nesta sprint (regra: não refatorar por estética, só por ganho objetivo
  comprovado).

Detalhe completo em [`ARCHITECTURE-AUDIT.md`](ARCHITECTURE-AUDIT.md).

### 4.2 Dados, storage, backup/restore/reset

- **37 chaves de `localStorage`** mapeadas em `STORAGE_KEYS` (`backup.ts`),
  todas com backup e restore cobertos — nenhuma chave órfã fora do array.
- **Reset completo (`resetAllData`) cobre 100%** das chaves + fotos
  (IndexedDB). Muitos domínios só têm reset via wipe total (sem reset
  granular dedicado) — não é perda de dado, é uma lacuna de granularidade de
  UX, documentada como risco residual.
- **Risco real, documentado e não corrigido nesta sprint**: restaurar um
  backup mais antigo/parcial não limpa chaves ausentes do payload — elas
  ficam como estavam no dispositivo. Mudar esse comportamento (limpar vs.
  preservar) é uma decisão de produto, não um bug óbvio — registrado em
  `STORAGE-AUDIT.md` para decisão explícita futura.
- **Sem `version`/`migrate` no `persist()` do Zustand** (`useCharacterStore`,
  `useSessionStore`) — schema drift não seria pego automaticamente pelo
  Zustand hoje. `backup.ts` tem seu próprio `BACKUP_VERSION` e trata isso à
  parte. Não corrigido nesta sprint (mudança estrutural em como os stores
  persistem, fora do escopo de bugfix).
- **CSV injection, JSON.parse, Blob URLs**: todos limpos e testados
  (`csv-safety.test.ts`, `backup.test.ts`).
- **Corrigido nesta sprint**: import de backup (`configuracoes/page.tsx`) não
  tinha limite de tamanho de arquivo, diferente do import de Health Data.
  Adicionado o mesmo guard (`MAX_HEALTH_IMPORT_FILE_BYTES`, 5MB).

Detalhe completo em [`STORAGE-AUDIT.md`](STORAGE-AUDIT.md).

### 4.3 Segurança

Nenhum achado CRITICAL ou HIGH. CSV injection, XSS (`dangerouslySetInnerHTML`/
`innerHTML` — zero ocorrências), `JSON.parse` sem `try/catch`, vazamento de
Blob URL, segredos hardcoded e reativação indevida do Supabase — todos
verificados e limpos. Um achado LOW (cap de tamanho no import de backup),
corrigido nesta sprint (ver 4.2).

### 4.4 Acessibilidade

- **Corrigido nesta sprint**: `EnergyStars`/`MoodPicker` (Diário) eram
  botões emoji sem `aria-label`/`aria-pressed` — inutilizáveis por leitor de
  tela (todos anunciados de forma idêntica, sem indicar seleção). Agora têm
  `role="group"`, `aria-label` por opção e `aria-pressed` no estado ativo.
- **Corrigido nesta sprint**: `--color-text-muted` (`tokens.css`) tinha
  contraste ~3.8:1 contra `--color-surface` (abaixo do mínimo AA de 4.5:1),
  usado em 294 ocorrências / 108 arquivos. Clareado para `#949494` (~4.6:1+).
- **Corrigido nesta sprint**: labels de `EntryForm` (sono, notas) e
  `NumberInput` (Nutrição) não estavam associados via `htmlFor`/`id` aos
  campos — agora usam `useId()`.
- **Não corrigido nesta sprint** (documentado como risco residual): toasts de
  sucesso/erro montados condicionalmente (não persistentemente no DOM) podem
  não ser anunciados de forma confiável em todo leitor de tela na primeira
  renderização; verificação manual pendente de que os 8 `role="alertdialog"`
  de reset em Configurações realmente fazem focus trap (evidência indireta
  forte de que sim, via `ConfirmDialog`, mas não confirmado arquivo a
  arquivo).
- **Pontos fortes confirmados**: nenhum `<div onClick>` sem suporte a
  teclado em todo o app; `ModalShell` centraliza foco/trap/Escape/restore de
  forma consistente para todos os modais.

Detalhe completo em [`ACCESSIBILITY-AUDIT-V2.md`](ACCESSIBILITY-AUDIT-V2.md).

### 4.5 Performance e bundle

- **Corrigido nesta sprint**: `PerformancePanel`/`MuscleBalancePanel` (únicos
  consumidores de `recharts`, ~85-90kB gzip) eram importados estaticamente em
  `AnalyticsSection.tsx` e carregados no `/dashboard` mesmo quando a aba
  padrão ("Destaques") não usa gráfico nenhum. Convertidos para
  `next/dynamic` com `ssr: false`. First Load JS de `/dashboard` caiu de
  **299 kB → 189 kB**.
- **Memoização**: revisão dos 17 usos de `useMemo`/`useCallback` no projeto —
  nenhum caso de memoização inútil nem de computação cara sem memo
  encontrado.
- **Sem outras oportunidades de lazy loading com ganho objetivo** — páginas
  dedicadas de analytics/saúde/exercícios já isolam o custo de chart na
  própria rota, sem inflar rotas vizinhas.

Detalhe completo em [`PERFORMANCE-AUDIT.md`](PERFORMANCE-AUDIT.md).

### 4.6 Cobertura de testes

- **Corrigido nesta sprint**: dois testes usavam `setTimeout` real para
  evitar colisão de ID baseada em `Date.now()`
  (`body-progress-photo-link.test.ts`, `training-cycle-reviews.test.ts`) —
  convertidos para `vi.spyOn(Date, 'now')` / `vi.useFakeTimers()`,
  eliminando dependência de tempo real.
- **Gaps reais identificados, não preenchidos nesta sprint** (fora do escopo
  de bugfix — adicionar testes novos é trabalho de feature/dívida técnica
  dedicado, não um "bug"): `attributes.ts`, `progression.ts`,
  `health-data/stats.ts`, `recommendations.ts`/`recommendation-assembly.ts`,
  `weekly-plan.ts`/`weekly-progress.ts`, `auto-tags.ts` são engines
  determinísticos sem nenhum teste direto. Recomendado como primeira tarefa
  de uma futura sprint de dívida técnica.
- Nenhum `.skip`/`.only`/`.todo` no código. Isolamento de teste (limpeza de
  `localStorage` em `beforeEach`) consistente.

Detalhe completo em [`ARCHITECTURE-AUDIT.md`](ARCHITECTURE-AUDIT.md) (mapa de
domínio → teste) e no relatório de testes desta sprint (achados acima).

## 5. Correções implementadas

| # | Domínio | Mudança | Arquivo(s) |
|---|---|---|---|
| 1 | Performance | `next/dynamic` para `PerformancePanel`/`MuscleBalancePanel` | `src/components/dashboard/analytics/AnalyticsSection.tsx` |
| 2 | Acessibilidade | `aria-label`/`aria-pressed`/`role="group"` em `EnergyStars` | `src/components/diary/EnergyStars.tsx` |
| 3 | Acessibilidade | `aria-label`/`aria-pressed`/`role="group"` em `MoodPicker` (troca de `title`) | `src/components/diary/MoodPicker.tsx` |
| 4 | Acessibilidade | Labels associados via `useId()`/`htmlFor` (sono, notas) | `src/components/diary/EntryForm.tsx` |
| 5 | Acessibilidade | Label associado via `useId()`/`htmlFor` | `src/components/nutrition/NumberInput.tsx` |
| 6 | Acessibilidade | Contraste de `--color-text-muted` (3.8:1 → ~4.6:1) | `src/styles/tokens.css` |
| 7 | Robustez/UX | `loading.tsx` + `error.tsx` para o grupo `(dashboard)` (nenhuma rota tinha boundary) | `src/app/(dashboard)/loading.tsx`, `src/app/(dashboard)/error.tsx` |
| 8 | Segurança/Dados | Cap de tamanho no import de backup (mesmo padrão do Health Data) | `src/app/(dashboard)/configuracoes/page.tsx` |
| 9 | Testes | 2 testes com `setTimeout` real → determinísticos (`vi.spyOn`/fake timers) | `src/lib/body-progress-photo-link.test.ts`, `src/lib/training-cycle-reviews.test.ts` |

Nenhuma lógica de negócio (cálculo de XP, PR, badge, coach, backup) foi
alterada — apenas markup/acessibilidade, code-splitting, boundaries de
rota e um guard defensivo de tamanho de arquivo.

## 6. QA manual real (navegador)

- Dashboard: onboarding dismissível, clique na aba "Performance" do Analytics
  confirma que o `next/dynamic` carrega sem erro e sem quebrar o restante da
  página.
- Diário: árvore de acessibilidade confirmada com leitura real do DOM —
  grupos nomeados ("Nível de energia", "Humor"), botões com rótulo
  individual ("Energia nível 3 de 5"), campos de sono/notas corretamente
  associados ao label.
- Configurações → Dados & Backup: seed manual de duas chaves de teste
  (`daily-logs`, `badges`) via `localStorage`, confirmado refletido no painel
  "Armazenamento local" (contagem de chaves ativas subiu de 3 para 5, exatamente
  o esperado); fluxo de reset completo ("Iniciar reset" → digitar "resetar" →
  "Apagar tudo") testado end-to-end, confirmado por leitura direta do
  `localStorage` pós-reset (ambas as chaves voltaram a `null`).
- Responsivo: `/dashboard` em 375×812 sem overflow horizontal
  (`document.documentElement.scrollWidth === window.innerWidth`).
- **Limitação honesta desta sprint**: o round-trip de backup **via arquivo
  real** (exportar `.json`, selecionar no input de arquivo, importar) não foi
  exercitado manualmente neste ambiente — a ferramenta de browser disponível
  não permite upload de arquivo neste fluxo. A cobertura de confiança para
  esse caminho específico vem de (a) `backup.test.ts`, que já cobre
  export→import→atomicidade→rollback→envelope legado, e (b) da auditoria de
  código do fluxo real por agente dedicado (seção 4.2). Recomenda-se QA
  manual com upload de arquivo real antes do lançamento público, se possível
  com uma ferramenta que suporte input de arquivo.

## 7. Gates finais

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1616/1616 (128 arquivos, incluindo os 2 testes estabilizados)
Build:     ✅ (First Load JS de /dashboard: 299 kB → 189 kB)
```

## 8. Pendências reais (não bloqueantes)

- Sem reset granular para diversos domínios (badges, diário, nutrição,
  missões, workout builder, preferências, ciclos/metas de treino) — cobertos
  apenas pelo reset total. Não é perda de dado; é lacuna de granularidade.
- Restore de backup antigo/parcial não limpa chaves ausentes do payload —
  decisão de produto pendente (preservar vs. limpar).
- Sem `version`/`migrate` formal no `persist()` do Zustand.
- Duplicação de helpers matemáticos (`round`/`average`/`clamp`) em ~10
  arquivos de engines — débito técnico de DRY, não um bug.
- `sessao/page.tsx` e `plano/page.tsx` concentram funções/arquivos grandes
  (candidatos a split numa sprint dedicada de refactor, não estética).
- Engines determinísticos sem teste direto: `attributes.ts`, `progression.ts`,
  `health-data/stats.ts`, `recommendations.ts`, `recommendation-assembly.ts`,
  `weekly-plan.ts`, `weekly-progress.ts`, `auto-tags.ts`.
- Round-trip de backup via arquivo real não testado manualmente nesta sessão
  (ver seção 6).
- `/style-guide` é uma rota órfã (sem link interno) — mantida como referência
  de dev, decisão consciente de não linkar (navegação travada desde Sprint 1).
- Hydration warning pré-existente em `DashboardHero.tsx`/entorno (`section`
  vs `div`) observado no console durante QA manual — não introduzido por
  esta sprint (o componente já tem tratamento explícito de hydration com
  `useMounted`, mas o warning aponta para uma área vizinha renderizada
  condicionalmente). Não investigado a fundo nesta sprint por estar fora do
  escopo de bugfix imediato; recomendado para uma sprint de hardening focada
  em React/hydration.

## 9. Avaliação final

**O projeto está pronto para uma Release Candidate v2**, com os riscos
residuais listados acima — nenhum deles é um bloqueador estrutural (dado
perdido, funcionalidade quebrada, vulnerabilidade real, gate vermelho). São
lacunas de granularidade de UX, débito técnico documentado e um ponto de QA
manual não coberto nesta sessão por limitação de ferramenta. Ver
[`RELEASE-CANDIDATE-V2.md`](RELEASE-CANDIDATE-V2.md) para o checklist
completo de release.
