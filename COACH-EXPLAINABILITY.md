# Coach Explainability (Sprint 26)

Regra final da spec: "se qualquer uma dessas respostas não puder ser
explicada claramente, a recomendação não deve ser gerada." Este documento
mostra como cada uma é respondida por toda `CoachRecommendation`.

## As 4 perguntas

**Por que recebi esta recomendação?**
`recommendation.title` + `recommendation.summary` — texto observacional
gerado pela regra a partir de números reais, nunca texto livre/inventado.

**Quais dados foram analisados?**
`recommendation.evidence` (array de strings com o número exato que sustenta
o achado) + `recommendation.period` (período analisado, sempre citado). Toda
regra em `rules.ts` cita a evidência exata que a gerou — nenhuma regra
dispara "porque sim".

**Qual regra foi aplicada?**
`recommendation.ruleId` — identificador estável (ex.:
`Coach.Progress.Stagnation`, `Coach.Fatigue.HighLoad`... ver tabela completa
em `COACH-RULES.md`). `COACH_RULE_DESCRIPTIONS` (`explanations.ts`) mapeia
cada id para uma descrição legível da condição exata que a dispara — testado
por `explanations.test.ts` para garantir que toda regra registrada tem
descrição, e que nenhuma descrição órfã sobrevive a uma regra removida.

**O que devo fazer, se decidir seguir a sugestão?**
`recommendation.suggestion` (texto de ação sugerida, nunca aplicada
automaticamente) + `recommendation.actions` (links de navegação — nunca
mutações; ver "NÃO IMPLEMENTAR" em `COACH-ENGINE.md`).

## Exemplo canônico (da spec)

```
Progressão estagnada
Supino Inclinado
Últimas 8 semanas.
A carga permaneceu praticamente estável.
A regra Coach.Progress.Stagnation foi ativada.
Considere revisar o esquema de progressão.
```

Mapeamento direto para o shape real:

```ts
{
  title: "Supino Inclinado sem evolução de carga",
  summary: "A carga de Supino Inclinado permaneceu praticamente estável nas últimas execuções registradas.",
  evidence: ["<explicação literal do ExerciseTrend, com os números da janela de 3 vs. 3 execuções>"],
  period: "90d", // ou o período efetivamente selecionado
  ruleId: "Coach.Progress.Stagnation",
  suggestion: "Considere revisar o esquema de progressão de Supino Inclinado (ex.: variar reps, adicionar uma série, trocar variação)."
}
```

## Onde isso aparece na UI

`CoachRecommendationCard.tsx` — colapsado mostra só título/resumo/badges de
categoria e status; "Ver detalhes" expande as evidências, período, regra
aplicada e sugestão na ordem exata acima, seguido pelos links de ação
(navegação apenas) e os botões Aceitar/Ignorar.

## Garantia estrutural

`CoachRecommendation` (tipo em `types.ts`) tem `title`, `summary`,
`evidence`, `period`, `ruleId` e `suggestion` como campos **obrigatórios**,
não opcionais — o TypeScript já impede que uma regra produza uma
recomendação sem alguma dessas respostas. Nenhuma verificação em runtime é
necessária além disso.
