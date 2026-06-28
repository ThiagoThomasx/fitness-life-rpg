"use client"

import { useState, useEffect } from "react"
import { getDailyLogs, createDailyLog, updateDailyLog, deleteDailyLog, DAILY_LOG_XP, type DailyLogEntry } from "@/lib/daily-log"
import { extractTags } from "@/lib/auto-tags"
import { checkAndEarnBadges } from "@/lib/badges"
import { addRewardEvent } from "@/lib/reward-events"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { getWorkoutHistory } from "@/lib/workout-history"

const MOODS = [
  { emoji: "😔", label: "Ruim" },
  { emoji: "😐", label: "Ok" },
  { emoji: "😊", label: "Bem" },
  { emoji: "😁", label: "Ótimo" },
  { emoji: "🔥", label: "Top" },
]

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function EnergyStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.375rem" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} style={{
          background: "none", border: "none", fontSize: "1.375rem",
          cursor: onChange ? "pointer" : "default", opacity: n <= value ? 1 : 0.25, padding: 0,
        }}>⭐</button>
      ))}
    </div>
  )
}

function MoodPicker({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {MOODS.map((m) => (
        <button key={m.emoji} type="button" onClick={() => onChange?.(m.emoji)} title={m.label} style={{
          background: value === m.emoji ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${value === m.emoji ? "rgba(29,185,84,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 10, padding: "0.4rem 0.6rem", fontSize: "1.25rem",
          cursor: onChange ? "pointer" : "default", lineHeight: 1,
        }}>{m.emoji}</button>
      ))}
    </div>
  )
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span style={{
      background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.25)",
      borderRadius: 9999, padding: "2px 10px", fontSize: "0.7rem", color: "#1db954", fontWeight: 600,
    }}>#{tag}</span>
  )
}

function LogCard({ log, onEdit, onDelete, isToday }: { log: DailyLogEntry; onEdit?: () => void; onDelete?: () => void; isToday?: boolean }) {
  return (
    <div style={{
      background: "#181818", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "1rem 1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#6a6a6a" }}>
            {isToday ? `Hoje às ${formatTime(log.createdAt)}` : formatDate(log.date)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "1rem" }}>{log.mood}</span>
          <span style={{
            background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.2)",
            borderRadius: 9999, padding: "1px 8px", fontSize: "0.7rem", color: "#1db954", fontWeight: 700,
          }}>+{log.xpEarned} XP</span>
          {onEdit && (
            <button onClick={onEdit} style={{
              background: "none", border: "none", color: "#6a6a6a", cursor: "pointer",
              fontSize: "0.75rem", padding: "2px 4px",
            }}>✏️</button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{
              background: "none", border: "none", color: "#6a6a6a", cursor: "pointer",
              fontSize: "0.75rem", padding: "2px 4px",
            }}>🗑️</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: log.notes ? "0.5rem" : 0 }}>
        <EnergyStars value={log.energyLevel} />
        <span style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>💤 {log.sleepHours}h</span>
      </div>

      {log.notes && (
        <p style={{ fontSize: "0.8rem", color: "#b3b3b3", lineHeight: 1.5, margin: "0.5rem 0 0" }}>{log.notes}</p>
      )}

      {log.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
          {log.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}
    </div>
  )
}

function EntryForm({
  initial,
  isFirst,
  onSave,
  onCancel,
}: {
  initial?: DailyLogEntry
  isFirst: boolean
  onSave: (data: { energyLevel: number; sleepHours: number; mood: string; notes: string }) => void
  onCancel?: () => void
}) {
  const [energyLevel, setEnergyLevel] = useState(initial?.energyLevel ?? 3)
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours ?? 7)
  const [mood, setMood] = useState(initial?.mood ?? "😊")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const previewTags = extractTags(notes)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ energyLevel, sleepHours, mood, notes })
  }

  return (
    <section style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem" }}>
      <div style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
        {initial ? "Editar entrada" : isFirst ? "Registrar dia de hoje" : "Nova entrada de hoje"}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.5rem" }}>Energia</label>
          <EnergyStars value={energyLevel} onChange={setEnergyLevel} />
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.5rem" }}>Humor</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.5rem" }}>
            Horas de sono: <strong style={{ color: "#ffffff" }}>{sleepHours}h</strong>
          </label>
          <input type="range" min={3} max={12} step={0.5} value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#1db954" }} />
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.5rem" }}>Notas (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi seu dia? Como se sentiu?" rows={3}
            style={{
              width: "100%", background: "#282828", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "0.625rem 0.75rem", color: "#ffffff", fontSize: "0.875rem",
              resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
            }} />
        </div>

        {previewTags.length > 0 && (
          <div>
            <div style={{ fontSize: "0.7rem", color: "#6a6a6a", marginBottom: "0.375rem" }}>Tags detectadas</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {previewTags.map((t) => <TagChip key={t} tag={t} />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" style={{
            flex: 1, background: "#1db954", color: "#000", border: "none", borderRadius: 10,
            padding: "0.75rem", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
          }}>
            {initial ? "Atualizar" : isFirst ? `Salvar (+${DAILY_LOG_XP} XP)` : "Adicionar entrada"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "0.75rem", color: "#b3b3b3", fontSize: "0.875rem", cursor: "pointer",
            }}>Cancelar</button>
          )}
        </div>
      </form>
    </section>
  )
}

