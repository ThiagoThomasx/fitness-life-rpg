"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import {
  getNutritionGoal,
  saveNutritionGoal,
  getTodayNutritionLog,
  saveNutritionLog,
  getNutritionLogs,
  getNutritionStreak,
  getNutritionCount,
  NUTRITION_XP,
  DEFAULT_GOAL,
  type NutritionGoal,
  type NutritionLog,
} from "@/lib/nutrition"
import { checkAndEarnBadges } from "@/lib/badges"
import { addRewardEvent } from "@/lib/reward-events"
import { getWorkoutHistory } from "@/lib/workout-history"
import { getDiaryCount } from "@/lib/daily-log"
import { MOCK_CHARACTER } from "@/lib/mock/data"

// ── design tokens ──────────────────────────────────────────────
const C = {
  bg: "#181818",
  bgDeep: "#121212",
  border: "rgba(255,255,255,0.06)",
  accent: "#1db954",
  blue: "#3b82f6",
  gold: "#f59e0b",
  muted: "#6a6a6a",
  text: "#ffffff",
  sub: "#b3b3b3",
}

function card(extra?: React.CSSProperties): React.CSSProperties {
  return { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1rem 1.25rem", ...extra }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.75rem" }}>
      {children}
    </h3>
  )
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  const over = value > goal
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.75rem", color: C.sub }}>{label}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: over ? "#ef4444" : C.text }}>
          {value}g <span style={{ fontWeight: 400, color: C.muted }}>/ {goal}g</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: over ? "#ef4444" : color, borderRadius: 9999, transition: "width 0.4s ease" }} />
      </div>
    </div>
  )
}

function NumberInput({
  label, value, onChange, unit, min = 0, max = 9999,
}: {
  label: string; value: number; onChange: (v: number) => void; unit: string; min?: number; max?: number
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.5rem 0.75rem", gap: "0.375rem" }}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n) && n >= min && n <= max) onChange(n)
          }}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: "1rem", fontWeight: 700, minWidth: 0 }}
        />
        <span style={{ fontSize: "0.75rem", color: C.muted, flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  )
}

