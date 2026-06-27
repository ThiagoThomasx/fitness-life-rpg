"use client"

import { useState, useEffect } from "react"
import { getDailyLogs, getTodayLog, saveDailyLog, DAILY_LOG_XP, type DailyLogEntry } from "@/lib/daily-log"
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

function EnergyStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.375rem" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.375rem",
            cursor: onChange ? "pointer" : "default",
            opacity: n <= value ? 1 : 0.25,
            padding: 0,
          }}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

function MoodPicker({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {MOODS.map((m) => (
        <button
          key={m.emoji}
          type="button"
          onClick={() => onChange?.(m.emoji)}
          title={m.label}
          style={{
            background: value === m.emoji ? "rgba(29,185,84,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${value === m.emoji ? "rgba(29,185,84,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            padding: "0.4rem 0.6rem",
            fontSize: "1.25rem",
            cursor: onChange ? "pointer" : "default",
            lineHeight: 1,
          }}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  )
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span
      style={{
        background: "rgba(29,185,84,0.1)",
        border: "1px solid rgba(29,185,84,0.25)",
        borderRadius: 9999,
        padding: "2px 10px",
        fontSize: "0.7rem",
        color: "#1db954",
        fontWeight: 600,
      }}
    >
      #{tag}
    </span>
  )
}

function LogCard({ log }: { log: DailyLogEntry }) {
  return (
    <div
      style={{
        background: "#181818",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "1rem 1.25rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#6a6a6a" }}>{formatDate(log.date)}</span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "1rem" }}>{log.mood}</span>
          <span
            style={{
              background: "rgba(29,185,84,0.1)",
              border: "1px solid rgba(29,185,84,0.2)",
              borderRadius: 9999,
              padding: "1px 8px",
              fontSize: "0.7rem",
              color: "#1db954",
              fontWeight: 700,
            }}
          >
            +{log.xpEarned} XP
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: log.notes ? "0.5rem" : 0 }}>
        <EnergyStars value={log.energyLevel} />
        <span style={{ fontSize: "0.75rem", color: "#6a6a6a" }}>💤 {log.sleepHours}h</span>
      </div>

      {log.notes && (
        <p style={{ fontSize: "0.8rem", color: "#b3b3b3", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
          {log.notes}
        </p>
      )}

      {log.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
          {log.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}
    </div>
  )
}

export default function DiarioPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { character, applyDiaryXp } = useCharacterStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const refreshBadges = useBadgeStore((s) => s.refreshBadges)

  const [todayLog, setTodayLog] = useState<DailyLogEntry | null>(null)
  const [history, setHistory] = useState<DailyLogEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)

  const [energyLevel, setEnergyLevel] = useState(3)
  const [sleepHours, setSleepHours] = useState(7)
  const [mood, setMood] = useState("😊")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const tl = getTodayLog()
    setTodayLog(tl)
    setHistory(getDailyLogs())
    if (!tl) {
      setShowForm(true)
    } else {
      setEnergyLevel(tl.energyLevel)
      setSleepHours(tl.sleepHours)
      setMood(tl.mood)
      setNotes(tl.notes)
    }
  }, [])

  const previewTags = extractTags(notes)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const tags = extractTags(notes)
    const isNew = !todayLog

    const entry = saveDailyLog({
      date: today,
      energyLevel,
      sleepHours,
      mood,
      notes,
      tags,
      xpEarned: DAILY_LOG_XP,
    })

    if (isNew) {
      applyDiaryXp(DAILY_LOG_XP)
      const xpEv = addRewardEvent({
        type: 'xp',
        title: 'Diário Registrado',
        subtitle: 'Entrada do dia salva',
        value: `+${DAILY_LOG_XP} XP`,
        icon: '📓',
      })
      pushReward(xpEv)

      const char = character ?? MOCK_CHARACTER
      const workouts = getWorkoutHistory()
      const logs = getDailyLogs()
      const newBadges = checkAndEarnBadges({
        workoutCount: workouts.length,
        totalPrs: workouts.reduce((a, w) => a + (w.prsCount ?? 0), 0),
        level: char.level,
        diaryCount: logs.length,
        strength: char.strength,
        agility: char.agility,
        dexterity: char.dexterity,
        constitution: char.constitution,
        vitality: char.vitality,
      })
      for (const badge of newBadges) {
        const ev = addRewardEvent({
          type: 'badge',
          title: 'Badge Desbloqueada!',
          subtitle: badge.description,
          value: badge.name,
          icon: badge.icon,
        })
        pushReward(ev)
      }
      refreshBadges()
    }

    setTodayLog(entry)
    setHistory(getDailyLogs())
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const pastLogs = history.filter((l) => l.date !== today)

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>📓 Diário</h1>
        {todayLog && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: "rgba(29,185,84,0.12)",
              border: "1px solid rgba(29,185,84,0.3)",
              borderRadius: 8,
              padding: "0.375rem 0.75rem",
              color: "#1db954",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Editar hoje
          </button>
        )}
      </div>

      {showForm && (
        <section style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            {todayLog ? "Editar entrada de hoje" : "Registrar dia de hoje"}
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              <input
                type="range"
                min={3}
                max={12}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#1db954" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "#b3b3b3", display: "block", marginBottom: "0.5rem" }}>Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como foi seu dia? Como se sentiu?"
                rows={3}
                style={{
                  width: "100%",
                  background: "#282828",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "0.625rem 0.75rem",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
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
              <button
                type="submit"
                style={{ flex: 1, background: "#1db954", color: "#000", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
              >
                {todayLog ? "Atualizar" : `Salvar (+${DAILY_LOG_XP} XP)`}
              </button>
              {todayLog && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.75rem", color: "#b3b3b3", fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {saved && (
        <div style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)", borderRadius: 10, padding: "0.625rem 1rem", color: "#1db954", fontSize: "0.875rem", fontWeight: 700 }}>
          ✓ Diário salvo!
        </div>
      )}

      {todayLog && !showForm && <LogCard log={todayLog} />}

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

      {history.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6a6a6a", fontSize: "0.875rem" }}>
          Nenhuma entrada ainda. Registre seu primeiro dia!
        </div>
      )}
    </div>
  )
}
