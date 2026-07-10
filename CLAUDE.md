# CLAUDE.md — Instruções de Execução para o Claude Code

Este arquivo define **regras obrigatórias** para qualquer trabalho feito neste repositório via Claude Code. Ele existe porque a v1 deste projeto (ver `CHANGELOG.md`) falhou por excesso de escopo e falta de critério visual — as regras abaixo existem para não repetir isso.

## Contexto do projeto

Fitness Life RPG é um app de **progressão de exercícios físicos** — treinos, XP, atributos, badges, diário, nutrição, insights — com identidade visual de dashboard de dados (não RPG/fantasia). Local-first: sem backend ativo, dados em `localStorage` via Zustand.

Fase atual: **redesign visual + navegação**, mantendo toda a lógica de negócio já implementada. Ver `ROADMAP_SPRINTS.md` para o plano completo e `ARCHITECTURE.md` para a estrutura técnica.

## Regras obrigatórias (não negociáveis)

1. **Feature freeze.** Nenhuma funcionalidade nova (Plano/Campanhas, PWA, Workout Builder, Revisão Semanal, Onboarding) entra em código até o roadmap de redesign (Sprints 1–6) estar 100% aceito. Se o usuário pedir uma feature nova durante essa fase, sinalizar o conflito antes de implementar.
2. **Não tocar em lógica de negócio.** Cálculo de XP, detecção de PR, atributos, regras de badge — tudo isso já existe e funciona. Sprints de redesign mexem **apenas** em componentes visuais e navegação. Se uma mudança visual exigir alterar uma store, parar e confirmar antes.
3. **Design tokens são a única fonte de estilo.** Nunca usar cor, tamanho de fonte, espaçamento ou raio de borda "solto" (hex direto, px avulso) em componente. Tudo vem de `design-tokens.css` / `tailwind.config` `@theme`. Ver `DESIGN.md` para os valores.
4. **Chartreuse (`#c8f169`) é acento, não superfície.** Não usar como fundo de tela ou de card grande. Uso permitido: CTA primário, barra de XP, badges, estados ativos/hover.
5. **Critério de aceite visual obrigatório.** Nenhuma tarefa de UI é considerada concluída sem uma screenshot (desktop + mobile) comparada ao padrão do Dashboard (piloto do Sprint 1). Ver `QA_CHECKLIST.md`.
6. **Navegação é decisão travada, não iterativa.** A escolha entre sidebar/drawer/tab bar é feita **uma vez**, no spike do Sprint 1, com prova visual. Depois de aprovada, não reabrir a decisão dentro da mesma fase — isso já custou 4 tentativas falhas na v1.
7. **Sprints pequenas, tarefas granulares.** Cada tarefa de backlog deve ser completável em 1–4h. Não aceitar prompts que misturem "implementar X e também ajustar Y e revisar Z" — quebrar em tarefas separadas.
8. **Build e lint limpos são condição de saída de sprint**, não item opcional.
9. **Supabase permanece desativado.** Não reativar autenticação ou chamadas de rede para o Supabase nesta fase. O schema existe no banco mas não faz parte do fluxo ativo.

## Ordem de leitura recomendada para qualquer sessão nova

1. `README.md` — visão geral
2. `ROADMAP_SPRINTS.md` — sprint atual e backlog
3. `ARCHITECTURE.md` — stores, fluxo de dados, NavigationShell
4. `DESIGN.md` — tokens de cor, tipografia, espaçamento
5. `DATA_MODEL.md` — estrutura de dados por domínio
6. `QA_CHECKLIST.md` — critério de aceite antes de fechar qualquer tarefa

## Ao final de cada sprint

- Atualizar `CHANGELOG.md` com o que foi entregue e decisões técnicas tomadas (ADR informal).
- Marcar checklist correspondente em `ROADMAP_SPRINTS.md`.
- Não avançar para a próxima sprint sem o critério de aceite da atual confirmado.
