# Health Data Quality — Sprint 28

## Princípio

Qualidade não é um score numérico único — é um nível (`high`/`medium`/
`low`/`unknown`) mais uma lista de razões (`reasons: string[]`), para que a
UI e os motores consumidores (Readiness, Coach) possam explicar por que um
dado foi classificado daquele jeito, em vez de confiar num número opaco.

Esta sprint calcula qualidade **por registro individual**, no momento da
entrada/importação (`computeRecordQuality`, em `quality.ts`). Qualidade que
depende de comparação entre registros do mesmo dia (conflito entre fontes,
duplicidade parcial) é responsabilidade da agregação diária (Parte 3), não
desta camada.

## Fatores considerados (Parte 1)

1. **Fonte direta vs. importação.** `manual`, `wellness`, `body_progress` e
   `workout` são fontes diretas do usuário/app; `json_import`/`csv_import`
   e as fontes de plataforma (`health_connect` etc., quando ativas) contam
   como "importação" — não são necessariamente piores, mas reduzem a
   confiança por não terem sido inseridas na hora.
2. **Completude do intervalo.** Para métricas de intervalo (`sleep_duration`,
   `activity_duration`), a ausência de `startAt`/`endAt` reduz a qualidade —
   o app não consegue verificar que a duração informada é consistente com
   um intervalo real.
3. **Proximidade do limite plausível.** Um valor dentro dos 3% mais
   próximos da borda da faixa (`METRIC_RANGES`) é sinalizado como possível
   outlier, sem ser rejeitado (rejeição é responsabilidade da validação,
   não da qualidade).

## Regra de classificação

- **`high`**: nenhuma das razões acima se aplica (fonte direta + intervalo
  completo quando exigido + valor longe da borda).
- **`low`**: fonte de importação **e** mais de uma razão adicional presente.
- **`medium`**: qualquer combinação intermediária (uma única razão, ou
  fonte direta com uma ressalva isolada).

## Validação (rejeição, não apenas qualidade)

Valores fora de `METRIC_RANGES` (ver `HEALTH-DATA-SCHEMA.md`) são
**rejeitados**, nunca aceitos com qualidade baixa — a diferença entre
"aceito com ressalva" (qualidade) e "rejeitado" (validação) é intencional:
um peso de 900kg não é um dado de baixa qualidade, é um erro de entrada.

Regras adicionais de validação (`validation.ts`):

- `sleep_duration`: se `startAt`/`endAt` forem informados, a duração deve
  bater com o intervalo (tolerância de 1 minuto) e `startAt` deve ser
  anterior a `endAt`.
- Qualquer métrica com apenas um de `startAt`/`endAt` informado é rejeitada
  (os dois ou nenhum).
- Unidade de entrada não suportada pela tabela de conversão da métrica é
  rejeitada, nunca ignorada.

## Fora de escopo desta parte

Conflito entre fontes no mesmo dia, regras de agregação por métrica
(soma vs. mais recente vs. mediana) e baseline/tendência — ver
`HEALTH-DATA-FOUNDATION.md` §5 (Parte 3).
