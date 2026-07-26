// Utilitários compartilhados do módulo de Analytics — Sprint 25 Parte 1.
//
// Funções puras, agnósticas de domínio (nada de performance/consistência/
// balanceamento muscular/fadiga aqui — isso é Parte 2/3). Servem de base para
// todos os motores futuros: resolução de período, filtro por intervalo de
// datas, comparação percentual segura e confiança de amostra.

import type { AnalyticsPeriod, DateRange, TrendDirection } from './types'

/**
 * Tolerância de estabilidade (±5%) — mesma convenção de
 * `exercise-intelligence.ts` (`STABILITY_TOLERANCE_PERCENT`). Exportada a
 * partir da Sprint 25 Parte 4A para que `insights.ts` reaproveite a MESMA
 * barra de "variação que não é ruído" ao invés de definir um segundo limiar
 * paralelo para "evolução notável de exercício".
 */
export const STABILITY_TOLERANCE_PERCENT = 5

/**
 * Limiares de confiança de amostra alinhados à convenção de
 * `adaptive-recommendations.ts` (`MIN_SESSIONS_FOR_SIGNAL = 2`): abaixo de 2
 * amostras não há sinal nenhum ainda ('low'), e o piso de 'insufficient'
 * (zero amostras) nunca é tratado como dado ruim — só como ausência de dado.
 */
const LOW_CONFIDENCE_MAX = 2
const MEDIUM_CONFIDENCE_MAX = 5

/**
 * Converte um `AnalyticsPeriod` num `DateRange` concreto terminando em `now`
 * (padrão: `new Date()`). Não consulta nenhuma fonte de dados — é puro e
 * independente do histórico de treinos. `'all'` usa a época Unix como início,
 * já que este módulo não tem acesso à primeira sessão real do usuário aqui.
 */
export function resolvePeriodRange(period: AnalyticsPeriod, now: Date = new Date()): DateRange {
  const end = new Date(now)

  if (period === 'all') {
    return { start: new Date(0), end }
  }

  const start = new Date(end)
  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    case '6m':
      start.setMonth(start.getMonth() - 6)
      break
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      break
  }
  return { start, end }
}

/**
 * Filtro genérico por intervalo de datas — inclusivo nas duas pontas
 * (`start <= data(item) <= end`). `getDate` extrai a data de cada item, que
 * pode ser uma string ISO ou um `Date` já materializado.
 */
export function filterByDateRange<T>(items: T[], range: DateRange, getDate: (item: T) => string | Date): T[] {
  const startMs = range.start.getTime()
  const endMs = range.end.getTime()
  return items.filter((item) => {
    const raw = getDate(item)
    const ms = raw instanceof Date ? raw.getTime() : new Date(raw).getTime()
    return ms >= startMs && ms <= endMs
  })
}

export interface PeriodComparison {
  changePercent: number | null
  direction: TrendDirection
}

/**
 * Calcula a variação percentual entre um valor atual e um valor anterior,
 * tratando divisão por zero explicitamente (nunca `Infinity`/`NaN`):
 * - `previous === 0 && current === 0` → sem sinal nenhum (`insufficient_data`, `changePercent: null`).
 * - `previous === 0 && current > 0` → não há base percentual válida
 *   (`changePercent: null`), mas a direção observada é claramente `increasing`.
 * - Variação dentro de ±5% (`STABILITY_TOLERANCE_PERCENT`) é `stable`,
 *   mesma tolerância usada por `exercise-intelligence.ts`.
 */
export function comparePeriods(current: number, previous: number): PeriodComparison {
  if (previous === 0) {
    if (current === 0) {
      return { changePercent: null, direction: 'insufficient_data' }
    }
    return { changePercent: null, direction: current > 0 ? 'increasing' : 'decreasing' }
  }

  const changePercent = ((current - previous) / previous) * 100
  if (Math.abs(changePercent) <= STABILITY_TOLERANCE_PERCENT) {
    return { changePercent, direction: 'stable' }
  }
  return { changePercent, direction: changePercent > 0 ? 'increasing' : 'decreasing' }
}

/**
 * Confiança de amostra por tamanho: 0 → `insufficient`, 1-2 → `low`
 * (abaixo do limiar de sinal de `adaptive-recommendations.ts`), 3-5 →
 * `medium`, 6+ → `high`.
 */
export function sampleConfidence(sampleSize: number): 'low' | 'medium' | 'high' | 'insufficient' {
  if (sampleSize <= 0) return 'insufficient'
  if (sampleSize <= LOW_CONFIDENCE_MAX) return 'low'
  if (sampleSize <= MEDIUM_CONFIDENCE_MAX) return 'medium'
  return 'high'
}
