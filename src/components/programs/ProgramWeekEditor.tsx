"use client"

import { useState } from "react"
import { WEEKDAY_LABELS, type TrainingProgramSession, type TrainingProgramWeek, type Weekday } from "@/lib/training-programs"
import { ProgramSessionPicker } from "./ProgramSessionPicker"

type ProgramWeekEditorProps = {
  weeks: TrainingProgramWeek[]
  onChange: (weeks: TrainingProgramWeek[]) => void
}

// Segunda a domingo, na ordem que o usuário espera ver a semana.
const WEEKDAY_DISPLAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addWeek(weeks: TrainingProgramWeek[]): TrainingProgramWeek[] {
  const nextNumber = Math.max(0, ...weeks.map((w) => w.weekNumber)) + 1
  return [...weeks, { id: `week-${uniqueSuffix()}`, weekNumber: nextNumber, sessions: [] }]
}

export function ProgramWeekEditor({ weeks, onChange }: ProgramWeekEditorProps) {
  const [pickerTarget, setPickerTarget] = useState<{ weekId: string; weekday: Weekday | "flexible" } | null>(null)

  function updateWeek(weekId: string, updater: (week: TrainingProgramWeek) => TrainingProgramWeek) {
    onChange(weeks.map((w) => (w.id === weekId ? updater(w) : w)))
  }

  function addSession(weekId: string, weekday: Weekday | "flexible", session: Omit<TrainingProgramSession, "id" | "dayIndex" | "preferredWeekday">) {
    updateWeek(weekId, (week) => ({
      ...week,
      sessions: [
        ...week.sessions,
        {
          ...session,
          id: `sess-${uniqueSuffix()}`,
          preferredWeekday: weekday === "flexible" ? undefined : weekday,
        },
      ],
    }))
    setPickerTarget(null)
  }

  function removeSession(weekId: string, sessionId: string) {
    updateWeek(weekId, (week) => ({ ...week, sessions: week.sessions.filter((s) => s.id !== sessionId) }))
  }

  function moveSessionToDay(weekId: string, sessionId: string, weekday: Weekday | "flexible") {
    updateWeek(weekId, (week) => ({
      ...week,
      sessions: week.sessions.map((s) =>
        s.id === sessionId ? { ...s, preferredWeekday: weekday === "flexible" ? undefined : weekday, dayIndex: undefined } : s
      ),
    }))
  }

  function toggleOptional(weekId: string, sessionId: string) {
    updateWeek(weekId, (week) => ({
      ...week,
      sessions: week.sessions.map((s) => (s.id === sessionId ? { ...s, isOptional: !s.isOptional } : s)),
    }))
  }

  function duplicateWeekLocal(week: TrainingProgramWeek) {
    const nextNumber = Math.max(0, ...weeks.map((w) => w.weekNumber)) + 1
    const copy: TrainingProgramWeek = {
      id: `week-${uniqueSuffix()}`,
      weekNumber: nextNumber,
      name: week.name,
      notes: week.notes,
      sessions: week.sessions.map((s) => ({
        ...s,
        id: `sess-${uniqueSuffix()}`,
        templateSnapshot: JSON.parse(JSON.stringify(s.templateSnapshot)),
      })),
    }
    onChange([...weeks, copy])
  }

  function flexibleSessions(week: TrainingProgramWeek) {
    return week.sessions.filter((s) => s.preferredWeekday === undefined && s.dayIndex === undefined)
  }

  function sessionsForWeekday(week: TrainingProgramWeek, weekday: Weekday) {
    return week.sessions.filter((s) => s.preferredWeekday === weekday)
  }

  function renderSession(week: TrainingProgramWeek, session: TrainingProgramSession) {
    return (
      <div key={session.id} className="target-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">
            {session.name}
            {session.isOptional && <span className="badge-pill badge-pill--level" style={{ marginLeft: "var(--space-2)" }}>opcional</span>}
          </span>
          <button type="button" className="icon-btn" onClick={() => removeSession(week.id, session.id)} aria-label={`Remover sessão ${session.name}`}>✕</button>
        </div>
        <div className="text-xs text-muted">
          {session.templateSnapshot.exerciseBlocks.length} exercício{session.templateSnapshot.exerciseBlocks.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: "var(--space-2)" }}>
          <select
            className="select"
            style={{ fontSize: "var(--text-xs)" }}
            value={session.preferredWeekday ?? "flexible"}
            onChange={(e) => moveSessionToDay(week.id, session.id, e.target.value === "flexible" ? "flexible" : (Number(e.target.value) as Weekday))}
            aria-label={`Mover ${session.name} para outro dia`}
          >
            <option value="flexible">Dia flexível</option>
            {WEEKDAY_DISPLAY_ORDER.map((day) => (
              <option key={day} value={day}>{WEEKDAY_LABELS[day]}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={session.isOptional} onChange={() => toggleOptional(week.id, session.id)} />
            Opcional
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {weeks.map((week) => (
        <div key={week.id} className="card">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-primary">Semana {week.weekNumber}{week.name ? ` — ${week.name}` : ""}</h4>
            <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => duplicateWeekLocal(week)}>
              Duplicar semana
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
              const sessions = sessionsForWeekday(week, weekday)
              return (
                <div key={weekday}>
                  <div className="flex items-center justify-between">
                    <span className="field-label" style={{ marginBottom: 0 }}>{WEEKDAY_LABELS[weekday]}</span>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)" }}
                      onClick={() => setPickerTarget({ weekId: week.id, weekday })}
                    >
                      + Sessão
                    </button>
                  </div>
                  <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
                    {sessions.map((s) => renderSession(week, s))}
                  </div>
                </div>
              )
            })}

            <div>
              <div className="flex items-center justify-between">
                <span className="field-label" style={{ marginBottom: 0 }}>Dia flexível</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)" }}
                  onClick={() => setPickerTarget({ weekId: week.id, weekday: "flexible" })}
                >
                  + Sessão
                </button>
              </div>
              <div className="flex flex-col gap-2" style={{ marginTop: "var(--space-2)" }}>
                {flexibleSessions(week).map((s) => renderSession(week, s))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--secondary" onClick={() => onChange(addWeek(weeks))}>
        + Adicionar semana
      </button>

      {pickerTarget && (
        <ProgramSessionPicker
          onPick={(session) => addSession(pickerTarget.weekId, pickerTarget.weekday, session)}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  )
}
