# Health Data Schema — Sprint 28

## `HealthDataSource`

```ts
type HealthDataSource =
  | 'manual' | 'workout' | 'body_progress' | 'wellness'
  | 'json_import' | 'csv_import'
  | 'health_connect' | 'samsung_health' | 'apple_health' | 'google_fit'
```

Só as seis primeiras são ativas nesta sprint. As quatro últimas existem no
tipo apenas para preparar integrações futuras — nenhum código as produz
ainda.

## `HealthMetricType` e unidade canônica

| Métrica | Unidade canônica | Faixa plausível |
|---|---|---|
| `steps` | `count` (inteiro) | 0–100 000 |
| `sleep_duration` | `minutes` | 0–1440 |
| `sleep_quality` | `score` (1–5, inteiro) | 1–5 |
| `resting_heart_rate` | `bpm` | 20–220 |
| `weight` | `kg` | 20–300 |
| `active_calories` | `kcal` | 0–10 000 |
| `activity_duration` | `minutes` | 0–1440 |
| `distance` | `km` | 0–500 |
| `wellness_energy` | `score` (1–5, inteiro) | 1–5 |
| `wellness_soreness` | `score` (1–5, inteiro) | 1–5 |
| `wellness_motivation` | `score` (1–5, inteiro) | 1–5 |

As faixas não são clínicas — existem só para rejeitar erros óbvios de
digitação/importação (peso de 900kg, FC de 900bpm). Conversão de unidade
(`normalization.ts`) suporta hoje: `weight` (kg/lb), `distance` (km/m/mi),
`sleep_duration`/`activity_duration` (minutes/hours/seconds),
`active_calories` (kcal/cal). Unidade não suportada é **rejeitada**, nunca
convertida silenciosamente ou descartada sem aviso.

## `HealthDataRecord`

```ts
interface HealthDataRecord {
  id: string
  metric: HealthMetricType
  value: number
  unit: string           // sempre a unidade canônica após normalização

  recordedAt: string      // ISO — quando o dado ocorreu
  startAt?: string        // início do intervalo (sono, atividade)
  endAt?: string          // fim do intervalo

  source: HealthDataSource
  externalId?: string      // id na fonte externa, quando existir

  importedAt: string       // ISO — quando entrou no app (≠ recordedAt)

  quality: 'high' | 'medium' | 'low' | 'unknown'
  metadata?: Record<string, string | number | boolean>
}
```

`recordedAt` e `importedAt` são sempre timestamps completos, nunca
truncados para `YYYY-MM-DD` nesta camada — o corte para data local só
acontece na agregação diária (Parte 3), para não perder a hora ao lidar
com virada de dia/timezone.

## Persistência

- Chave: `lrpg-fit:health-data-records` (array de `HealthDataRecord`, mesmo
  padrão de `lrpg-fit:body-progress`/`lrpg-fit:readiness-check-ins`).
- Peso **não é duplicado aqui** — ver `body-progress-adapter.ts` e a seção
  de decisões arquiteturais em `HEALTH-DATA-FOUNDATION.md`.
- Ainda não integrado a `backup.ts`/`STORAGE_KEYS` (planejado para a Parte 4).

## Deduplicação

Chave de identidade, da mais para a menos forte:

1. `source + externalId` (quando a fonte fornece um id externo)
2. `metric + source + recordedAt` (fallback para fontes sem id externo)
3. Hash determinístico de `metric|source|value|startAt|endAt` (último recurso)

Nunca depende do `id` interno gerado na criação/importação — reimportar o
mesmo arquivo/registro não duplica.

**Exceção (Parte 2):** para `metric: 'weight'`, a chave é `metric+data`
(a parte `YYYY-MM-DD` de `recordedAt`), ignorando `source` — ver
`HEALTH-DATA-IMPORT.md` para o motivo (Body Progress não tem conceito de
fonte, e todo peso derivado de lá chega como `source: 'body_progress'`).

## Importação (Parte 2)

Ver `HEALTH-DATA-IMPORT.md` para o schema JSON canônico, as colunas CSV
aceitas e o modelo `HealthImportPreview`.
