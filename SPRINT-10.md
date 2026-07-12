# Sprint 10 — QA Sistêmico, Integridade de Dados e Hardening

## Objetivo

Auditar o Fitness Life RPG como sistema completo (stores, backup, XP/recompensas, navegação)
e corrigir falhas sistêmicas encontradas — sem expandir escopo funcional. A especificação
original desta sprint é muito maior que o executado aqui (suíte Playwright de 10 cenários,
teste de volume com dados sintéticos, matriz de responsividade completa, smoke test em
produção); esta execução entrega a fatia auditada e corrigida com evidência real nesta sessão
e documenta honestamente o que fica pendente (ver "Pendências").

**Este relatório cobre dois entregáveis distintos, nesta ordem:**
1. **Sprint 10** — correções originais (missões sem XP, import sem reload, import não atômico) + a descoberta crítica do bug de inicialização do personagem, inicialmente deixada como pendência.
2. **Hotfix 10.1** — correção do bug crítico, feita à parte a pedido explícito do usuário antes de considerar a Sprint 10 fechada, já que ele bloqueia o funcionamento central do produto (XP) em toda instalação nova.

## 1. Auditoria

### Stores Zustand

| Store | Persistida? | Chave | Hidratação |
|---|---|---|---|
| `useCharacterStore` | Sim | `lrpg-fit:character` | `skipHydration: true` + `StoreHydrationBoundary` (rehydrate manual no boot) |
| `useSessionStore` | Sim | `lrpg-fit:active-session` | padrão do `persist` (síncrona no client) |
| `useRewardStore` | Não (fila em memória) | — | — |
| `useBadgeStore` | Não (deriva de `getEarnedBadges()` sob demanda) | — | — |

### Chaves de `localStorage` (`STORAGE_KEYS` em `src/lib/backup.ts`)

`lrpg-fit:character`, `lrpg-fit:active-session`, `lrpg-fit:workout-history`, `lrpg-fit:badges`,
`lrpg-fit:daily-logs`, `lrpg-fit:reward-events`, `lrpg-fit:nutrition-goal`,
`lrpg-fit:nutrition-logs`, `lrpg-fit:missions-completed`, `lrpg-fit:custom-workouts`,
`lrpg-fit:custom-exercises`, `lrpg-fit:weekly-plan`, `lrpg-fit:campaigns`,
`lrpg-fit:preferences`, `lrpg-fit:avatar`, `lrpg-fit:char-name`, `rpg_last_seen_level` (17 no
total — todas já cobertas por `exportBackup`/`importBackup`/`resetAllData`).

### Rotas principais

`/dashboard`, `/treinos`, `/treinos/sessao` (na verdade `/sessao`), `/perfil`, `/insights`,
`/diario`, `/nutricao`, `/configuracoes`, `/plano`, `/preferencias`. Todas testadas manualmente
nesta sessão em estado vazio (ver seção 4) sem erro de console.

### Fluxos que concedem XP/recompensa

- Conclusão de treino (`sessao/page.tsx`, `handleConfirmResult`) — **já tinha** guards de
  idempotência (`finishedRef`, `confirmedRef`) contra duplo clique. Não alterado.
- Diário (`diario/page.tsx`) e Nutrição (`nutrition/TodayLogSection.tsx`) — já concediam XP
  corretamente, só na primeira entrada do dia.
- Missões do Dashboard (`dashboard/page.tsx`) — **não concedia XP nem toast** (bug corrigido,
  ver seção 2).
- Plano/Campanhas (`plano/page.tsx`) — já concede XP ao completar.

## 2. Bugs encontrados e corrigidos (Sprint 10 original)

### 🔴 Crítico — Personagem nunca é inicializado num install novo

**Sintoma:** num app recém-instalado, `character` fica `null` na store para sempre — nenhuma
ação (treino, diário, nutrição, missão) credita XP, porque toda `apply*` em
`useCharacterStore.ts` faz `if (!state.character) return state`.
**Causa raiz:** o único código que chama `setCharacter(...)` é o rename de personagem em
`perfil/page.tsx:62` — um efeito colateral de uma ação não relacionada a "criar personagem".
Nem o onboarding, nem o boot da store (`StoreHydrationBoundary`) inicializavam `character`.
**Decisão original (durante a Sprint 10):** apresentado ao usuário; decisão inicial foi
documentar como pendência crítica, sem corrigir, por estar fora do escopo combinado no plano
original desta execução.
**Atualização:** o usuário revisou essa decisão e pediu a correção **como um hotfix separado**
antes de considerar a Sprint 10 encerrada, já que o bug bloqueia o funcionamento central do
produto (XP) em qualquer instalação nova. Ver seção "Hotfix 10.1" abaixo para causa raiz
detalhada, decisão arquitetural, implementação, testes e QA.

