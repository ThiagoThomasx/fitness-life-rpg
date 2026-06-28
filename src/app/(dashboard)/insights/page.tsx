"use client"

import { useEffect, useState } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { computeInsights, type InsightsData } from "@/lib/insights"
import { useRouter } from "next/navigation"
import { getPreferences, GOAL_LABELS, GOAL_ICONS } from "@/lib/preferences"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { NutritionWeek } from "@/lib/insights"
import { SkeletonPageLoader } from "@/components/ui/Skeleton"

// ── design tokens ──────────────────────────────────────────────
const C = {
  bg: "#181818",
  bgDeep: "#121212",
  border: "rgba(255,255,255,0.06)",
  accent: "#1db954",
  gold: "#f59e0b",
  purple: "#8b5cf6",
  muted: "#6a6a6a",
  text: "#ffffff",
  subtext: "#b3b3b3",
}

const PIE_COLORS = ["#1db954", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444", "#ec4899"]

// ── helpers ────────────────────────────────────────────────────
function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "1rem 1.25rem",
    ...extra,
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: "0.7rem",
      color: C.muted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
      marginBottom: "0.875rem",
    }}>
      {children}
    </h3>
  )
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: C.bgDeep,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "0.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
    }}>
      <span style={{ fontSize: "0.6rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.375rem", fontWeight: 800, color: color ?? C.text }}>
        {value}
      </span>
    </div>
  )
}

const TooltipStyle: React.CSSProperties = {
  background: "#1e1e1e",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: "0.75rem",
  color: C.text,
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem",
      padding: "1.5rem 1rem",
      color: C.muted,
      textAlign: "center",
    }}>
      <span style={{ fontSize: "2rem" }}>{icon}</span>
      <span style={{ fontSize: "0.8rem" }}>{message}</span>
    </div>
  )
}

// ── sections ───────────────────────────────────────────────────

function SummarySection({ data, totalXp }: { data: InsightsData; totalXp: number }) {
  return (
    <section style={card()}>
      <SectionLabel>Resumo geral</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <StatBox label="Treinos" value={data.totalWorkouts} color={C.accent} />
        <StatBox label="XP Total" value={totalXp.toLocaleString("pt-BR")} color={C.gold} />
        <StatBox label="Recordes (PRs)" value={data.totalPrs} color={C.purple} />
        <StatBox label="Diários" value={data.totalXpDiary / 10} color={C.subtext} />
      </div>
    </section>
  )
}

