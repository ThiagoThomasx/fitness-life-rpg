"use client"

import type { ProgressReport } from "@/lib/analytics/progress"
import type { ExerciseGrowthEntry } from "@/lib/exercise-records"
import type { MonthlySessionCount } from "@/lib/analytics/consistency"
import { formatPercent, formatMonthLabel } from "./analytics-ui"

type HighlightsPanelProps = {
  progress: ProgressReport
  stagnant: ExerciseGrowthEntry[]
  bestMonth: MonthlySessionCount | null
}

function formatConsistency(percent: number | null): string {
  return percent === null ? "—" : `${percent}%`
}

/**
 * Painel Destaques — resumo de período no formato literal do exemplo da
 * spec ("Últimos 30 dias / Treinos: 18 / Consistência: 92% / Volume: +14% /
 * Carga: +9% / Recordes: 7 / Maior evolução: X / Menor frequência: Y"), mais
 * exercícios esquecidos (estagnados) e o melhor mês do período — nenhum
 * número novo é calculado aqui, tudo vem pronto de `ProgressReport`/
 * `ConsistencyReport`/`getStagnantExercisesInPeriod`. Não existe uma métrica
 * de "maior queda" nem "melhores semanas" nos motores atuais — usar o melhor
 * MÊS real (`ConsistencyReport.bestMonth`) em vez de inventar um dado que o
 * motor não produz.
 */
export function HighlightsPanel({ progress, stagnant, bestMonth }: HighlightsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="stat-grid stat-grid--3">
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{progress.sessionsCompleted}</div>
          <div className="stat-cell__label">Treinos</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatConsistency(progress.consistencyPercent)}</div>
          <div className="stat-cell__label">Consistência</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{progress.recordsCount}</div>
          <div className="stat-cell__label">Recordes</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatPercent(progress.volumeChangePercent)}</div>
          <div className="stat-cell__label">Volume</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric">{formatPercent(progress.loadChangePercent)}</div>
          <div className="stat-cell__label">Carga</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell__value numeric" style={{ fontSize: "var(--text-sm)" }}>
            {progress.leastFrequentMuscleGroup?.label ?? "—"}
          </div>
          <div className="stat-cell__label">Menor frequência</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <span className="text-xs text-muted">Maior evolução</span>
          <span className="text-sm font-semibold text-primary">
            {progress.topEvolvingExercise?.exerciseName ?? "Sem dado suficiente ainda"}
          </span>
        </div>
        <div className="target-card" style={{ textAlign: "left", cursor: "default" }}>
          <span className="text-xs text-muted">Melhor mês</span>
          <span className="text-sm font-semibold text-primary">
            {bestMonth ? `${formatMonthLabel(bestMonth.label)} — ${bestMonth.completedSessions} sessões` : "Sem dado suficiente ainda"}
          </span>
        </div>
      </div>

      <section>
        <h3 className="section-label">Exercícios esquecidos</h3>
        {stagnant.length === 0 ? (
          <p className="text-xs text-muted">Nenhum exercício estagnado identificado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stagnant.map((entry) => (
              <div key={entry.exerciseId} className="exercise-record-card">
                <span className="text-sm font-semibold text-primary">{entry.exerciseName}</span>
                <span className="text-xs text-muted">Variação de {formatPercent(entry.deltaPercent)} desde a última evolução</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
