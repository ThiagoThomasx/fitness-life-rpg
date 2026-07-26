"use client"

import type { FatigueReport } from "@/lib/analytics/fatigue"
import type { RecoveryStatus } from "@/lib/workout-recovery"
import { ALL_MUSCLE_GROUPS } from "@/lib/training-load"
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups"
import { DIRECTION_LABELS, DIRECTION_ICON, directionBadgeClass } from "./analytics-ui"

type FatiguePanelProps = {
  fatigue: FatigueReport
}

const RECOVERY_STATUS_LABELS: Record<RecoveryStatus, string> = {
  recovered: "Recuperado",
  partial: "Recuperação parcial",
  fatigued: "Fatigado",
}

function recoveryBadgeClass(status: RecoveryStatus): string {
  if (status === "recovered") return "badge-pill badge-pill--accent"
  if (status === "partial") return "badge-pill badge-pill--level"
  return "badge-pill badge-pill--danger"
}

/**
 * Painel Recuperação — prontidão subjetiva (média de energia/sono/dor
 * muscular/motivação dos check-ins), estado de recuperação atual por grupo
 * muscular, tendência de carga e padrões observacionais cruzando os três
 * eixos (`fatigue.patterns`, já vem com evidência numérica — nunca
 * recalculada aqui). Nenhuma linguagem prescritiva/médica é adicionada nesta
 * camada de UI — só reproduz o texto observacional do motor.
 */
export function FatiguePanel({ fatigue }: FatiguePanelProps) {
  const { readiness, recoveryByMuscleGroup, loadTrend, patterns } = fatigue

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="section-label">Prontidão (check-ins)</h3>
        {readiness.totalCheckIns === 0 ? (
          <p className="text-xs text-muted">Nenhum check-in de prontidão registrado no período.</p>
        ) : (
          <div className="stat-grid stat-grid--3">
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.averageEnergy.toFixed(1)}</div>
              <div className="stat-cell__label">Energia média</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.averageSleep.toFixed(1)}</div>
              <div className="stat-cell__label">Sono médio</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.averageSoreness.toFixed(1)}</div>
              <div className="stat-cell__label">Dor muscular média</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.averageMotivation.toFixed(1)}</div>
              <div className="stat-cell__label">Motivação média</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.lowReadinessCount}</div>
              <div className="stat-cell__label">Check-ins de prontidão baixa</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value numeric">{readiness.totalCheckIns}</div>
              <div className="stat-cell__label">Total de check-ins</div>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="section-label" style={{ marginBottom: 0 }}>Tendência de carga (volume)</h3>
          <span className={directionBadgeClass(loadTrend)}>
            {DIRECTION_ICON[loadTrend]} {DIRECTION_LABELS[loadTrend]}
          </span>
        </div>
      </section>

      <section>
        <h3 className="section-label">Recuperação por grupo muscular</h3>
        <div className="flex flex-col gap-2">
          {ALL_MUSCLE_GROUPS.map((mg) => {
            const state = recoveryByMuscleGroup[mg]
            return (
              <div key={mg} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{MUSCLE_GROUP_LABELS[mg]}</span>
                  {state.hoursSinceTrained === null ? (
                    <span className="badge-pill badge-pill--level">Sem histórico</span>
                  ) : (
                    <span className={recoveryBadgeClass(state.status)}>{RECOVERY_STATUS_LABELS[state.status]}</span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {state.hoursSinceTrained === null
                    ? "Ainda não treinado."
                    : `${Math.round(state.recoveryPercent)}% recuperado, última sessão há ${Math.floor(state.hoursSinceTrained / 24)} dia(s).`}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {patterns.length > 0 && (
        <section>
          <h3 className="section-label">Padrões observados</h3>
          <div className="flex flex-col gap-2">
            {patterns.map((insight) => (
              <div key={insight.id} className="target-card" style={{ textAlign: "left", cursor: "default" }}>
                <span className="text-sm font-semibold text-primary">{insight.title}</span>
                <p className="text-xs text-muted">{insight.explanation}</p>
                <ul className="text-xs text-muted" style={{ marginTop: "var(--space-1)", paddingLeft: "var(--space-4)" }}>
                  {insight.evidence.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