// ── Goal config ────────────────────────────────────────────────
function GoalSection({ goal, onSave }: { goal: NutritionGoal; onSave: (g: NutritionGoal) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<NutritionGoal>(goal)

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <section style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <SectionLabel>Metas diárias</SectionLabel>
          <button
            onClick={() => { setDraft(goal); setEditing(true) }}
            style={{ fontSize: "0.7rem", color: C.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            Editar
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {[
            { label: "Calorias", value: goal.calories, unit: "kcal", color: C.gold },
            { label: "Proteína", value: goal.protein_g, unit: "g", color: "#ef4444" },
            { label: "Carboidrato", value: goal.carbs_g, unit: "g", color: C.blue },
            { label: "Gordura", value: goal.fat_g, unit: "g", color: C.gold },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ background: C.bgDeep, borderRadius: 10, padding: "0.625rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.6rem", color: C.muted }}>{label}</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color }}>{value}</span>
              <span style={{ fontSize: "0.6rem", color: C.muted }}>{unit}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section style={card()}>
      <SectionLabel>Editar metas diárias</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <NumberInput label="Calorias (kcal)" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} unit="kcal" min={500} max={6000} />
        <NumberInput label="Proteína (g)" value={draft.protein_g} onChange={(v) => setDraft({ ...draft, protein_g: v })} unit="g" />
        <NumberInput label="Carboidrato (g)" value={draft.carbs_g} onChange={(v) => setDraft({ ...draft, carbs_g: v })} unit="g" />
        <NumberInput label="Gordura (g)" value={draft.fat_g} onChange={(v) => setDraft({ ...draft, fat_g: v })} unit="g" />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleSave} style={{ flex: 1, background: C.accent, color: "#000", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 800, fontSize: "0.875rem", cursor: "pointer" }}>
            Salvar metas
          </button>
          <button onClick={() => setEditing(false)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Today's log ────────────────────────────────────────────────
function TodayLogSection({
  goal, todayLog, onSaved,
}: {
  goal: NutritionGoal
  todayLog: NutritionLog | null
  onSaved: (log: NutritionLog) => void
}) {
  const { applyDiaryXp } = useCharacterStore()
  const { pushReward } = useRewardStore()
  const { refreshBadges } = useBadgeStore()
  const character = useCharacterStore((s) => s.character) ?? MOCK_CHARACTER

  const [calories, setCalories] = useState(todayLog?.calories ?? 0)
  const [protein, setProtein] = useState(todayLog?.protein_g ?? 0)
  const [carbs, setCarbs] = useState(todayLog?.carbs_g ?? 0)
  const [fat, setFat] = useState(todayLog?.fat_g ?? 0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (todayLog) {
      setCalories(todayLog.calories)
      setProtein(todayLog.protein_g)
      setCarbs(todayLog.carbs_g)
      setFat(todayLog.fat_g)
    }
  }, [todayLog])

  function handleSave() {
    const isFirstLog = todayLog === null
    const log = saveNutritionLog({ calories, protein_g: protein, carbs_g: carbs, fat_g: fat }, isFirstLog)

    if (isFirstLog) {
      applyDiaryXp(NUTRITION_XP)
      const ev = addRewardEvent({ type: "xp", title: `+${NUTRITION_XP} XP`, subtitle: "Nutrição registrada!", value: String(NUTRITION_XP), icon: "🥗" })
      pushReward(ev)

      const history = getWorkoutHistory()
      const newlyEarned = checkAndEarnBadges({
        workoutCount: history.length,
        totalPrs: history.reduce((s, w) => s + w.prsCount, 0),
        level: character.level,
        diaryCount: getDiaryCount(),
        strength: character.strength,
        agility: character.agility,
        dexterity: character.dexterity,
        constitution: character.constitution,
        vitality: character.vitality,
        nutritionCount: getNutritionCount(),
        nutritionStreak: getNutritionStreak(),
      })
      refreshBadges()
      for (const badge of newlyEarned) {
        const bev = addRewardEvent({ type: "badge", title: badge.name, subtitle: badge.description, icon: badge.icon })
        pushReward(bev)
      }
    }

    setSaved(true)
    onSaved(log)
    setTimeout(() => setSaved(false), 2000)
  }

  const caloriesPct = goal.calories > 0 ? Math.min((calories / goal.calories) * 100, 100) : 0
  const caloriesOver = calories > goal.calories

  return (
    <section style={card()}>
      <SectionLabel>Registro de hoje</SectionLabel>

      {/* Calorie ring summary */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#282828" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32" fill="none"
              stroke={caloriesOver ? "#ef4444" : C.gold}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - caloriesPct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s ease", transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: caloriesOver ? "#ef4444" : C.text }}>{calories}</span>
            <span style={{ fontSize: "0.5rem", color: C.muted }}>kcal</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.8rem", color: C.sub, marginBottom: "0.25rem" }}>
            Meta: <strong style={{ color: C.text }}>{goal.calories} kcal</strong>
          </div>
          <div style={{ fontSize: "0.75rem", color: caloriesOver ? "#ef4444" : C.muted }}>
            {caloriesOver ? `${calories - goal.calories} kcal acima da meta` : `${goal.calories - calories} kcal restantes`}
          </div>
          {todayLog && (
            <div style={{ fontSize: "0.65rem", color: C.accent, marginTop: "0.25rem", fontWeight: 700 }}>
              ✓ XP já concedido hoje
            </div>
          )}
        </div>
      </div>

      {/* Macro bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1.25rem" }}>
        <MacroBar label="Proteína" value={protein} goal={goal.protein_g} color="#ef4444" />
        <MacroBar label="Carboidrato" value={carbs} goal={goal.carbs_g} color={C.blue} />
        <MacroBar label="Gordura" value={fat} goal={goal.fat_g} color={C.gold} />
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
        <NumberInput label="Calorias" value={calories} onChange={setCalories} unit="kcal" max={10000} />
        <NumberInput label="Proteína" value={protein} onChange={setProtein} unit="g" />
        <NumberInput label="Carboidrato" value={carbs} onChange={setCarbs} unit="g" />
        <NumberInput label="Gordura" value={fat} onChange={setFat} unit="g" />
      </div>

      <button
        onClick={handleSave}
        style={{
          width: "100%", background: saved ? "#16a34a" : C.accent, color: "#000",
          border: "none", borderRadius: 12, padding: "0.875rem",
          fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.2s",
        }}
      >
        {saved ? "✓ Salvo!" : todayLog ? "Atualizar registro" : `Registrar (+${NUTRITION_XP} XP)`}
      </button>
    </section>
  )
}

// ── History ────────────────────────────────────────────────────
function HistorySection({ logs }: { logs: NutritionLog[] }) {
  if (logs.length === 0) return null
  const recent = logs.slice(0, 7)
  return (
    <section style={card()}>
      <SectionLabel>Histórico recente</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {recent.map((log) => (
          <div key={log.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: C.bgDeep, borderRadius: 10, padding: "0.625rem 0.875rem" }}>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>🥗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text }}>{log.date}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>
                P: {log.protein_g}g · C: {log.carbs_g}g · G: {log.fat_g}g
              </div>
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 800, color: C.gold }}>{log.calories} kcal</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function NutricaoPage() {
  const router = useRouter()
  const [goal, setGoal] = useState<NutritionGoal>(DEFAULT_GOAL)
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null)
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [streak, setStreak] = useState(0)

  const reload = useCallback(() => {
    setGoal(getNutritionGoal())
    setTodayLog(getTodayNutritionLog())
    setLogs(getNutritionLogs())
    setStreak(getNutritionStreak())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  function handleGoalSave(g: NutritionGoal) {
    saveNutritionGoal(g)
    setGoal(g)
  }

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ paddingBottom: "0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: C.muted, fontSize: "1.25rem", cursor: "pointer", padding: 0 }}
          >
            ←
          </button>
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: C.text, margin: 0 }}>🥗 Nutrição</h1>
            <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0.25rem 0 0" }}>
              Macros e calorias do dia
            </p>
          </div>
        </div>
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.625rem",
          background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)",
          borderRadius: 12, padding: "0.625rem 1rem",
        }}>
          <span style={{ fontSize: "1.25rem" }}>🔥</span>
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.accent }}>
              {streak} dia{streak !== 1 ? "s" : ""} consecutivo{streak !== 1 ? "s" : ""}!
            </div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>
              {streak >= 7 ? "Badge Nutricionista desbloqueado!" : `${7 - streak} dia${7 - streak !== 1 ? "s" : ""} para o badge Nutricionista`}
            </div>
          </div>
        </div>
      )}

      <GoalSection goal={goal} onSave={handleGoalSave} />
      <TodayLogSection goal={goal} todayLog={todayLog} onSaved={(log) => { setTodayLog(log); reload() }} />
      <HistorySection logs={logs} />
    </div>
  )
}
