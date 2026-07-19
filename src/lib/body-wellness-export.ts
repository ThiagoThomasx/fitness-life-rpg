// Exportação CSV/Markdown de progresso corporal e bem-estar — Sprint 19 Parte 4.
// Módulo puro de composição: nunca calcula uma fórmula nova, apenas serializa
// dados já validados (`body-progress.ts`, `readiness-check-ins.ts`) e reaproveita
// os motores existentes (`body-progress-trends.ts`, `wellness-trends.ts`,
// `wellness-overview.ts`) para o relatório em Markdown. Fotos nunca entram em
// nenhuma exportação daqui — apenas a contagem de fotos vinculadas por registro.

import type { BodyProgressEntry, CustomMeasurement } from './body-progress'
import type { WorkoutReadinessCheckIn } from './readiness-check-ins'
import { summarizeWeightTrend, type BodyMetricTrend } from './body-progress-trends'
import { summarizeWellnessTrends, type WellnessMetricSummary } from './wellness-trends'
import { buildWellnessAssociationsOverview, getActiveCycleWellnessOverview } from './wellness-overview'

// ─── Período ──────────────────────────────────────────────────────────────────

export type ExportPeriodOption = 'last30' | 'last90' | 'all'

export interface ExportPeriodRange {
  startDate: string // YYYY-MM-DD, inclusivo
  endDate: string // YYYY-MM-DD, inclusivo
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Resolve a janela de datas de um filtro de período. `null` significa "todo o histórico". */
export function resolveExportPeriodRange(option: ExportPeriodOption, now: Date = new Date()): ExportPeriodRange | null {
  if (option === 'all') return null
  const days = option === 'last30' ? 30 : 90
  const start = new Date(now.getTime() - (days - 1) * 86400000)
  return { startDate: toDateString(start), endDate: toDateString(now) }
}

export function filterBodyProgressByPeriod(
  entries: BodyProgressEntry[],
  option: ExportPeriodOption,
  now: Date = new Date()
): BodyProgressEntry[] {
  const range = resolveExportPeriodRange(option, now)
  if (!range) return entries
  return entries.filter((e) => e.recordedAt >= range.startDate && e.recordedAt <= range.endDate)
}

export function filterCheckInsByPeriod(
  checkIns: WorkoutReadinessCheckIn[],
  option: ExportPeriodOption,
  now: Date = new Date()
): WorkoutReadinessCheckIn[] {
  const range = resolveExportPeriodRange(option, now)
  if (!range) return checkIns
  return checkIns.filter((c) => {
    const day = c.createdAt.slice(0, 10)
    return day >= range.startDate && day <= range.endDate
  })
}

function periodLabel(option: ExportPeriodOption): string {
  if (option === 'last30') return 'Últimos 30 dias'
  if (option === 'last90') return 'Últimos 90 dias'
  return 'Todo o histórico'
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function csvField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function csvRow(values: (string | number | undefined | null)[]): string {
  return values.map(csvField).join(',')
}

function serializeCustomMeasurements(custom?: CustomMeasurement[]): string {
  if (!custom || custom.length === 0) return ''
  return custom.map((c) => `${c.label}:${c.valueCm}`).join(';')
}

const BODY_PROGRESS_CSV_HEADERS = [
  'recorded_at', 'weight_kg', 'waist_cm', 'abdomen_cm', 'chest_cm', 'hips_cm',
  'right_arm_cm', 'left_arm_cm', 'right_thigh_cm', 'left_thigh_cm', 'right_calf_cm', 'left_calf_cm',
  'neck_cm', 'custom_measurements', 'cycle_id', 'notes', 'photo_count',
] as const

/** Uma linha por registro corporal, ordenado por data. Nunca inclui blobs de fotos, apenas a contagem. */
export function buildBodyProgressCsv(entries: BodyProgressEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
  const rows = sorted.map((e) => {
    const m = e.measurements
    return csvRow([
      e.recordedAt,
      e.weightKg,
      m?.waistCm, m?.abdomenCm, m?.chestCm, m?.hipsCm,
      m?.rightArmCm, m?.leftArmCm, m?.rightThighCm, m?.leftThighCm, m?.rightCalfCm, m?.leftCalfCm,
      m?.neckCm,
      serializeCustomMeasurements(m?.custom),
      e.cycleId,
      e.notes,
      e.photoIds?.length ?? 0,
    ])
  })
  return [BODY_PROGRESS_CSV_HEADERS.join(','), ...rows].join('\n')
}

const WELLNESS_CSV_HEADERS = [
  'recorded_at', 'energy', 'soreness', 'sleep_quality', 'sleep_hours',
  'motivation', 'stress', 'mood', 'readiness_score', 'notes',
] as const

/**
 * Uma linha por check-in, ordenado por data. `readiness_score` fica sempre vazio:
 * o score depende de contexto de treino no momento do check-in (grupos musculares,
 * exercícios) que não é recomputado aqui, para não gerar um valor paralelo ao
 * exibido no app — ver nota em `BODY-WELLNESS-EXPORTS.md`.
 */
export function buildWellnessCsv(checkIns: WorkoutReadinessCheckIn[]): string {
  const sorted = [...checkIns].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const rows = sorted.map((c) =>
    csvRow([
      c.createdAt.slice(0, 10),
      c.energy, c.soreness, c.sleepQuality, c.sleepHours,
      c.motivation, c.stress, c.mood,
      '',
      c.notes,
    ])
  )
  return [WELLNESS_CSV_HEADERS.join(','), ...rows].join('\n')
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

const TREND_LABELS: Record<BodyMetricTrend, string> = {
  increasing: 'aumentou',
  decreasing: 'diminuiu',
  stable: 'ficou estável',
  irregular: 'variou de forma irregular',
  insufficient_data: 'dados insuficientes',
}

const WELLNESS_METRIC_LABELS: Record<WellnessMetricSummary['metric'], string> = {
  energy: 'Energia',
  soreness: 'Dor muscular',
  sleepQuality: 'Qualidade do sono',
  motivation: 'Motivação',
  stress: 'Estresse',
  mood: 'Humor',
  sleepHours: 'Horas de sono',
}

const CONFIDENCE_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'alta',
  medium: 'média',
  low: 'baixa',
}

export interface BodyWellnessReportInput {
  entries: BodyProgressEntry[]
  checkIns: WorkoutReadinessCheckIn[]
  period: ExportPeriodOption
  now?: Date
}

/**
 * Relatório legível em Markdown. Reaproveita os motores de tendência e associação
 * já existentes — nunca introduz uma fórmula nova. Nunca inclui fotos, diagnósticos
 * ou linguagem causal/médica.
 */
export function buildBodyWellnessMarkdownReport(input: BodyWellnessReportInput): string {
  const now = input.now ?? new Date()
  const entries = filterBodyProgressByPeriod(input.entries, input.period, now)
  const checkIns = filterCheckInsByPeriod(input.checkIns, input.period, now)

  const lines: string[] = []
  lines.push('# Progresso corporal e bem-estar', '')

  lines.push('## Resumo', '')
  lines.push(`Período: ${periodLabel(input.period)}`, '')
  lines.push(`- Registros corporais: ${entries.length}`)
  lines.push(`- Check-ins de bem-estar: ${checkIns.length}`, '')

  lines.push('## Registros corporais', '')
  if (entries.length === 0) {
    lines.push('Nenhum registro corporal neste período.', '')
  } else {
    const sorted = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    lines.push(`- Primeiro registro: ${sorted[0].recordedAt}`)
    lines.push(`- Último registro: ${sorted[sorted.length - 1].recordedAt}`)
    const weightTrend = summarizeWeightTrend(entries)
    if (weightTrend.absoluteChange !== undefined) {
      const sign = weightTrend.absoluteChange > 0 ? '+' : ''
      lines.push(`- Variação de peso: ${sign}${weightTrend.absoluteChange.toFixed(1)} kg`)
    }
    lines.push('')
  }

  lines.push('## Tendências', '')
  const weightTrend = summarizeWeightTrend(entries)
  lines.push(`- Peso: ${TREND_LABELS[weightTrend.trend]} (amostra: ${weightTrend.sampleSize})`, '')

  lines.push('## Bem-estar', '')
  if (checkIns.length === 0) {
    lines.push('Nenhum check-in de bem-estar neste período.', '')
  } else {
    const wellnessTrends = summarizeWellnessTrends(checkIns).filter((t) => t.sampleSize > 0)
    if (wellnessTrends.length === 0) {
      lines.push('Dados insuficientes para tendências de bem-estar.', '')
    } else {
      for (const t of wellnessTrends) {
        const avg = t.average !== undefined ? t.average.toFixed(1) : '—'
        lines.push(`- ${WELLNESS_METRIC_LABELS[t.metric]}: média ${avg}, ${TREND_LABELS[t.trend]} (amostra: ${t.sampleSize})`)
      }
      lines.push('')
    }
  }

  lines.push('## Associações', '')
  const overview = buildWellnessAssociationsOverview(checkIns)
  if (overview.dataStatus === 'no_data') {
    lines.push('Sem check-ins suficientes para calcular associações.', '')
  } else if (overview.dataStatus === 'insufficient_data') {
    lines.push('Dados insuficientes para uma associação com confiança.', '')
  } else {
    for (const a of overview.associations) {
      lines.push(`- ${a.summary} (confiança: ${CONFIDENCE_LABELS[a.confidence]}, amostra: ${a.sampleSize} semanas)`)
    }
    lines.push('')
  }

  lines.push('## Ciclos', '')
  const activeCycle = getActiveCycleWellnessOverview(now)
  if (!activeCycle) {
    lines.push('Nenhum ciclo ativo no momento.', '')
  } else {
    const coveragePercent = activeCycle.summary.coverageRate !== undefined
      ? Math.round(activeCycle.summary.coverageRate * 100)
      : undefined
    lines.push(`- Ciclo ativo: ${activeCycle.cycleName}`)
    lines.push(`- Check-ins no ciclo: ${activeCycle.summary.checkInCount}`)
    if (coveragePercent !== undefined) lines.push(`- Cobertura de check-ins: ${coveragePercent}%`)
    lines.push('')
  }

  lines.push('## Limitações dos dados', '')
  lines.push('- Fotos de progresso não fazem parte deste relatório.')
  lines.push('- Associações descrevem coincidências observadas no seu histórico, não causas.')
  lines.push('- O score de prontidão não é recalculado neste relatório nem na exportação CSV.')
  lines.push('- Os dados usados aqui existem apenas neste navegador.')

  return lines.join('\n')
}

// ─── Download (navegador) ─────────────────────────────────────────────────────

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportDateStamp(now: Date = new Date()): string {
  return toDateString(now)
}

export function downloadBodyProgressCsv(entries: BodyProgressEntry[], now: Date = new Date()): void {
  const csv = buildBodyProgressCsv(entries)
  downloadTextFile(csv, `fitness-rpg-body-progress-${exportDateStamp(now)}.csv`, 'text/csv;charset=utf-8')
}

export function downloadWellnessCsv(checkIns: WorkoutReadinessCheckIn[], now: Date = new Date()): void {
  const csv = buildWellnessCsv(checkIns)
  downloadTextFile(csv, `fitness-rpg-wellness-${exportDateStamp(now)}.csv`, 'text/csv;charset=utf-8')
}

export function downloadBodyWellnessMarkdownReport(input: BodyWellnessReportInput): void {
  const markdown = buildBodyWellnessMarkdownReport(input)
  downloadTextFile(markdown, `fitness-rpg-body-wellness-report-${exportDateStamp(input.now)}.md`, 'text/markdown;charset=utf-8')
}