### 🟠 Alto — Missões manuais do Dashboard não concediam XP nem recompensa

**Sintoma:** completar "20 Flexões", "5.000 Passos", "10min de Mobilidade", "30 Agachamentos"
ou "Hidratação" marcava a missão como concluída mas nunca creditava o `xpReward` exibido no
botão nem disparava o reward toast.
**Causa raiz:** `handleCompleteMission` em `src/app/(dashboard)/dashboard/page.tsx` chamava
apenas `completeMission(id)` — nunca `applyDiaryXp` nem `pushReward`.
**Correção:** [dashboard/page.tsx](src/app/(dashboard)/dashboard/page.tsx) agora credita
`applyDiaryXp(mission.xpReward)` e `pushReward(addRewardEvent(...))` ao concluir uma missão
manual, com guard síncrono via `getMissionCompletions()[id]` (fonte de verdade em
`localStorage`) para não creditar duas vezes em clique duplo.
**Teste:** `src/lib/daily-missions.test.ts` (`completeMission` idempotente) + validado
manualmente no browser (mission "10min de Mobilidade" → 1/7 completas, badge ✓, sem duplicar
ao tentar novamente pois o botão desaparece).

### 🟠 Alto — Importar backup não atualizava o app em execução

**Sintoma:** depois de importar um backup válido, Dashboard/Perfil continuavam mostrando o
estado anterior (personagem, XP, badges) até um refresh manual (F5) do usuário — diferente do
reset, que já recarregava a página.
**Causa raiz:** `useCharacterStore` usa `skipHydration: true` (só re-hidrata via
`StoreHydrationBoundary` no boot da aplicação); `handleImportConfirm` em
`configuracoes/page.tsx` escrevia no `localStorage` mas nunca disparava um reload/rehydrate.
**Correção:** [configuracoes/page.tsx](src/app/(dashboard)/configuracoes/page.tsx) agora
redireciona com `window.location.href = "/configuracoes?importado=true&chaves=N"` após um
import bem-sucedido — mesmo padrão já usado pelo reset — e mostra a mensagem de sucesso após o
reload.
**Teste:** coberto indiretamente pelos testes de round-trip de `backup.test.ts` (a lógica de
escrita); o comportamento de reload foi verificado por leitura de código e é consistente com o
fluxo de reset, já QA'd manualmente nesta sessão.

### 🟡 Médio — Import de backup não era atômico e não validava schema por chave

**Sintoma:** `importBackup` só validava o envelope (`version`/`exportedAt`/`data`), não a forma
de cada chave. Escrevia uma chave por vez em `localStorage.setItem` sem rollback — um backup
com `data` parcialmente corrompido (array virando string, XP negativo) era aceito e gravado,
podendo deixar o app com dados mistos se uma escrita falhasse no meio (ex.: quota excedida).
**Correção:** [backup.ts](src/lib/backup.ts) agora (a) valida cada chave contra um shape
mínimo esperado (arrays continuam arrays; objetos continuam objetos; `level`/`current_xp`/
`total_xp` dentro do envelope de personagem devem ser números finitos ≥ 0) **antes** de
escrever qualquer coisa; (b) tira um snapshot de todas as `STORAGE_KEYS` atuais; (c) só então
escreve; (d) se qualquer escrita falhar, restaura o snapshot inteiro e retorna erro — nenhuma
escrita parcial sobrevive.
**Teste:** `src/lib/backup.test.ts` cobre: JSON malformado, arquivo vazio, arquivo não-JSON,
envelope sem campos obrigatórios, versão futura, array trocado por string, XP negativo, schema
parcialmente válido (perfil bom + histórico corrompido) — todos rejeitados sem alterar dado
existente algum.

## Hotfix 10.1 — Inicialização segura do personagem

### Auditoria (antes de qualquer alteração)

- **Onde o personagem deveria ser criado:** não existia nenhum ponto de criação intencional.
  `OnboardingModal.handleFinish()` (`src/components/onboarding/OnboardingModal.tsx:46`) chama
  só `completeOnboarding(...)`, que grava `lrpg-fit:preferences` — nunca toca `character`. Tanto
  "Pular" quanto "Continuar até o fim" chamam a mesma função, então o onboarding sempre marca
  `onboardingCompleted: true`, mas isso nunca inicializou o personagem.
