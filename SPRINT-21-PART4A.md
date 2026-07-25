# Sprint 21 — Parte 4A: Adaptive Recommendations

## O que foi feito

1. **`src/lib/adaptive-recommendations.ts`** (novo, motor puro) —
   `generateAdaptiveRecommendations(input)`. Regras determinísticas e
   explicáveis, sempre com evidência anexada:
   - `reduce_volume`: volume executado < 70% do planejado.
   - `reduce_frequency`: > 40% das sessões planejadas recentes foram
     ignoradas.
   - `insert_recovery`: readiness baixa em mais da metade dos check-ins
     recentes, ou soreness média elevada (≥4/5) — sempre acompanhada do aviso
     de segurança da spec ("procure avaliação profissional...").
   - `review_exercise`: um exercício substituído ≥3 vezes recentemente.
   - `maintain_plan`: só quando não há nenhum alerta acima **e** adesão ≥90%
     — nunca "por padrão" com dados insuficientes.
   - Nenhuma regra dispara com menos de 2 sessões planejadas na janela —
     dados insuficientes produzem `[]`, nunca uma recomendação inventada.
   - Ids determinísticos (`tipo:windowKey[:detalhe]`) — mesma condição na
     mesma semana sempre gera o mesmo id, base para a deduplicação.

2. **`src/lib/adaptive-recommendation-decisions.ts`** (novo) — persiste a
   decisão do usuário (`accepted`/`dismissed`/`review_later`) por id de
   recomendação. `accepted`/`dismissed` escondem a recomendação de
   reaparecer; `review_later` deixa reaparecer no próximo cálculo. Nunca
   aplica nenhuma mudança ao programa — só registra a decisão (seção 15 da
   spec: "nenhuma recomendação deve alterar automaticamente o programa").

3. **`src/lib/recommendation-assembly.ts`** (novo) — único módulo que lê
   storage para montar o input do motor: adesão do programa (Parte 3),
   volume planejado×realizado (via `buildPlannedPerformedComparison` da
   Parte 2, médio das últimas sessões), sessões ignoradas na janela,
   estatísticas de readiness dos check-ins vinculados às sessões do
   programa (`computeReadinessStats`, Sprint 14). Substituições recorrentes
   ficam de fora: `CompletedWorkout` não persiste substituições de exercício
   (pendência já registrada na Parte 3) — sem esse dado, a regra
   `review_exercise` nunca dispara aqui, o que é o comportamento correto.

4. **`AdaptiveRecommendationsPanel.tsx`** — painel com severidade, evidências
   expansíveis e as três ações da spec (aceitar/revisar depois/dispensar).
   Sempre mostra o aviso "orientação do aplicativo, não prescrição médica".

5. **Integrado em `/programas/[id]`** — abaixo do progresso do programa.

6. **`backup.ts`** — nova chave `lrpg-fit:adaptive-recommendation-decisions`
   adicionada a `STORAGE_KEYS` e `ARRAY_KEYS` (export/import automáticos).

## Decisões

- "Aceitar" nunca aplica a mudança sozinha — é sempre o usuário quem age
  depois, manualmente, no Planner ou no editor de programa. Evita toda a
  complexidade de diff-preview/versionamento de programa que a seção 15
  descreve para o caso de mutação automática, que não existe aqui.
- Janela de análise fixa em 14 dias — simples e auditável, sem parâmetro de
  configuração nesta parte.

## Testes

- `adaptive-recommendations.test.ts`: 9 casos (manter plano, reduzir
  volume, reduzir frequência, inserir recuperação por readiness baixa e por
  soreness elevada, rever exercício recorrente, abaixo do limiar não
  dispara, dados insuficientes → `[]`, id determinístico).
- `adaptive-recommendation-decisions.test.ts`: 6 casos (persistir, decisão
  idempotente, ocultar dispensada, ocultar aceita, manter "revisar depois"
  visível, reset).

## QA manual (browser)

Seed de programa com 5 sessões planejadas (3 ignoradas, 2 concluídas) →
`/programas/prog-test-1` mostra a recomendação "reduzir frequência" com a
evidência real (3 de 7). "Dispensar" esconde a recomendação imediatamente
e o estado persiste após reload da página (localStorage).

## Gates

```
Lint:      ok
Typecheck: ok
Tests:     875 passed, 1 pré-existente falhando (training-load.test.ts,
           não relacionado — ver SPRINT-21-PART1.md)
Build:     ok
```

## Pendências para a Parte 4B

- Insights ainda não mostra adesão/planejado×realizado/padrões.
- Gamificação (marcos de consistência) ainda não integrada.
- Reset granular em Configurações não inclui as decisões de recomendação
  ainda (só entram no export/import completo do backup).
