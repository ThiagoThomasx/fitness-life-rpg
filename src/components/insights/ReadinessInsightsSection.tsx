"use client"

import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import type { ReadinessStats } from "@/lib/workout-readiness"
import { DEFAULT_READINESS_CONFIG } from "@/lib/workout-readiness"

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

interface Props {
  checkIns: WorkoutReadinessCheckIn[]
  stats: ReadinessStats
}

export function ReadinessInsightsSection({ checkIns, stats }: Props) {
  const min = DEFAULT_READINESS_CONFIG.minSessionsForInsight

  if (checkIns.length === 0) {
    return (
      <section className="insights-section" aria-labelledby="readiness-insights-heading">
        <h2 id="readiness-insights-heading" className="insights-section__title">Prontidão e recuperação</h2>
        <div className="card card--dashed empty-state">
          <p className="empty-state__desc">
            Complete check-ins antes dos treinos para ver análises de prontidão e recuperação.
          </p>
        </div>
      </section>
    )
  }

  const energyAvg = avg(checkIns.map((c) => c.energy))
  const sleepAvg = avg(checkIns.map((c) => c.sleepQuality))
  const sorenessAvg = avg(checkIns.map((c) => c.soreness))
  const motivationAvg = avg(checkIns.map((c) => c.motivation))

  const hasEnoughData = checkIns.length >= min

  // Distribution of levels
  const total = stats.highReadinessCount + stats.moderateReadinessCount + stats.lowReadinessCount

  function pct(n: number): string {
    if (total === 0) return "0%"
    return `${Math.round((n / total) * 100)}%`
  }

  // Insight: energy correlation
  let energyInsight: string | null = null
  if (hasEnoughData) {
    const highEnergySessions = checkIns.filter((c) => c.energy >= 4)
    const lowEnergySessions = checkIns.filter((c) => c.energy <= 2)
    if (highEnergySessions.length >= 2 && lowEnergySessions.length >= 2) {
      energyInsight = `No seu histórico, dias com energia 4 ou 5 estiveram associados a treinos de prontidão ${stats.highReadinessCount > stats.lowReadinessCount ? "mais alta" : "variada"}.`
    } else if (energyAvg >= 3.5) {
      energyInsight = "Sua energia média está acima de 3 — um bom indicador de recuperação consistente."
    }
  }

  // Insight: sleep
  let sleepInsight: string | null = null
  if (hasEnoughData && sleepAvg < 2.5) {
    sleepInsight = "Sono frequentemente baixo — pode estar associado a menor prontidão nos treinos."
  } else if (hasEnoughData && sleepAvg >= 3.5) {
    sleepInsight = "Qualidade de sono consistente — fator positivo na sua recuperação."
  }

  return (
    <section className="insights-section" aria-labelledby="readiness-insights-heading">
      <h2 id="readiness-insights-heading" className="insights-section__title">Prontidão e recuperação</h2>

      <div className="stat-grid stat-grid--2 mb-4">
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{energyAvg.toFixed(1)}</div>
          <div className="stat-cell__label">Energia média</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{sleepAvg.toFixed(1)}</div>
          <div className="stat-cell__label">Sono médio</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{sorenessAvg.toFixed(1)}</div>
          <div className="stat-cell__label">Dor muscular média</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{motivationAvg.toFixed(1)}</div>
          <div className="stat-cell__label">Motivação média</div>
        </div>
      </div>

      {total > 0 && (
        <div className="card mb-4">
          <p className="text-sm font-semibold mb-2">Distribuição de prontidão</p>
          <div className="readiness-dist">
            <div className="readiness-dist__row">
              <span className="readiness-dist__label">Alta</span>
              <div className="readiness-dist__bar-track">
                <div
                  className="readiness-dist__bar readiness-dist__bar--high"
                  style={{ width: pct(stats.highReadinessCount) }}
                  aria-label={`Alta: ${pct(stats.highReadinessCount)}`}
                />
              </div>
              <span className="readiness-dist__pct">{pct(stats.highReadinessCount)}</span>
            </div>
            <div className="readiness-dist__row">
              <span className="readiness-dist__label">Moderada</span>
              <div className="readiness-dist__bar-track">
                <div
                  className="readiness-dist__bar readiness-dist__bar--moderate"
                  style={{ width: pct(stats.moderateReadinessCount) }}
                  aria-label={`Moderada: ${pct(stats.moderateReadinessCount)}`}
                />
              </div>
              <span className="readiness-dist__pct">{pct(stats.moderateReadinessCount)}</span>
            </div>
            <div className="readiness-dist__row">
              <span className="readiness-dist__label">Baixa</span>
              <div className="readiness-dist__bar-track">
                <div
                  className="readiness-dist__bar readiness-dist__bar--low"
                  style={{ width: pct(stats.lowReadinessCount) }}
                  aria-label={`Baixa: ${pct(stats.lowReadinessCount)}`}
                />
              </div>
              <span className="readiness-dist__pct">{pct(stats.lowReadinessCount)}</span>
            </div>
          </div>
        </div>
      )}

      {!hasEnoughData && (
        <p className="text-muted text-sm mb-4">
          Complete mais {min - checkIns.length} check-in{min - checkIns.length !== 1 ? "s" : ""} para ver insights de correlação.
        </p>
      )}

      {energyInsight && (
        <div className="card card--insight mb-3">
          <p className="text-sm">{energyInsight}</p>
        </div>
      )}
      {sleepInsight && (
        <div className="card card--insight mb-3">
          <p className="text-sm">{sleepInsight}</p>
        </div>
      )}
    </section>
  )
}