- **Como o onboarding funciona hoje:** modal de 4 passos (objetivo, equipamento, dias, estilo),
  mostrado uma vez pelo Dashboard (`dashboard/page.tsx`) quando `!getPreferences().onboardingCompleted`.
  Só grava preferências de treino, não cria personagem.
- **Stores que dependem de `character`:** só `useCharacterStore` guarda o dado; 8 rotas/componentes
  leem via `storeCharacter ?? MOCK_CHARACTER` (dashboard, treinos, insights, perfil, sessao, plano,
  diario, `nutrition/TodayLogSection.tsx`) — todos já toleram `character === null` para exibição,
  o problema é só a escrita (`apply*` vira no-op).
- **Valores default já existentes:** `MOCK_CHARACTER` em `src/lib/mock/data.ts` (nível 1, 0 XP,
  atributos 5) — já usado como fallback de leitura em toda a UI; reaproveitado como valor de
  seed, não um novo default inventado.
- **Usuários existentes com `character: null`:** o Hotfix cobre isso pela própria natureza da
  correção (ver decisão abaixo) — não foi necessário escrever uma migração separada.
- **Risco de sobrescrever personagens válidos:** a correção só escreve quando `state.character`
  já é `null`/ausente; nunca quando existe um objeto de personagem, então não há risco.
- **Compatibilidade de storage:** nenhuma mudança de chave (`lrpg-fit:character`) nem de formato
  (mesmo envelope `{ state: { character }, version }` do `persist` do Zustand).

### Decisão arquitetural

Das opções levantadas com o usuário (seed no `StoreHydrationBoundary`, seed ao completar
onboarding, ou só documentar), a escolha foi **seed no `StoreHydrationBoundary`**, com uma nova
action explícita `initializeCharacter()` na própria store — não um fallback implícito espalhado
pela UI. Motivo: `StoreHydrationBoundary` já é o único ponto que roda uma vez por boot em
`(dashboard)/layout.tsx`, cobrindo **qualquer** rota de entrada (não só quem passa pelo
Dashboard, onde vive o onboarding) — se a inicialização dependesse do onboarding, um usuário
que chegasse direto em `/diario` ou `/treinos` via link direto continuaria sem personagem.

### Implementação

- **`src/stores/useCharacterStore.ts`** — nova action `initializeCharacter()`: `if (state.character) return state` (idempotente, nunca sobrescreve); caso contrário, semeia `{ ...MOCK_CHARACTER, created_at: now, updated_at: now }` (timestamps reais do momento da criação, resto idêntico ao default já usado em toda a UI).
- **`src/components/layout/StoreHydrationBoundary.tsx`** — depois que `persist.rehydrate()` resolve (i.e., depois que qualquer dado real já persistido foi aplicado), chama `initializeCharacter()`. Roda dentro de `useEffect` (pós-montagem, nunca durante o render), então não introduz hydration mismatch — o SSR continua renderizando com o estado inicial (`null`), igual antes.
- Nenhuma regra de XP, nível, atributo ou badge foi alterada.
- Instalações com `character: null` (fresh install **ou** estado legado/corrompido) são recuperadas pelo mesmo código: a action não distingue a causa do `null`, só reage ao estado atual.
- `importBackup` (`src/lib/backup.ts`) continua aceitando um envelope de personagem com `character: null` sem rejeitar — a estratégia definida é **não tentar "consertar" no momento do import**; a recuperação acontece no boot seguinte, pelo mesmo `initializeCharacter()`, mantendo uma única fonte de verdade para essa regra.

### Testes adicionados

- **`src/stores/useCharacterStore.test.ts`** (10 casos): instalação nova sem personagem;
  `initializeCharacter` semeia quando `null`; não sobrescreve personagem existente e progredido;
  recupera `character: null` legado da mesma forma que instalação nova; idempotente em chamadas
  repetidas (não reseta XP ganho entre chamadas); um "refresh" simulado não reseta progresso;
  `applyDiaryXp` concede XP (missão/diário/nutrição) só depois de inicializado; `applyDiaryXp`
  é no-op sem inicialização (documenta o bug original); `applyXpGain` concede XP de treino
  (menor unidade testável do fluxo de sessão); `applyAttributeGains` funciona.
- **`src/lib/backup.test.ts`** (+2 casos): import preserva um personagem válido e já progredido
  exatamente como exportado; import aceita (não rejeita) um envelope `character: null` legado,
  confirmando que a estratégia é curar no boot, não no import.
