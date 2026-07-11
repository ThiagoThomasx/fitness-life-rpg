# QA Checklist — Redesign Visual & Navegação

Este checklist existe porque a v1 fechou sprints e até fez deploy sem validação visual consistente (ver `CHANGELOG.md`). Nenhuma tarefa de UI é considerada concluída sem passar por aqui.

## Critério de aceite por tarefa de UI

- [ ] Nenhum valor de cor, fonte, espaçamento ou raio de borda declarado fora de `design-tokens.css`
- [ ] Chartreuse (`--color-accent`) usado apenas em CTA, XP bar, badge ou estado ativo — não em fundo de tela/card grande
- [ ] Screenshot capturado em viewport desktop (≥1200px) e mobile (~390px)
- [ ] Screenshot comparado visualmente ao Dashboard piloto (Sprint 1) — mesma linguagem de card, tipografia, espaçamento
- [ ] Nenhuma classe CSS ou componente legado da v1 reaproveitado sem revisão

## Critério de aceite por sprint

- [ ] Todas as tarefas do backlog da sprint marcadas como concluídas
- [ ] `npm run build` sem erros ou warnings
- [ ] `npm run lint` limpo
- [ ] Nenhuma regressão funcional: fluxos que dependem da store correspondente testados manualmente (ex: Sprint 2 → iniciar treino, adicionar série, finalizar, conferir XP)
- [ ] Screenshot de cada tela tocada na sprint anexado/registrado no `CHANGELOG.md`

## Checklist final (Sprint 6 — antes do deploy)

Rota por rota, confirmar visual consistente e funcional:

- [x] `/dashboard`
- [x] `/treinos`
- [ ] `/treinos/sessao` (sessão ativa) — requer estado de sessão ativa via `useSessionStore` (persist), não reproduzido via seed estático nesta rodada; validado manualmente na Sprint 2
- [x] `/perfil`
- [x] `/insights`
- [x] `/diario`
- [x] `/nutricao`
- [x] `/configuracoes`

Para cada rota:
- [x] Screenshot desktop
- [x] Screenshot mobile
- [x] Navegação (`NavigationShell`) presente e consistente
- [x] Nenhum elemento com estilo da v1 antiga visível

Screenshots em `docs/screenshots/sprint6/` (desktop 1280px + mobile 390px, dados seedados: 2 treinos, 1 entrada de diário, 1 registro nutricional, 1 badge).

## Checklist específico de Dados & Backup (lição da v1)

Na v1 houve confusão sobre se o reset e o export estavam realmente acessíveis via UI. Confirmar explicitamente:

- [x] Botão de exportar backup visível e funcional em `/configuracoes` — testado via Playwright, alerta de sucesso tokenizado exibido
- [x] Botão de importar backup visível e funcional — fluxo de confirmação testado
- [x] Reset de dados acessível via UI (não apenas via store/console) — confirmação por digitação testada (botão habilita apenas com "resetar")
- [ ] Validação de schema testada com um arquivo de backup válido e um inválido — lógica em `lib/backup.ts` inalterada desde a Sprint 1 (não reescrita nesta sprint); recomenda-se teste manual de upload de arquivo antes do deploy final

## Regra de bloqueio

Se qualquer item de "Critério de aceite por sprint" falhar, a sprint **não avança**. Não é permitido iniciar a próxima sprint com pendências da anterior — esse foi o padrão que inflou o escopo na v1 (ver Sprint 12 a 17 no `CHANGELOG.md`).
