// Nomes de arquivo — Sprint 30 Parte 3. Determinísticos e sanitizados: nunca
// usam texto livre do usuário sem normalizar para um slug seguro.

import type { HealthMetricType } from '../types'
import type { HealthExportFormat } from './types'

function toDateStamp(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function slugifyMetric(metric: HealthMetricType): string {
  return metric.replace(/_/g, '-')
}

/**
 * `all` quando nenhum filtro de métrica é aplicado ou há mais de uma; o nome
 * da métrica quando exatamente uma é exportada — facilita reconhecer o
 * conteúdo do arquivo sem abri-lo.
 */
export function buildHealthExportFilename(
  format: HealthExportFormat,
  metrics: HealthMetricType[],
  now: Date = new Date()
): string {
  const metricPart = metrics.length === 1 ? slugifyMetric(metrics[0]) : 'all'
  return `fitness-life-rpg-health-${metricPart}-${toDateStamp(now)}.${format}`
}
