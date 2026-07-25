# Sprint 21 — Parte 4B: Insights, Backup, Gamificação & QA Final

## O que foi feito

1. **Insights** — `ProgramAdherenceInsightsSection.tsx`: seção "Adesão ao
   plano", reusando `program-progress.ts` (Parte 3) sem recalcular nada.
   Lista cada programa com sessões planejadas (adesão, pontualidade, sessões
   extras), linkando para `/programas/[id]`. Estado vazio explica o que
   falta ("instancie um programa... conclua algumas sessões").

2. **Gamificação** — dois marcos novos em `badges.ts`, seguindo o padrão
   existente (`requirementType` + `BadgeCheckContext`, idempotente via
   `hasBadge`):
   - `badge-first-perfect-week` ("Semana Perfeita") — 1ª semana com 100% de
     adesão.
   - `badge-consistent-adherence` ("Consistência de Ferro") — 4 semanas com
     ≥80% de adesão.

   Alimentados por `countAdherenceWeeksAboveThreshold` (novo, em
   `program-progress.ts`), chamado em `sessao/page.tsx` junto com o resto da
   checagem de badges ao confirmar o resultado de uma sessão. Só conta
   semanas com `dataStatus === 'complete'` — nunca futuras/em andamento.
   Não foram implementados os outros marcos da seção 18 da spec ("primeiro
   programa concluído", "treino concluído após remarcação", "semana
   equilibrada entre treino e recuperação") — a spec pede poucos badges, só
   os mais significativos; os dois adicionados já cobrem o sinal central
   (consistência).

3. **Backup** — `lrpg-fit:adaptive-recommendation-decisions` (Parte 4A) já
   entra em `STORAGE_KEYS`/`ARRAY_KEYS`, portanto em export/import. Reset
   granular em Configurações **não foi estendido** — o grupo
   "templates/programas" já não incluía `planned-workouts` antes desta
   sprint (gap pré-existente, fora do escopo desta parte).

## Testes

- `program-progress.test.ts`: +2 casos para `countAdherenceWeeksAboveThreshold`.
- `badges.test.ts` (novo — não existia teste algum para `badges.ts` antes):
  4 casos cobrindo os dois marcos novos e idempotência.

## QA manual (browser)

- `/insights` mostra "Adesão ao plano" com os dados reais seedados
  (Programa de Teste, 43% adesão, 100% pontualidade), link funcional para
  `/programas/[id]`.

## Gates finais (Sprint 21 completa)

```
Lint:      ok (0 warnings/errors)
Typecheck: ok
Tests:     881 passed, 1 pré-existente falhando
           (training-load.test.ts > counts free sessions all time —
           confirmado falho também em HEAD antes de qualquer mudança da
           Sprint 21; não relacionado a nada desta sprint)
Build:     ok — todas as rotas geradas, incluindo as 2 novas dinâmicas
           (/plano/treino/[id], /programas/[id])
```

## QA manual consolidado (desktop, via browser)

- Planner → detalhe do treino planejado → iniciar/ignorar/reagendar/cancelar.
- Sessão iniciada pelo Planner → concluir → vínculo ao Planner, classificação
  de pontualidade, comparação planejado×realizado.
- `/programas/[id]`: progresso, adesão por semana, recomendações adaptativas
  (aceitar/dispensar persistem e sobrevivem a reload).
- `/plano`: card de aderência do programa ativo.
- `/insights`: seção de adesão ao plano.

QA mobile/acessibilidade detalhada (seções 21-22 da spec) não foi executada
nesta sessão — fica como pendência explícita (ver abaixo).

## Pendências conscientes (fim da Sprint 21)

- Substituições de exercício não são persistidas em `CompletedWorkout` —
  bloqueia "principais substituições" no progresso do programa e a regra
  `review_exercise` do motor de recomendações no fluxo real (a regra existe
  e é testada, mas nunca recebe dados hoje).
- QA mobile e de acessibilidade (teclado, contraste, `aria-label` em botões
  de ícone novos) não foi feita nesta sessão.
- Reset granular em Configurações não cobre `planned-workouts` nem as novas
  decisões de recomendação (gap pré-existente + novo, ambos documentados).
- Marcos de gamificação da seção 18 não implementados: "primeiro programa
  concluído", "treino concluído após remarcação", "semana equilibrada entre
  treino e recuperação".
- `docs/SPRINT-21.md` e afins não foram criados em `docs/` — a convenção
  real do projeto (confirmada na auditoria: `SPRINT-20-PART1.md`,
  `SPRINT-20-PART4B.md`) é documentar cada parte na raiz do repo, seguida
  aqui.

## Próximo passo recomendado

Fechar as pendências de substituição de exercício no histórico (schema de
`CompletedWorkout`) antes de expandir mais o motor de recomendações — é o
maior bloqueio real de dados restante. Depois disso, QA mobile/acessibilidade
formal antes de considerar o fluxo de execução "pronto para uso diário".