function WeekVolumeSection({ data }: { data: InsightsData }) {
  if (data.weekVolumes.length === 0) {
    return (
      <section style={card()}>
        <SectionLabel>Volume semanal</SectionLabel>
        <EmptyState icon="📊" message="Complete treinos para ver o volume por semana" />
      </section>
    )
  }
  return (
    <section style={card()}>
      <SectionLabel>Volume semanal (treinos)</SectionLabel>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data.weekVolumes} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={TooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(v) => [`${v} treinos`, "Volume"]}
          />
          <Bar dataKey="workouts" fill={C.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

function ExerciseLoadSection({ data }: { data: InsightsData }) {
  if (data.topExerciseLoads.length === 0) {
    return (
      <section style={card()}>
        <SectionLabel>Evolução de carga</SectionLabel>
        <EmptyState icon="📈" message="Registre ao menos 2 sessões do mesmo exercício para ver a evolução" />
      </section>
    )
  }

  const colors = [C.accent, C.gold, C.purple]

  return (
    <section style={card()}>
      <SectionLabel>Evolução de carga (top exercícios)</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {data.topExerciseLoads.map((ex, i) => (
          <div key={ex.exerciseId}>
            <div style={{ fontSize: "0.75rem", color: C.subtext, marginBottom: "0.5rem", fontWeight: 600 }}>
              {ex.exerciseName}
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={ex.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip
                  contentStyle={TooltipStyle}
                  formatter={(v) => [`${v} kg`, "Carga máx."]}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke={colors[i]}
                  strokeWidth={2}
                  dot={{ fill: colors[i], r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </section>
  )
}

function DayFrequencySection({ data }: { data: InsightsData }) {
  const total = data.dayFrequency.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <section style={card()}>
        <SectionLabel>Frequência por dia</SectionLabel>
        <EmptyState icon="📅" message="Complete treinos para ver seus dias favoritos" />
      </section>
    )
  }
  return (
    <section style={card()}>
      <SectionLabel>Dias mais treinados</SectionLabel>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data.dayFrequency} barSize={22}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={TooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(v) => [`${v} treinos`, ""]}
          />
          <Bar dataKey="count" fill={C.purple} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

function CategorySection({ data }: { data: InsightsData }) {
  if (data.categoryDist.length === 0) {
    return (
      <section style={card()}>
        <SectionLabel>Distribuição por categoria</SectionLabel>
        <EmptyState icon="🥧" message="Complete treinos para ver a distribuição" />
      </section>
    )
  }
  return (
    <section style={card()}>
      <SectionLabel>Distribuição por categoria</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <ResponsiveContainer width={130} height={130}>
          <PieChart>
            <Pie
              data={data.categoryDist}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={2}
              dataKey="value"
            >
              {data.categoryDist.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TooltipStyle} formatter={(v, name) => [`${v}x`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {data.categoryDist.map((cat, i) => (
            <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: "0.75rem", color: C.subtext, flex: 1 }}>{cat.name}</span>
              <span style={{ fontSize: "0.75rem", color: C.text, fontWeight: 700 }}>{cat.value}x</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PrsSection({ data }: { data: InsightsData }) {
  if (data.recentPrs.length === 0) {
    return (
      <section style={card()}>
        <SectionLabel>PRs recentes</SectionLabel>
        <EmptyState icon="🏆" message="Bata seu primeiro recorde pessoal para vê-lo aqui" />
      </section>
    )
  }
  return (
    <section style={card()}>
      <SectionLabel>PRs recentes</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.recentPrs.map((pr, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: 10,
            padding: "0.625rem 0.875rem",
          }}>
            <span style={{ fontSize: "1.125rem" }}>🏆</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text }}>{pr.exerciseName}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>{pr.date}</div>
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 800, color: C.gold }}>{pr.weight_kg} kg</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AttributesSection({ character }: { character: ReturnType<typeof useCharacterStore.getState>["character"] }) {
  if (!character) return null

  const attrs = [
    { key: "strength" as const, label: "Força", icon: "💪", color: "#ef4444" },
    { key: "agility" as const, label: "Agilidade", icon: "⚡", color: "#f59e0b" },
    { key: "dexterity" as const, label: "Destreza", icon: "🎯", color: "#3b82f6" },
    { key: "constitution" as const, label: "Constituição", icon: "🛡️", color: "#8b5cf6" },
    { key: "vitality" as const, label: "Vitalidade", icon: "❤️", color: "#ec4899" },
  ]

  const data = attrs.map((a) => ({ name: a.label, value: character[a.key] as number, color: a.color }))
  const maxVal = Math.max(...data.map((d) => d.value), 10)

  return (
    <section style={card()}>
      <SectionLabel>Atributos do personagem</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {data.map((attr) => {
          const pct = Math.min((attr.value / maxVal) * 100, 100)
          return (
            <div key={attr.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: C.subtext }}>{attr.name}</span>
                <span style={{ fontSize: "0.75rem", color: C.text, fontWeight: 700 }}>
                  {attr.value.toFixed(1)}
                </span>
              </div>
              <div style={{ height: 5, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: attr.color,
                  borderRadius: 9999,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TagsSection({ data }: { data: InsightsData }) {
  if (data.tagFrequency.length === 0) {
    return (
      <section style={card()}>
        <SectionLabel>Tags do diário</SectionLabel>
        <EmptyState icon="🏷️" message="Preencha o diário para ver as suas tags mais frequentes" />
      </section>
    )
  }
  const max = data.tagFrequency[0].count

  return (
    <section style={card()}>
      <SectionLabel>Tags mais frequentes</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.tagFrequency.map((t) => (
          <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ fontSize: "0.75rem", color: C.subtext, width: 80, flexShrink: 0 }}>{t.tag}</span>
            <div style={{ flex: 1, height: 6, background: "#282828", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(t.count / max) * 100}%`,
                background: C.accent,
                borderRadius: 9999,
              }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: C.muted, width: 24, textAlign: "right", flexShrink: 0 }}>{t.count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function NutritionSection({ weeks }: { weeks: NutritionWeek[]; goalCalories: number }) {
  const router = useRouter()

  if (weeks.length === 0) {
    return (
      <section style={{ ...card(), background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", cursor: "pointer" }} onClick={() => router.push("/nutricao")}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <span style={{ fontSize: "2rem" }}>🥗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.text, marginBottom: "0.2rem" }}>Nutrição</div>
            <div style={{ fontSize: "0.7rem", color: C.muted, lineHeight: 1.5 }}>
              Registre suas refeições para ver insights de macros e calorias aqui.
            </div>
          </div>
          <span style={{ color: C.muted }}>›</span>
        </div>
      </section>
    )
  }

  const chartData = weeks.map((w) => ({ week: w.week, kcal: w.avgCalories, proteína: w.totalProtein, carboidrato: w.totalCarbs, gordura: w.totalFat }))

  return (
    <section style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
        <SectionLabel>Nutrição semanal</SectionLabel>
        <button onClick={() => router.push("/nutricao")} style={{ fontSize: "0.7rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
          Registrar →
        </button>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" kcal" />
          <Tooltip
            contentStyle={TooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(v) => [`${v} kcal`, "Média diária"]}
          />
          <Bar dataKey="kcal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.875rem" }}>
        {[
          { label: "Proteína total", key: "proteína" as const, color: "#ef4444", unit: "g" },
          { label: "Carboidrato total", key: "carboidrato" as const, color: "#3b82f6", unit: "g" },
          { label: "Gordura total", key: "gordura" as const, color: C.gold, unit: "g" },
        ].map(({ label, key, color, unit }) => {
          const total = chartData.reduce((s, w) => s + w[key], 0)
          return (
            <div key={label} style={{ background: "#121212", borderRadius: 10, padding: "0.625rem 0.5rem" }}>
              <div style={{ fontSize: "0.55rem", color: C.muted, marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color }}>{total}{unit}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── page ───────────────────────────────────────────────────────
function PersonalizationBanner() {
  const [goal, setGoal] = useState<{ label: string; icon: string } | null>(null)

  useEffect(() => {
    const prefs = getPreferences()
    if (prefs.onboardingCompleted) {
      setGoal({ label: GOAL_LABELS[prefs.goal], icon: GOAL_ICONS[prefs.goal] })
    }
  }, [])

  if (!goal) {
    return (
      <a
        href="/preferencias"
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "rgba(29,185,84,0.06)",
          border: "1px solid rgba(29,185,84,0.2)",
          borderRadius: 12,
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>✨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.accent }}>
            Personalize seus insights
          </div>
          <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: 2 }}>
            Defina suas preferências para ver dados mais relevantes
          </div>
        </div>
        <span style={{ color: C.accent }}>›</span>
      </a>
    )
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem",
      background: "rgba(29,185,84,0.06)",
      border: "1px solid rgba(29,185,84,0.15)",
      borderRadius: 12,
    }}>
      <span style={{ fontSize: "1.25rem" }}>{goal.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", color: C.muted }}>Seu objetivo</div>
        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.accent }}>{goal.label}</div>
      </div>
      <a href="/preferencias" style={{ fontSize: "0.65rem", color: C.muted, textDecoration: "none" }}>
        Editar →
      </a>
    </div>
  )
}

export default function InsightsPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const [data, setData] = useState<InsightsData | null>(null)

  useEffect(() => {
    setData(computeInsights())
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const totalXp = Math.floor(character.total_xp)

  if (!data) {
    return <SkeletonPageLoader />
  }

  return (
    <div style={{
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
      maxWidth: 600,
      margin: "0 auto",
    }}>
      {/* header */}
      <div style={{ paddingBottom: "0.25rem" }}>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: C.text, margin: 0 }}>
          📊 Insights
        </h1>
        <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0.25rem 0 0" }}>
          Sua evolução em dados
        </p>
      </div>

      <PersonalizationBanner />
      <SummarySection data={data} totalXp={totalXp} />
      <WeekVolumeSection data={data} />
      <ExerciseLoadSection data={data} />
      <DayFrequencySection data={data} />
      <CategorySection data={data} />
      <PrsSection data={data} />
      <AttributesSection character={character} />
      <TagsSection data={data} />
      <NutritionSection weeks={data.nutritionWeeks} goalCalories={data.nutritionGoalCalories} />
    </div>
  )
}
