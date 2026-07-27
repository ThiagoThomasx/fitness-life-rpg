# QA Checklist — Release Candidate v2 (Sprint 31)

Checklist de release, complementar ao [`QA_CHECKLIST.md`](QA_CHECKLIST.md)
(critério de aceite visual por tarefa/sprint do redesign). Este documento
cobre a validação cross-domínio de release, não visual isolada.

## Gates automatizados

- [x] `npm run lint` — sem warnings/erros
- [x] `npx tsc --noEmit` — sem erros
- [x] `npm run test` — 1616/1616 (128 arquivos)
- [x] `npm run build` — sem erros, First Load JS de `/dashboard` reduzido
      299 kB → 189 kB nesta sprint

## Dados locais

- [x] Backup: export cobre as 37 chaves de `STORAGE_KEYS`
- [x] Restore: valida payload, rejeita formato inválido sem escrever nada
      (fail-closed), tolera preset de import de saúde individualmente
      inválido sem bloquear o resto
- [x] Reset completo: testado manualmente (seed → reset → confirmação via
      leitura direta do `localStorage`, chaves voltam a `null`)
- [x] Reset granular: cobre os domínios com função dedicada (ver
      `STORAGE-AUDIT.md` para a lista completa e os domínios sem reset
      granular, cobertos só pelo reset total)
- [ ] Round-trip de backup **via arquivo real** (exportar → selecionar no
      input de arquivo → importar): coberto por `backup.test.ts`
      (export→import→atomicidade→rollback) e por auditoria de código do
      fluxo real; **não exercitado manualmente com upload de arquivo real**
      nesta sessão (limitação de ferramenta de browser disponível)
- [x] Import de dados de saúde: JSON, CSV, CSV mapeado, presets — cobertos
      por testes automatizados extensos (Sprints 28-30)

## Import/Export

- [x] CSV: injeção de fórmula neutralizada (`sanitizeCsvTextField`),
      RFC-4180 quoting correto
- [x] JSON: `JSON.parse` sempre em `try/catch`, nunca lança exceção não
      tratada nos caminhos de import
- [x] Blob URLs: toda `createObjectURL` tem `revokeObjectURL` correspondente
- [x] Limite de tamanho de arquivo: Health Data (já existia) e Backup
      (adicionado nesta sprint) — ambos 5MB

## Navegação e rotas

- [x] 21 rotas mapeadas, nenhum link quebrado em `AppSidebar`
- [x] `loading.tsx` + `error.tsx` adicionados ao grupo `(dashboard)` (não
      existia nenhum boundary de rota antes desta sprint)
- [x] `/style-guide` confirmada como órfã intencional (referência de dev, não
      bug)

## Acessibilidade

- [x] Nenhum elemento interativo sem suporte a teclado em todo o app
- [x] Foco de modal gerenciado centralmente via `ModalShell`
- [x] `EnergyStars`/`MoodPicker` (Diário) com `aria-label`/`aria-pressed`
      (corrigido nesta sprint — antes inutilizáveis por leitor de tela)
- [x] Labels associados via `htmlFor`/`id` em `EntryForm`/`NumberInput`
      (corrigido nesta sprint)
- [x] `--color-text-muted` com contraste AA (corrigido nesta sprint,
      3.8:1 → ~4.6:1+)
- [ ] Live regions de sucesso/erro montadas condicionalmente — pendência
      documentada, não corrigida nesta sprint
- [ ] Confirmação individual de focus-trap nos 8 `alertdialog` de reset em
      Configurações — não verificado arquivo a arquivo nesta sessão

## Responsivo

- [x] `/dashboard` em 375×812 — sem overflow horizontal
      (`scrollWidth === innerWidth`, verificado via script no navegador)
- [ ] Matriz completa 320/375/390/430/768/1024/1440 em todas as áreas
      listadas no plano da sprint — não exercitada exaustivamente nesta
      sessão (ver `MOBILE-QA.md` de sprints anteriores para cobertura
      histórica por rota; nenhuma mudança visual desta sprint altera layout
      além do que foi verificado em 375px)

## Console / erros

- [x] Nenhum erro de console novo introduzido pelas mudanças desta sprint
      (verificado em `/dashboard` após dynamic import, e em `/diario` após
      mudanças de acessibilidade)
- [x] Warning de hydration pré-existente em `DashboardHero`/entorno
      observado e documentado como pendência — não introduzido por esta
      sprint (não investigado a fundo, fora do escopo de bugfix imediato)

## Performance

- [x] Bundle: maior chunk (`recharts`) já deduplicado; corrigido o timing de
      carregamento no dashboard (`next/dynamic`)
- [x] Memoização: revisão completa dos 17 usos de `useMemo`/`useCallback`,
      nenhum problema objetivo encontrado

## Documentação

- [x] `SPRINT-31.md`, `RELEASE-CANDIDATE-V2.md`, `ARCHITECTURE-AUDIT.md`,
      `PERFORMANCE-AUDIT.md`, `ACCESSIBILITY-AUDIT-V2.md`,
      `STORAGE-AUDIT.md` criados
- [x] `README.md`, `CHANGELOG.md`, `ROADMAP_SPRINTS.md`, `ARCHITECTURE.md`
      atualizados