- **31/31 testes passando no total** (19 da Sprint 10 original + 12 novos do Hotfix 10.1).

### QA manual (instalação realmente limpa)

Executado no Browser pane contra `next dev`, limpando apenas as 17 chaves `lrpg-fit:*`/
`rpg_last_seen_level` (não `localStorage.clear()` inteiro):

1. Chaves removidas, `localStorage` confirmado sem nenhuma chave do app.
2. App aberto em `/dashboard` — sem erro de console, sem warning de hydration.
3. Onboarding concluído (via "Pular", que já chama `completeOnboarding`).
4. `lrpg-fit:character` inspecionado: personagem semeado automaticamente
   (`level: 1, current_xp: 0, total_xp: 0`, timestamps reais do boot) — **sem** precisar
   renomear nada na Perfil.
5. Missão "10min de Mobilidade" concluída.
6. XP real aumentou 0 → 15 (Hero do Dashboard: "15 / 100 XP", "XP ACUMULADO: 15").
7. `lrpg-fit:reward-events` confirmado com o evento de recompensa (`+15 XP`, "Missão concluída!").
8. Página recarregada (`/dashboard`) — XP permaneceu em 15 (persistência confirmada, sem
   recriar nem resetar o personagem).
9. Entrada de Diário registrada.
10. XP aumentou 15 → 25 (`+10 XP` do diário).
11. Dashboard e Perfil conferidos — ambos mostrando 25 XP, 1 diário, badge desbloqueada,
    consistentes entre si.
12. Console sem erros nem warnings de hydration em nenhum passo.

**Estado legado testado à parte:** gravado manualmente
`{"state":{"character":null},"version":0}` em `lrpg-fit:character` (mantendo diário e missões
já existentes intactos) e recarregada a página — personagem recuperado automaticamente para o
default (nível 1, 0 XP), sem erro de console, e **sem apagar** as entradas de diário/missões já
gravadas (chaves não relacionadas ficaram intocadas).

## 3. Testes automatizados (fundação nova)

O projeto não tinha nenhum test runner (`package.json` só tinha `dev/build/start/lint`).
Adicionado **Vitest** (`vitest`, `jsdom`, `@vitejs/plugin-react` como dev deps) — menor fricção
para Next.js/TS sem infraestrutura de teste prévia. Script novo: `npm run test`.

- `src/lib/backup.test.ts` — 15 casos: round-trip export→reset→import, contagem de
  `restoredKeys`/`skippedKeys`, JSON malformado, arquivo vazio, não-JSON, envelope inválido,
  payload bem-formado aceito, versão futura rejeitada, array↔string rejeitado, XP negativo
  rejeitado, schema parcialmente válido rejeitado por completo, reset remove todas as chaves,
  + 2 casos do Hotfix 10.1 (personagem válido preservado / `character: null` aceito).
- `src/lib/daily-missions.test.ts` — 6 casos: `completeMission` idempotente, escopo por dia
  (chave de data antiga não conta como "hoje"), status derivado de missão manual concluída,
  bloqueio de missões para iniciantes (`totalWorkouts === 0`), missões automáticas derivadas do
  input (não de `completeMission`), `buildMissionsInput()` não quebra com storage vazio.
- `src/stores/useCharacterStore.test.ts` (Hotfix 10.1) — 10 casos: ver seção "Hotfix 10.1"
  acima para a lista completa.

**31/31 testes passando** (19 originais da Sprint 10 + 12 do Hotfix 10.1). Cobertura focada nos
módulos que esta sprint aponta como críticos (backup/import/reset/missões/personagem) — não foi
perseguida cobertura de 80% do projeto inteiro.

## 4. QA manual — Sprint 10 original (browser, `next dev`)

Executado no Browser pane via `read_page`/`javascript_tool`/`read_console_messages` (a ação
`screenshot` do pane trava neste ambiente — problema conhecido, documentado em memória de
sessões anteriores; não foi bloqueador para QA funcional).

- **Estado vazio, instalação nova:** `/dashboard`, `/insights`, `/diario`, `/nutricao`,
  `/perfil` renderizados sem nenhum erro de console.
