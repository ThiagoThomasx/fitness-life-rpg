# Interaction Tests — Sprint 24

Este projeto nunca adotou React Testing Library (decisão mantida desde a Sprint 22 Parte 2: "convenção mantida — só motor puro testado, UI verificada via QA manual no browser"). Esta sprint avaliou reintroduzir RTL (seção 10/11 da spec) e decidiu **não** introduzir a infraestrutura: o Playwright real (via workaround msedge) já cobre interação real (clique, teclado, foco) contra o app rodando de verdade, o que tem mais sinal do que testes de componente isolado para os padrões de dialog/foco que motivaram a avaliação. Ver `[[browser-pane-screenshot-workaround]]` — mesma ferramenta serviu para QA visual, verificação de teclado e agora estes testes de interação.

Em vez de testes de componente isolado (RTL), os testes de interação desta sprint são **testes de integração ponta-a-ponta via Playwright**, documentados abaixo com o que cada um verifica. Não são testes automatizados no `vitest run` (não fazem parte do gate de CI) — são scripts ad-hoc rodados contra o dev server, seguindo o mesmo padrão já usado nas Sprints 2/7/8/11/12/17.1/18/19/20-1 para QA visual/funcional.

## O que foi testado

### 1. Fluxo completo de treino (Fluxo 1 da spec)

`Criar/escolher treino → Iniciar → Sessão ativa → Pular check-in → Registrar séries → Finalizar → Histórico → Exercício`

- Abrir `/treinos`, iniciar um treino template real.
- Pular o check-in de prontidão (Sprint 14).
- Adicionar 1 série em cada exercício (formulário real, valores prefilled).
- Finalizar o treino (botão habilitado só quando `totalSets > 0` — comportamento confirmado).
- Resultado: treino salvo em `workout-history`, recorde pessoal detectado, navegação para `/exercicios/[id]` e `/historico/[id]` com dados reais renderizando corretamente.

### 2. Modal (abrir/fechar/teclado)

- Abrir `WorkoutBuilderModal` via clique real.
- Tab/Shift+Tab reais (8x cada direção) — foco nunca escapa do dialog.
- Escape fecha o dialog.
- Foco retorna ao elemento que abriu o dialog.
- Ver `ACCESSIBILITY-REPORT.md` para o detalhe completo.

### 3. `aria-describedby` end-to-end

- Disparar o `ConfirmDialog` real (diálogo "sessão ativa" ao tentar iniciar um segundo treino) e ler `aria-describedby` do DOM renderizado — confirma que o id resolve para o parágrafo de descrição correto, não é um wiring cego.

### 4. Backup/restore sob falha (Fluxo 3 — Data Safety)

Estes viraram testes automatizados de verdade (`src/lib/backup.test.ts`, rodam no `vitest run`/CI), não scripts ad-hoc — ver seção "Data Safety" abaixo.

## Data Safety — testes novos

`src/lib/backup.test.ts` já cobria (desde sprints anteriores): JSON malformado, arquivo vazio, payload não-JSON, campos obrigatórios ausentes, versão futura rejeitada, atomicidade em payload parcialmente corrompido, XP negativo rejeitado, envelope de personagem legado (`character: null`) curado em vez de rejeitado, e formato antigo de histórico sem campos novos.

**Gap real identificado nesta sprint**: existia código dedicado a reverter a escrita quando `localStorage.setItem` lança uma exceção no meio da restauração (comentário no próprio `backup.ts`: "permite reverter tudo se uma escrita falhar no meio (ex.: quota do localStorage excedida)"), mas nenhum teste exercitava esse caminho — só os caminhos de validação (que nunca chegam a escrever).

Dois testes novos em `describe('importBackup schema validation (atomicity)')`:

1. **`rolls back every key already written when localStorage.setItem throws mid-import (quota exceeded)`** — mocka `Storage.prototype.setItem` para lançar `QuotaExceededError` na 3ª escrita (depois de `character` e `workout-history` já terem sido gravados). Confirma que o import retorna `ok: false` com a mensagem "armazenamento cheio ou indisponível" e que **nenhuma** chave fica com dado parcial.
2. **`rolls back to a pre-existing value (not just null) when a write fails mid-import`** — mesma técnica, mas partindo de um storage já populado (sem `resetAllData()` antes): confirma que o rollback restaura o **valor antigo real**, não apenas limpa a chave. Este é o caso que mais importa na prática — um usuário restaurando um backup por cima de dados existentes, não um storage vazio.

Total: 954/954 testes (2 novos desde a Sprint 23).

## Fora de escopo desta sprint (decisão consciente)

- Storage cheio simulado via quota real do navegador (só mockado) — simular quota real de `localStorage` do Chromium/Edge não é controlável de fora do processo do navegador de forma confiável.
- "Duas abas" (mesma origem, dois contextos) e "reload durante sessão" — não implementados como teste automatizado nesta sprint; o mecanismo de persistência (Zustand `persist` + `localStorage`) já é sincronizado por escrita síncrona a cada série registrada (não hidratação lenta), então o risco de perda por reload é baixo, mas não foi verificado por um teste dedicado.
- IndexedDB indisponível — já coberto desde a Sprint 19 Parte 2 (`body-progress-photo-db.test.ts`, `body-progress-photo-errors.test.ts`), não repetido aqui.
