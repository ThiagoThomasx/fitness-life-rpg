"use client"

import { useState } from "react"
import { upsertCycleWeekAnnotation, CYCLE_WEEK_TYPE_LABELS, type CycleWeekType } from "@/lib/training-cycle-weeks"
import { countWeeksByType, buildWeekTypeTrendNote, type CycleWeekBreakdown } from "@/lib/training-cycle-week-summary"

const WEEK_TYPE_OPTIONS = Object.keys(CYCLE_WEEK_TYPE_LABELS) as CycleWeekType[]

const WEEK_TYPE_COLORS: Record<CycleWeekType, string> = {
  normal: "var(--color-text-muted)",
  recovery: "var(--color-accent)",
  test: "var(--color-warning)",
  transition: "var(--color-text-secondary)",
}

interface CycleWeeksSectionProps {
  cycleId: string
  weeks: CycleWeekBreakdown[]
  onAnnotationChange: () => void
}

export function CycleWeeksSection({ cycleId, weeks, onAnnotationChange }: CycleWeeksSectionProps) {
  const [classifyingWeek, setClassifyingWeek] = useState<string | null>(null)

  const counts = countWeeksByType(weeks)
  const trendNote = buildWeekTypeTrendNote(weeks)

  function handleClassify(weekStartDate: string, type: CycleWeekType, notes?: string) {
    upsertCycleWeekAnnotation({ cycleId, weekStartDate, type, notes })
    setClassifyingWeek(null)
    onAnnotationChange()
  }

  if (weeks.length === 0) return null

  return (
    <section className="card">
      <h3 className="section-label">Semanas do ciclo</h3>

      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
        {weeks.length} semana{weeks.length !== 1 ? "s" : ""} no total
        {counts.recovery > 0 && ` · ${counts.recovery} de recuperação`}
        {counts.test > 0 && ` · ${counts.test} de teste`}
        {counts.transition > 0 && ` · ${counts.transition} de transição`}
      </div>

      {trendNote && (
        <div style={{
          marginTop: "0.625rem", padding: "0.5rem 0.75rem", borderRadius: 8,
          background: "var(--color-bg-subtle)", fontSize: "0.75rem", color: "var(--color-text-secondary)",
        }}>
          {trendNote}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "0.875rem" }}>
        {weeks.map((week) => (
          <div key={week.startDate} style={{
            border: "1px solid var(--color-border-subtle)", borderRadius: 10, padding: "0.625rem 0.75rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Semana {week.weekNumber}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                  {week.startDate} — {week.endDate}
                </div>
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: WEEK_TYPE_COLORS[week.type] }}>
                {CYCLE_WEEK_TYPE_LABELS[week.type]}
              </span>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: 8, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              <span>{week.sessions} sessõe{week.sessions !== 1 ? "s" : ""}</span>
              <span>{Math.round(week.volumeKg).toLocaleString("pt-BR")} kg</span>
              {week.prs > 0 && <span>{week.prs} PR{week.prs !== 1 ? "s" : ""}</span>}
              {week.averageReadiness !== null && <span>Prontidão {week.averageReadiness.toFixed(1)}</span>}
            </div>

            {week.notes && (
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontStyle: "italic", marginTop: 6 }}>
                &ldquo;{week.notes}&rdquo;
              </div>
            )}

            {classifyingWeek === week.startDate ? (
              <ClassifyWeekForm
                initialType={week.type}
                initialNotes={week.notes}
                onSave={(type, notes) => handleClassify(week.startDate, type, notes)}
                onCancel={() => setClassifyingWeek(null)}
              />
            ) : (
              <button
                className="btn btn--ghost"
                onClick={() => setClassifyingWeek(week.startDate)}
                style={{ width: "100%", marginTop: 8, fontSize: "0.75rem", padding: "0.4rem 0" }}
              >
                {week.type === "normal" && !week.notes ? "Classificar semana" : "Editar classificação"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ClassifyWeekForm({
  initialType, initialNotes, onSave, onCancel,
}: {
  initialType: CycleWeekType
  initialNotes?: string
  onSave: (type: CycleWeekType, notes?: string) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<CycleWeekType>(initialType)
  const [notes, setNotes] = useState(initialNotes ?? "")

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {WEEK_TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid", borderColor: type === t ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: type === t ? "var(--color-accent-subtle)" : "transparent",
              color: type === t ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {CYCLE_WEEK_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Adicionar nota (opcional)"
        maxLength={200}
        rows={2}
        style={{
          width: "100%", padding: "0.5rem 0.625rem", borderRadius: 8, marginTop: 8,
          border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)",
          color: "var(--color-text-primary)", fontSize: "0.75rem", fontFamily: "inherit",
          resize: "vertical", boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn btn--primary" onClick={() => onSave(type, notes.trim() || undefined)} style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem 0" }}>
          Salvar
        </button>
        <button className="btn btn--ghost" onClick={onCancel} style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem 0" }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