- **Onboarding → Dashboard:** modal de onboarding (skip) funcionando, sem travar a UI.
- **Missão manual → XP:** completar "10min de Mobilidade" creditou o contador ("1/7
  completas"), marcou ✓, botão desaparece (impede reclique) — confirmado via
  `localStorage` (`lrpg-fit:missions-completed`) e sem erro de console. Nesta passada de QA o
  Hero não refletiu o ganho de XP porque `character` ainda era `null` (bug crítico documentado
  acima) — o Hotfix 10.1, aplicado em seguida na mesma sessão, resolve isso; ver a QA dedicada
  na seção "Hotfix 10.1" acima, onde a mesma missão já credita XP real.
- **Exportar backup:** botão gera o arquivo e mostra "✓ Backup exportado com sucesso!" sem
  erro de console.
- **Reset:** botão "Apagar tudo" **não faz nada** sem digitar a frase exata (confirmado por
  clique + inspeção de `localStorage`, dado intacto); digitando "resetar" e confirmando, as 17
  chaves são removidas, mensagem de sucesso aparece após reload, `Object.keys(localStorage)`
  vazio.
- **Responsividade mobile (375×812):** `/dashboard` sem overflow horizontal
  (`scrollWidth === clientWidth`), sem erro de console.
- **Importação de arquivo real:** não testada nesta sessão — o Browser pane disponível não tem
  uma forma confiável de simular a seleção de um arquivo `.json` real via input `type="file"`.
  A lógica de import (válido, inválido, atômico) está coberta pelos 13 testes unitários de
  `backup.test.ts`, mas a interação de UI ponta-a-ponta (escolher arquivo → confirmar →
  reload) fica como pendência para uma passada de Playwright.

## 5. Gate técnico (Sprint 10 + Hotfix 10.1, execução final)

```
Lint:      PASS (next lint — sem warnings/erros)
Typecheck: PASS (tsc --noEmit)
Testes:    PASS (31/31 — vitest run)
Build:     PASS (next build — 19 rotas geradas)
```

## 6. Arquivos alterados

### Sprint 10 original

| Arquivo | Motivo |
|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | Corrige crédito de XP/recompensa em missões manuais |
| `src/app/(dashboard)/configuracoes/page.tsx` | Import agora recarrega a página após sucesso |
| `src/lib/backup.ts` | Import atômico + validação de schema por chave |
| `src/lib/backup.test.ts` | Novo — testes de backup/import/reset |
| `src/lib/daily-missions.test.ts` | Novo — testes de missões/idempotência |
| `vitest.config.ts` | Novo — configuração do Vitest (jsdom + alias `@/*`) |
| `package.json` | Novo script `test`; novas devDependencies (`vitest`, `jsdom`, `@vitejs/plugin-react`) |

### Hotfix 10.1

| Arquivo | Motivo |
|---|---|
| `src/stores/useCharacterStore.ts` | Nova action `initializeCharacter()`, idempotente, não sobrescreve personagem existente |
| `src/components/layout/StoreHydrationBoundary.tsx` | Chama `initializeCharacter()` após o `rehydrate()` resolver |
| `src/lib/backup.test.ts` | +2 casos: personagem válido preservado / `character: null` aceito no import |
| `src/stores/useCharacterStore.test.ts` | Novo — 10 casos cobrindo inicialização, idempotência, recuperação de estado legado e XP pós-inicialização |

## 7. Pendências (não implementadas nesta sessão)

1. Suíte Playwright completa (10 cenários da especificação original: primeiro uso, população
   completa, fluxo de treino, diário+nutrição cruzado, export/import real, import inválido,
   reset+cancelamento, level-up+reload, clique duplicado, navegação completa com/sem reload).
2. Teste de volume com dados sintéticos (100 treinos, 200 diário, 90 dias de nutrição) e
   validação de performance/tamanho de backup nesse volume.
3. Matriz de responsividade completa (5 breakpoints × 8 rotas) — só `/dashboard` em 375px e
   750px foram validados nesta sessão.
4. Smoke test em produção (`https://fitness-life-rpg.vercel.app`) e deploy — não realizados;
   exigem confirmação explícita separada antes de qualquer push/deploy.
5. Teste de importação de arquivo real via UI (seleção de `.json` por input de arquivo) — a
   automação de browser disponível não simula upload de arquivo real; lógica coberta só por
   testes unitários.
6. `npm audit` aponta vulnerabilidades pré-existentes em `next@14.2.35` e
   `eslint-config-next` (não introduzidas por esta sprint) cuja correção exige upgrade major
   do Next.js — fora de escopo aqui, fica registrado para avaliação futura.
7. Compatibilidade com versões antigas de backup não testada — só existe `BACKUP_VERSION = 1`
   até hoje, não há backup de versão anterior real para validar migração.

Nenhuma pendência restante é classificada como crítica: o bug que bloqueava XP em instalações
novas (item que impedia encerrar a Sprint 10) foi corrigido e validado pelo Hotfix 10.1.
