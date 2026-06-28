"use client"

import { useEffect, useState, useCallback } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useRewardStore } from "@/stores/useRewardStore"
import {
  getCurrentWeekPlan,
  saveWeeklyPlan,
  getWeeklyPlanProgress,
  getWeekStart,
  getDefaultGoals,
  PLAN_XP_REWARD,
} from "@/lib/weekly-plan"
import {
  createCampaign,
  abandonCampaign,
  syncCampaignProgress,
  CAMPAIGN_TEMPLATES,
} from "@/lib/campaigns"
import type { WeeklyPlan, WeeklyGoals, Campaign, WeeklyPlanProgress } from "@/types/planning"
import type { CampaignType } from "@/types/planning"
import { getPreferences, GOAL_LABELS, GOAL_ICONS } from "@/lib/preferences"
import { getWeeklyRoutineSuggestion, type WeeklyRoutineSuggestion } from "@/lib/recommendations"

const FOCUS_SUGGESTIONS = [
  "Consistência é minha prioridade",
  "Semana de força máxima",
  "Cardio e queima de gordura",
  "Recuperação ativa e mobilidade",
  "Semana de volume",
  "Equilíbrio entre treino e descanso",
]

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  )
}

function GoalRow({
  icon, label, current, target, onChangeTarget,
}: {
  icon: string; label: string; current: number; target: number
  onChangeTarget?: (v: number) => void
}) {
  const pct = Math.min(Math.round((current / Math.max(target, 1)) * 100), 100)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
      <span style={{ fontSize: "1.25rem", width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: "var(--font-bold)" }}>
            {current}/{target}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: "var(--color-border-subtle)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 9999,
              background: pct >= 100 ? "#1db954" : "var(--color-accent)",
              width: `${pct}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
      {onChangeTarget && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onChangeTarget(Math.max(1, target - 1))}
            style={btnSmallStyle}
          >-</button>
          <span style={{ fontSize: "var(--text-sm)", width: 20, textAlign: "center", fontWeight: "var(--font-bold)" }}>{target}</span>
          <button onClick={() => onChangeTarget(target + 1)} style={btnSmallStyle}>+</button>
        </div>
      )}
    </div>
  )
}

const btnSmallStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 9999,
  border: "1px solid var(--color-border-subtle)",
  background: "var(--color-bg-elevated)", color: "var(--color-text-primary)",
  cursor: "pointer", fontSize: "var(--text-sm)", display: "flex",
  alignItems: "center", justifyContent: "center", padding: 0,
}

function CampaignCard({ campaign, onAbandon }: { campaign: Campaign; onAbandon: (id: string) => void }) {
  const pct = Math.min(Math.round((campaign.currentValue / Math.max(campaign.targetValue, 1)) * 100), 100)
  const isComplete = campaign.status === "completed"
  const isAbandoned = campaign.status === "abandoned"

  const daysLeft = campaign.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="card card--sm" style={{
      opacity: isAbandoned ? 0.4 : 1,
      borderColor: isComplete ? "rgba(29,185,84,0.3)" : undefined,
      background: isComplete ? "rgba(29,185,84,0.04)" : undefined,
    }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{campaign.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: isComplete ? "var(--color-accent)" : "var(--color-text-primary)" }}>
              {campaign.name}
            </span>
            {isComplete ? (
              <span style={{ fontSize: "0.65rem", color: "#1db954", fontWeight: "var(--font-bold)", flexShrink: 0 }}>✓ Concluída</span>
            ) : daysLeft !== null ? (
              <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
                {daysLeft}d restantes
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: "2px 0 8px" }}>
            {campaign.description}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 9999, background: "var(--color-border-subtle)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 9999,
                background: isComplete ? "#1db954" : "var(--color-accent)",
                width: `${pct}%`, transition: "width 0.5s ease",
              }} />
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: "var(--font-bold)", color: "var(--color-text-muted)", flexShrink: 0 }}>
              {campaign.currentValue}/{campaign.targetValue} {campaign.unit}
            </span>
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            Recompensa: +{campaign.xpReward} XP
          </div>
        </div>
      </div>
      {!isComplete && !isAbandoned && (
        <button
          onClick={() => onAbandon(campaign.id)}
          style={{
            marginTop: 8, background: "transparent",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 6, padding: "3px 10px",
            fontSize: "0.65rem", color: "var(--color-text-muted)",
            cursor: "pointer", width: "100%",
          }}
        >
          Abandonar campanha
        </button>
      )}
    </div>
  )
}

export default function PlanoPage() {
  const applyDiaryXp = useCharacterStore((s) => s.applyDiaryXp)
  const pushReward = useRewardStore((s) => s.pushReward)

  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [progress, setProgress] = useState<WeeklyPlanProgress | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [tab, setTab] = useState<"semana" | "campanhas">("semana")
  const [editing, setEditing] = useState(false)
  const [focus, setFocus] = useState("")
  const [goals, setGoals] = useState<WeeklyGoals>(getDefaultGoals())
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [selectedCampaignType, setSelectedCampaignType] = useState<CampaignType>("gain_consistency")
  const [prevCompletedAt, setPrevCompletedAt] = useState<string | null>(null)
  const [routine, setRoutine] = useState<WeeklyRoutineSuggestion | null>(null)
  const [goalLabel, setGoalLabel] = useState<string>("")
  const [goalIcon, setGoalIcon] = useState<string>("")

  const load = useCallback(() => {
    const currentPlan = getCurrentWeekPlan()
    const prog = getWeeklyPlanProgress()
    const synced = syncCampaignProgress()
    setPlan(currentPlan)
    setProgress(prog)
    setCampaigns(synced)

    const prefs = getPreferences()
    setRoutine(getWeeklyRoutineSuggestion(prefs))
    setGoalLabel(GOAL_LABELS[prefs.goal])
    setGoalIcon(GOAL_ICONS[prefs.goal])

    if (currentPlan) {
      setFocus(currentPlan.focus)
      setGoals(currentPlan.goals)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (progress?.plan.completedAt && progress.plan.completedAt !== prevCompletedAt) {
      setPrevCompletedAt(progress.plan.completedAt)
      if (!prevCompletedAt) return
      applyDiaryXp(PLAN_XP_REWARD)
      pushReward({
        id: `plan-complete-${Date.now()}`,
        type: 'xp',
        title: 'Plano semanal concluído!',
        subtitle: `+${PLAN_XP_REWARD} XP`,
        icon: '📅',
        createdAt: new Date().toISOString(),
      })
    }
  }, [progress?.plan.completedAt, prevCompletedAt, applyDiaryXp, pushReward])

  const handleSavePlan = () => {
    const saved = saveWeeklyPlan(focus.trim() || "Semana de foco", goals)
    setPlan(saved)
    setProgress(getWeeklyPlanProgress())
    setEditing(false)
  }

  const handleAbandon = (id: string) => {
    abandonCampaign(id)
    load()
  }

  const handleCreateCampaign = () => {
    createCampaign(selectedCampaignType)
    setShowNewCampaign(false)
    load()
  }

  const weekStart = getWeekStart()
  const weekLabel = formatWeekLabel(weekStart)
  const hasPlan = !!plan

  const pct = progress ? Math.round(progress.completionPct) : 0
  const completedGoals = progress
    ? Object.values(progress.actual).filter((v, i) => {
        const keys = ["workouts", "diary", "nutrition", "missions"] as const
        return v >= (plan?.goals[keys[i]] ?? 0)
      }).length
    : 0
  const totalGoals = 4

  return (
    <div className="page-container">
      {/* Premium plan header card */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "1.25rem 1.25rem 1rem",
        marginBottom: "1rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background accent blur */}
        <div style={{
          position: "absolute", top: -24, right: -24,
          width: 120, height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,185,84,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Top row: label + ring */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Eyebrow */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: "0.6875rem", fontWeight: 600,
              color: "#1db954", letterSpacing: "0.06em",
              textTransform: "uppercase", marginBottom: 6,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
              Plano semanal
            </span>

            {/* Week label */}
            <h1 style={{
              fontSize: "1.25rem", fontWeight: 700,
              color: "var(--color-text-primary)",
              lineHeight: 1.2, margin: 0,
            }}>
              {weekLabel}
            </h1>

            {/* Goal tag */}
            {goalLabel && (
              <span style={{
                display: "inline-block", marginTop: 8,
                fontSize: "0.75rem", fontWeight: 500,
                color: "var(--color-text-muted)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6, padding: "2px 8px",
              }}>
                {goalIcon} {goalLabel}
              </span>
            )}
          </div>

          {/* Progress ring */}
          {progress && (
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ position: "relative", width: 52, height: 52 }}>
                <ProgressRing pct={pct} size={52} />
                <span style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6875rem", fontWeight: 700,
                  color: pct >= 100 ? "#1db954" : "var(--color-text-primary)",
                }}>
                  {pct}%
                </span>
              </div>
              <span style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                {completedGoals}/{totalGoals} metas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(["semana", "campanhas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "0.5rem", borderRadius: 10,
              border: "1px solid",
              borderColor: tab === t ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: tab === t ? "rgba(29,185,84,0.08)" : "transparent",
              color: tab === t ? "var(--color-accent)" : "var(--color-text-muted)",
              fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            {t === "semana" ? "📅 Semana" : "🏆 Campanhas"}
          </button>
        ))}
      </div>

      {tab === "semana" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Weekly Summary */}
          {progress && (
            <section className="card" style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", position: "relative", marginBottom: "0.5rem" }}>
                <ProgressRing pct={progress.completionPct} size={80} />
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: "var(--font-bold)", color: "var(--color-accent)" }}>
                    {progress.completionPct}%
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", marginBottom: 2 }}>
                {progress.isComplete ? "✅ Plano concluído!" : "Progresso da semana"}
              </div>
              {progress.isComplete && (
                <div style={{ fontSize: "0.7rem", color: "#1db954", fontWeight: "var(--font-bold)" }}>
                  +{PLAN_XP_REWARD} XP desbloqueados
                </div>
              )}
              {plan?.focus && (
                <div style={{
                  marginTop: 10, padding: "0.5rem 0.75rem",
                  background: "var(--color-bg-subtle)", borderRadius: 8,
                  fontSize: "0.75rem", color: "var(--color-text-muted)",
                  fontStyle: "italic",
                }}>
                  &ldquo;{plan.focus}&rdquo;
                </div>
              )}
            </section>
          )}

          {/* Goals Progress */}
          {progress && (
            <section className="card">
              <h3 className="section-label">Metas da semana</h3>
              <GoalRow icon="💪" label="Treinos" current={progress.actual.workouts} target={progress.plan.goals.workouts} />
              <GoalRow icon="📓" label="Entradas no diário" current={progress.actual.diary} target={progress.plan.goals.diary} />
              <GoalRow icon="🥗" label="Registros de nutrição" current={progress.actual.nutrition} target={progress.plan.goals.nutrition} />
              <GoalRow icon="⚡" label="Missões completas" current={progress.actual.missions} target={progress.plan.goals.missions} />
            </section>
          )}

          {/* Edit / Create Plan */}
          {(!hasPlan || editing) ? (
            <section className="card">
              <h3 className="section-label">{hasPlan ? "Editar plano" : "Definir plano da semana"}</h3>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: "var(--font-medium)", display: "block", marginBottom: 6 }}>
                  Foco da semana
                </label>
                <input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Ex: Consistência é minha prioridade"
                  maxLength={80}
                  style={{
                    width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10,
                    border: "1px solid var(--color-border-subtle)",
                    background: "var(--color-bg-subtle)",
                    color: "var(--color-text-primary)", fontSize: "var(--text-sm)",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {FOCUS_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFocus(s)}
                      style={{
                        padding: "3px 10px", borderRadius: 9999,
                        border: "1px solid var(--color-border-subtle)",
                        background: focus === s ? "rgba(29,185,84,0.1)" : "transparent",
                        color: focus === s ? "var(--color-accent)" : "var(--color-text-muted)",
                        fontSize: "0.65rem", cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: "var(--font-medium)", display: "block", marginBottom: 8 }}>
                  Metas semanais
                </label>
                <GoalRow icon="💪" label="Treinos" current={0} target={goals.workouts}
                  onChangeTarget={(v) => setGoals({ ...goals, workouts: v })} />
                <GoalRow icon="📓" label="Entradas no diário" current={0} target={goals.diary}
                  onChangeTarget={(v) => setGoals({ ...goals, diary: v })} />
                <GoalRow icon="🥗" label="Registros de nutrição" current={0} target={goals.nutrition}
                  onChangeTarget={(v) => setGoals({ ...goals, nutrition: v })} />
                <GoalRow icon="⚡" label="Missões" current={0} target={goals.missions}
                  onChangeTarget={(v) => setGoals({ ...goals, missions: v })} />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <button className="btn btn--primary" onClick={handleSavePlan} style={{ flex: 1 }}>
                  Salvar plano
                </button>
                {hasPlan && (
                  <button className="btn btn--ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                )}
              </div>
            </section>
          ) : (
            <button
              className="btn btn--ghost"
              onClick={() => setEditing(true)}
              style={{ width: "100%" }}
            >
              ✏️ Editar plano da semana
            </button>
          )}

          {!hasPlan && (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
              Defina seu plano acima para acompanhar o progresso da semana e ganhar <strong>+{PLAN_XP_REWARD} XP</strong> ao concluir!
            </div>
          )}

          {/* Suggested routine */}
          {routine && (
            <section className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <h3 className="section-label" style={{ marginBottom: 0 }}>Rotina sugerida</h3>
                <span style={{
                  fontSize: "0.65rem", color: "var(--color-accent)",
                  background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.25)",
                  borderRadius: 9999, padding: "2px 8px", fontWeight: "var(--font-bold)",
                }}>
                  {goalIcon} {goalLabel}
                </span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontStyle: "italic", marginBottom: "1rem" }}>
                {routine.focusSuggestion}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem", marginBottom: "0.875rem" }}>
                {routine.days.map((d) => (
                  <div key={d.dayIndex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: d.isRest ? "var(--color-bg-subtle)" : "rgba(29,185,84,0.12)",
                      border: `1px solid ${d.isRest ? "var(--color-border-subtle)" : "rgba(29,185,84,0.25)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem",
                    }}>
                      {d.workoutIcon}
                    </div>
                    <span style={{
                      fontSize: "0.55rem",
                      color: d.isRest ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                      textAlign: "center", lineHeight: 1.2,
                    }}>
                      {d.dayLabel}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {routine.days.filter((d) => !d.isRest).map((d) => (
                  <div key={d.dayIndex} style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    fontSize: "0.7rem", color: "var(--color-text-secondary)",
                  }}>
                    <span style={{ fontWeight: "var(--font-bold)", width: 28, flexShrink: 0 }}>{d.dayLabel}</span>
                    <span>{d.workoutIcon}</span>
                    <span>{d.suggestion}</span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: "0.875rem",
                padding: "0.625rem 0.75rem",
                background: "var(--color-bg-subtle)",
                borderRadius: 8,
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
              }}>
                💡 {routine.goalNote}
              </div>
              <a
                href="/preferencias"
                style={{
                  display: "block", textAlign: "center", marginTop: "0.75rem",
                  fontSize: "0.7rem", color: "var(--color-accent)",
                  textDecoration: "none",
                }}
              >
                Ajustar preferências →
              </a>
            </section>
          )}
        </div>
      )}

      {tab === "campanhas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Active campaigns */}
          {campaigns.filter((c) => c.status === "active").length > 0 && (
            <section>
              <h3 className="section-label">Campanhas ativas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {campaigns.filter((c) => c.status === "active").map((c) => (
                  <CampaignCard key={c.id} campaign={c} onAbandon={handleAbandon} />
                ))}
              </div>
            </section>
          )}

          {/* Completed campaigns */}
          {campaigns.filter((c) => c.status === "completed").length > 0 && (
            <section>
              <h3 className="section-label">Concluídas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {campaigns.filter((c) => c.status === "completed").map((c) => (
                  <CampaignCard key={c.id} campaign={c} onAbandon={handleAbandon} />
                ))}
              </div>
            </section>
          )}

          {campaigns.length === 0 && !showNewCampaign && (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎯</div>
              <div style={{ marginBottom: 4, fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                Nenhuma campanha ativa
              </div>
              <div>Crie uma campanha para definir objetivos de longo prazo e manter o foco!</div>
            </div>
          )}

          {/* New campaign form */}
          {showNewCampaign ? (
            <section className="card">
              <h3 className="section-label">Nova campanha</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {CAMPAIGN_TEMPLATES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setSelectedCampaignType(t.type)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.625rem 0.75rem", borderRadius: 10,
                      border: "1px solid",
                      borderColor: selectedCampaignType === t.type ? "var(--color-accent)" : "var(--color-border-subtle)",
                      background: selectedCampaignType === t.type ? "rgba(29,185,84,0.06)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)",
                        color: selectedCampaignType === t.type ? "var(--color-accent)" : "var(--color-text-primary)",
                      }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                        {t.description}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                        Meta: {t.targetValue} {t.unit}
                        {t.durationDays && ` · ${t.durationDays} dias`}
                        {" · "}+{t.xpReward} XP
                      </div>
                    </div>
                    {selectedCampaignType === t.type && (
                      <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn--primary" onClick={handleCreateCampaign} style={{ flex: 1 }}>
                  Iniciar campanha
                </button>
                <button className="btn btn--ghost" onClick={() => setShowNewCampaign(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
              </div>
            </section>
          ) : (
            <button
              className="btn btn--primary"
              onClick={() => setShowNewCampaign(true)}
              style={{ width: "100%" }}
            >
              + Nova campanha
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00")
  const end = new Date(weekStart + "T12:00:00")
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  return `${start.toLocaleDateString("pt-BR", opts)} – ${end.toLocaleDateString("pt-BR", opts)}`
}
