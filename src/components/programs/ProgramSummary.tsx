"use client"

import { getTrainingProgramStructuralAlerts, type TrainingProgramWeek } from "@/lib/training-programs"

type ProgramSummaryProps = {
  weeks: TrainingProgramWeek[]
}

export function ProgramSummary({ weeks }: ProgramSummaryProps) {
  const totalSessions = weeks.reduce((sum, w) => sum + w.sessions.length, 0)
  const optionalSessions = weeks.reduce((sum, w) => sum + w.sessions.filter((s) => s.isOptional).length, 0)
  const templatesUsed = new Set(
    weeks.flatMap((w) => w.sessions.map((s) => s.templateId).filter(Boolean))
  ).size
  const restDaysPerWeek = weeks.map((w) => {
    const occupiedDays = new Set(w.sessions.map((s) => s.preferredWeekday).filter((d) => d !== undefined))
    return 7 - occupiedDays.size
  })
  const avgRestDays = restDaysPerWeek.length > 0 ? (restDaysPerWeek.reduce((a, b) => a + b, 0) / restDaysPerWeek.length).toFixed(1) : "—"

  const alerts = getTrainingProgramStructuralAlerts({ weeks })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-2xl font-bold text-primary numeric">{weeks.length}</div>
          <div className="text-xs text-muted">semana{weeks.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-primary numeric">{totalSessions}</div>
          <div className="text-xs text-muted">sessões no total</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-primary numeric">{avgRestDays}</div>
          <div className="text-xs text-muted">dias de descanso/semana (média)</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-primary numeric">{templatesUsed}</div>
          <div className="text-xs text-muted">templates utilizados</div>
        </div>
      </div>

      {optionalSessions > 0 && (
        <p className="text-sm text-secondary">{optionalSessions} sessão(ões) marcada(s) como opcional.</p>
      )}

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="field-label">Avisos estruturais</span>
          {alerts.map((alert, idx) => (
            <div key={idx} className="alert alert--info" role="status">
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