export default function DiarioPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { character, applyDiaryXp } = useCharacterStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const refreshBadges = useBadgeStore((s) => s.refreshBadges)

  const [todayLogs, setTodayLogs] = useState<DailyLogEntry[]>([])
  const [pastLogs, setPastLogs] = useState<DailyLogEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<DailyLogEntry | null>(null)
  const [saved, setSaved] = useState(false)

  function reload() {
    const all = getDailyLogs()
    setTodayLogs(all.filter((l) => l.date === today))
    setPastLogs(all.filter((l) => l.date !== today))
  }

  useEffect(() => {
    reload()
    // Show form automatically if no entry today
    const all = getDailyLogs()
    if (!all.some((l) => l.date === today)) {
      setShowForm(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSave(data: { energyLevel: number; sleepHours: number; mood: string; notes: string }) {
    const tags = extractTags(data.notes)
    const isFirstEntry = todayLogs.length === 0

    if (editingLog) {
      updateDailyLog(editingLog.id, { ...data, tags })
      setEditingLog(null)
      setShowForm(false)
      reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return
    }

    const entry = createDailyLog({
      date: today,
      ...data,
      tags,
      xpEarned: isFirstEntry ? DAILY_LOG_XP : 0,
    })

    if (isFirstEntry) {
      applyDiaryXp(DAILY_LOG_XP)
      pushReward(addRewardEvent({
        type: 'xp', title: 'Diário Registrado', subtitle: 'Entrada do dia salva',
        value: `+${DAILY_LOG_XP} XP`, icon: '📓',
      }))

      const char = character ?? MOCK_CHARACTER
      const workouts = getWorkoutHistory()
      const allLogs = getDailyLogs()
      const newBadges = checkAndEarnBadges({
        workoutCount: workouts.length,
        totalPrs: workouts.reduce((a, w) => a + (w.prsCount ?? 0), 0),
        level: char.level, diaryCount: allLogs.length,
        strength: char.strength, agility: char.agility, dexterity: char.dexterity,
        constitution: char.constitution, vitality: char.vitality,
      })
      for (const badge of newBadges) {
        pushReward(addRewardEvent({
          type: 'badge', title: 'Badge Desbloqueada!', subtitle: badge.description,
          value: badge.name, icon: badge.icon,
        }))
      }
      refreshBadges()
    }

    void entry
    setShowForm(false)
    reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remover esta entrada?")) return
    deleteDailyLog(id)
    reload()
  }

  function handleEdit(log: DailyLogEntry) {
    setEditingLog(log)
    setShowForm(true)
  }

  const isFirstEntry = todayLogs.length === 0

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>📓 Diário</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!showForm && (
            <button onClick={() => { setEditingLog(null); setShowForm(true) }} style={{
              background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)",
              borderRadius: 8, padding: "0.375rem 0.75rem", color: "#1db954",
              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
            }}>
              {isFirstEntry ? "+ Registrar hoje" : "+ Nova entrada"}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <EntryForm
          initial={editingLog ?? undefined}
          isFirst={isFirstEntry}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingLog(null) }}
        />
      )}

      {saved && (
        <div style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)", borderRadius: 10, padding: "0.625rem 1rem", color: "#1db954", fontSize: "0.875rem", fontWeight: 700 }}>
          ✓ Diário salvo!
        </div>
      )}

      {/* Today's entries */}
      {todayLogs.length > 0 && !showForm && (
        <section>
          <h3 style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
            Hoje · {todayLogs.length} entrada{todayLogs.length > 1 ? "s" : ""}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {todayLogs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                isToday
                onEdit={() => handleEdit(log)}
                onDelete={() => handleDelete(log.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past entries */}
      {pastLogs.length > 0 && (
        <section>
          <h3 style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
            Histórico
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pastLogs.map((log) => <LogCard key={log.id} log={log} />)}
          </div>
        </section>
      )}

      {todayLogs.length === 0 && pastLogs.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6a6a6a", fontSize: "0.875rem" }}>
          Nenhuma entrada ainda. Registre seu primeiro dia!
        </div>
      )}
    </div>
  )
}
