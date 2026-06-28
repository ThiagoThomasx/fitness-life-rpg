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

// ── tokens ─────────────────────────────────────────────────────
const C = {
  bg0: "#121212",
  bg1: "#1a1a1a",
  bg2: "#202020",
  bg3: "#282828",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  accent: "#1db954",
  accentMuted: "rgba(29,185,84,0.12)",
  gold: "#f59e0b",
  goldMuted: "rgba(245,158,11,0.12)",
  purple: "#8b5cf6",
  purpleMuted: "rgba(139,92,246,0.12)",
  blue: "#3b82f6",
  blueMuted: "rgba(59,130,246,0.10)",
  muted: "#6a6a6a",
  text: "#ffffff",
  sub: "#b3b3b3",
}

const PIE_COLORS = [C.accent, C.gold, C.purple, C.blue, "#ef4444", "#ec4899"]

const TooltipStyle: React.CSSProperties = {
  background: "#1e1e1e",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: "0.75rem",
  color: C.text,
}

// ── helpers ────────────────────────────────────────────────────
function premiumCard(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: C.bg1,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "1.25rem",
    ...extra,
  }
}

function ChartHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h3 style={{
        fontSize: "0.95rem",
        fontWeight: 700,
        color: C.text,
        margin: 0,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: "0.72rem", color: C.muted, margin: "0.25rem 0 0", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  )
}

function EmptyChart({ icon, title, description, ctaLabel, ctaHref }: {
  icon: string
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.625rem",
      padding: "2.5rem 1rem",
      textAlign: "center",
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: C.bg3,
        border: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.625rem",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.sub }}>{title}</div>
        <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{description}</div>
      </div>
      {ctaLabel && ctaHref && (
        <a href={ctaHref} style={{
          marginTop: 4,
          fontSize: "0.75rem",
          fontWeight: 700,
          color: C.accent,
          textDecoration: "none",
          padding: "6px 16px",
          border: `1px solid ${C.accentMuted}`,
          borderRadius: 9999,
          background: C.accentMuted,
        }}>
          {ctaLabel}
        </a>
      )}
    </div>
  )
}

// ── metric card ────────────────────────────────────────────────
function MetricCard({
  icon, label, value, sub, color, tint,
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  color: string
  tint: string
}) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: color,
        borderRadius: "14px 14px 0 0",
        opacity: 0.8,
      }} />
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: tint,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.625rem", fontWeight: 800, color: C.text, lineHeight: 1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 3 }}>{sub}</div>
        )}
      </div>
      <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
        {label}
      </div>
    </div>
  )
}

// ── header ─────────────────────────────────────────────────────
function InsightsHeader({
  data,
  totalXp,
  goal,
}: {
  data: InsightsData
  totalXp: number
  goal: { label: string; icon: string } | null
}) {
  const weekWorkouts = data.weekVolumes.at(-1)?.workouts ?? 0

  return (
    <div style={{
      background: `linear-gradient(160deg, rgba(29,185,84,0.22) 0%, rgba(18,18,18,0) 60%)`,
      border: `1px solid rgba(29,185,84,0.15)`,
      borderRadius: 20,
      padding: "1.5rem 1.25rem 1.25rem",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(29,185,84,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: "0.65rem", color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "0.375rem" }}>
          Análise de evolução
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.03em", lineHeight: 1 }}>
          Insights
        </h1>
        <p style={{ fontSize: "0.8rem", color: C.sub, margin: "0.375rem 0 1.25rem", lineHeight: 1.5 }}>
          Sua evolução em dados
        </p>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "0.5rem 0.75rem",
          }}>
            <span style={{ fontSize: "0.9rem" }}>📅</span>
            <div>
              <div style={{ fontSize: "0.6rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Esta semana</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.text }}>{weekWorkouts} treino{weekWorkouts !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "0.5rem 0.75rem",
          }}>
            <span style={{ fontSize: "0.9rem" }}>⭐</span>
            <div>
              <div style={{ fontSize: "0.6rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>XP total</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.gold }}>{totalXp.toLocaleString("pt-BR")}</div>
            </div>
          </div>
          {goal && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: C.accentMuted,
              border: "1px solid rgba(29,185,84,0.2)",
              borderRadius: 10,
              padding: "0.5rem 0.75rem",
            }}>
              <span style={{ fontSize: "0.9rem" }}>{goal.icon}</span>
              <div>
                <div style={{ fontSize: "0.6rem", color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>Objetivo</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.accent }}>{goal.label}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── summary cards ──────────────────────────────────────────────
function SummarySection({ data, totalXp }: { data: InsightsData; totalXp: number }) {
  const cards = [
    { icon: "🏋️", label: "Treinos", value: data.totalWorkouts, sub: "sessões registradas", color: C.accent, tint: C.accentMuted },
    { icon: "⭐", label: "XP Total", value: totalXp.toLocaleString("pt-BR"), sub: "pontos de experiência", color: C.gold, tint: C.goldMuted },
    { icon: "🏆", label: "Recordes (PRs)", value: data.totalPrs, sub: "recordes pessoais", color: C.purple, tint: C.purpleMuted },
    { icon: "📓", label: "Diários", value: Math.floor(data.totalXpDiary / 10), sub: "entradas no diário", color: C.blue, tint: C.blueMuted },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
      {cards.map((c) => (
        <MetricCard key={c.label} {...c} />
      ))}
    </div>
  )
}

// ── narrative / reading ────────────────────────────────────────
function NarrativeSection({ data }: { data: InsightsData }) {
  const weekWorkouts = data.weekVolumes.at(-1)?.workouts ?? 0
  const topDay = data.dayFrequency.slice().sort((a, b) => b.count - a.count)[0]
  const hasEnough = data.totalWorkouts >= 3

  if (!hasEnough) {
    return (
      <section style={{ ...premiumCard(), borderColor: "rgba(29,185,84,0.15)", background: "rgba(29,185,84,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
          <span style={{ fontSize: "1.25rem" }}>🤖</span>
          <div style={{ fontSize: "0.65rem", color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Leitura da semana
          </div>
        </div>
        <p style={{ fontSize: "0.825rem", color: C.sub, lineHeight: 1.7, margin: 0 }}>
          Complete mais treinos para que eu possa gerar uma leitura personalizada da sua evolução. Preciso de pelo menos 3 sessões registradas.
        </p>
      </section>
    )
  }

  const lines: string[] = []
  if (weekWorkouts > 0) {
    lines.push(`Você treinou ${weekWorkouts} dia${weekWorkouts !== 1 ? "s" : ""} nesta semana.`)
  }
  if (topDay) {
    lines.push(`Seu dia favorito para treinar é ${topDay.day} (${topDay.count} sessões no histórico).`)
  }
  if (data.totalPrs > 0) {
    lines.push(`Você acumulou ${data.totalPrs} recorde${data.totalPrs !== 1 ? "s" : ""} pessoal${data.totalPrs !== 1 ? "is" : ""} no total.`)
  }
  lines.push(data.totalWorkouts >= 10 ? "Parabéns pela consistência!" : "Continue treinando para desbloquear mais insights.")

  return (
    <section style={{ ...premiumCard(), borderColor: "rgba(29,185,84,0.15)", background: "rgba(29,185,84,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: C.accentMuted,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.9rem",
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontSize: "0.65rem", color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Leitura da semana
          </div>
          <div style={{ fontSize: "0.7rem", color: C.muted }}>Gerada com base nos seus dados</div>
        </div>
      </div>
      <p style={{ fontSize: "0.825rem", color: C.sub, lineHeight: 1.7, margin: 0 }}>
        {lines.join(" ")}
      </p>
    </section>
  )
}

// ── charts ─────────────────────────────────────────────────────
function WeekVolumeSection({ data }: { data: InsightsData }) {
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Volume semanal" description="Número de treinos registrados por semana" />
      {data.weekVolumes.length === 0 ? (
        <EmptyChart icon="📊" title="Sem dados" description="Complete treinos para ver o volume semanal" ctaLabel="Iniciar treino" ctaHref="/treinos" />
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data.weekVolumes} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v} treinos`, "Volume"]} />
            <Bar dataKey="workouts" fill={C.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}

function ExerciseLoadSection({ data }: { data: InsightsData }) {
  const colors = [C.accent, C.gold, C.purple]
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Evolução de carga" description="Progressão do peso máximo nos seus exercícios principais" />
      {data.topExerciseLoads.length === 0 ? (
        <EmptyChart icon="📈" title="Sem dados suficientes" description="Registre ao menos 2 sessões do mesmo exercício para ver a evolução de carga" ctaLabel="Ir para treinos" ctaHref="/treinos" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {data.topExerciseLoads.map((ex, i) => (
            <div key={ex.exerciseId}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: 9999, background: colors[i], flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", color: C.sub, fontWeight: 600 }}>{ex.exerciseName}</span>
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={ex.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} unit="kg" />
                  <Tooltip contentStyle={TooltipStyle} formatter={(v) => [`${v} kg`, "Carga máx."]} />
                  <Line type="monotone" dataKey="maxWeight" stroke={colors[i]} strokeWidth={2.5} dot={{ fill: colors[i], r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function DayFrequencySection({ data }: { data: InsightsData }) {
  const total = data.dayFrequency.reduce((s, d) => s + d.count, 0)
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Dias mais treinados" description="Distribuição de frequência por dia da semana" />
      {total === 0 ? (
        <EmptyChart icon="📅" title="Sem dados" description="Complete treinos para ver seus dias favoritos" />
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.dayFrequency} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v} treinos`, ""]} />
            <Bar dataKey="count" fill={C.purple} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}

function CategorySection({ data }: { data: InsightsData }) {
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Distribuição por categoria" description="Proporção de treinos por tipo de atividade" />
      {data.categoryDist.length === 0 ? (
        <EmptyChart icon="🥧" title="Sem dados" description="Complete treinos para ver a distribuição por categoria" />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={data.categoryDist} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                {data.categoryDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TooltipStyle} formatter={(v, name) => [`${v}x`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.categoryDist.map((cat, i) => (
              <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: 9999, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: "0.775rem", color: C.sub, flex: 1 }}>{cat.name}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: C.text }}>{cat.value}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function PrsSection({ data }: { data: InsightsData }) {
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Recordes pessoais" description="Seus últimos PRs registrados nos exercícios" />
      {data.recentPrs.length === 0 ? (
        <EmptyChart icon="🏆" title="Nenhum recorde ainda" description="Bata seu primeiro recorde pessoal para vê-lo aqui" ctaLabel="Treinar agora" ctaHref="/treinos" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {data.recentPrs.map((pr, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              background: C.goldMuted,
              border: "1px solid rgba(245,158,11,0.18)",
              borderRadius: 12,
              padding: "0.75rem 1rem",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(245,158,11,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem",
                flexShrink: 0,
              }}>
                🏆
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.825rem", fontWeight: 700, color: C.text }}>{pr.exerciseName}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: 2 }}>{pr.date}</div>
              </div>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: C.gold }}>{pr.weight_kg} kg</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AttributesSection({ character }: { character: ReturnType<typeof useCharacterStore.getState>["character"] }) {
  if (!character) return null

  const attrs = [
    { key: "strength" as const, label: "Força", icon: "💪", color: "#ef4444" },
    { key: "agility" as const, label: "Agilidade", icon: "⚡", color: C.gold },
    { key: "dexterity" as const, label: "Destreza", icon: "🎯", color: C.blue },
    { key: "constitution" as const, label: "Constituição", icon: "🛡️", color: C.purple },
    { key: "vitality" as const, label: "Vitalidade", icon: "❤️", color: "#ec4899" },
  ]

  const data = attrs.map((a) => ({ ...a, value: character[a.key] as number }))
  const maxVal = Math.max(...data.map((d) => d.value), 10)

  return (
    <section style={premiumCard()}>
      <ChartHeader title="Atributos do personagem" description="Seus pontos de atributo acumulados com o treino" />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {data.map((attr) => {
          const pct = Math.min((attr.value / maxVal) * 100, 100)
          return (
            <div key={attr.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem" }}>{attr.icon}</span>
                  <span style={{ fontSize: "0.775rem", color: C.sub }}>{attr.label}</span>
                </div>
                <span style={{ fontSize: "0.775rem", fontWeight: 800, color: C.text }}>
                  {attr.value.toFixed(1)}
                </span>
              </div>
              <div style={{ height: 6, background: C.bg3, borderRadius: 9999, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: attr.color,
                  borderRadius: 9999,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
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
  if (data.tagFrequency.length === 0) return null
  const max = data.tagFrequency[0].count
  return (
    <section style={premiumCard()}>
      <ChartHeader title="Tags do diário" description="Suas emoções e temas mais frequentes nas anotações" />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {data.tagFrequency.map((t) => (
          <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.775rem", color: C.sub, width: 84, flexShrink: 0 }}>{t.tag}</span>
            <div style={{ flex: 1, height: 6, background: C.bg3, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(t.count / max) * 100}%`,
                background: `linear-gradient(90deg, ${C.accent}, ${C.blue})`,
                borderRadius: 9999,
              }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: C.muted, width: 20, textAlign: "right", flexShrink: 0 }}>{t.count}</span>
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
      <section
        style={{ ...premiumCard(), background: C.blueMuted, border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer" }}
        onClick={() => router.push("/nutricao")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "rgba(59,130,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.375rem",
            flexShrink: 0,
          }}>
            🥗
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>Nutrição</div>
            <div style={{ fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
              Registre suas refeições para ver insights de macros e calorias
            </div>
          </div>
          <span style={{ color: C.muted }}>›</span>
        </div>
      </section>
    )
  }

  const chartData = weeks.map((w) => ({
    week: w.week,
    kcal: w.avgCalories,
    proteína: w.totalProtein,
    carboidrato: w.totalCarbs,
    gordura: w.totalFat,
  }))

  return (
    <section style={premiumCard()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <ChartHeader title="Nutrição semanal" description="Média calórica diária por semana" />
        <button onClick={() => router.push("/nutricao")} style={{
          fontSize: "0.72rem", color: C.blue, background: "none", border: "none",
          cursor: "pointer", fontWeight: 700, flexShrink: 0,
        }}>
          Registrar →
        </button>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" kcal" />
          <Tooltip contentStyle={TooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v} kcal`, "Média diária"]} />
          <Bar dataKey="kcal" fill={C.blue} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
        {[
          { label: "Proteína", key: "proteína" as const, color: "#ef4444" },
          { label: "Carboidrato", key: "carboidrato" as const, color: C.blue },
          { label: "Gordura", key: "gordura" as const, color: C.gold },
        ].map(({ label, key, color }) => {
          const total = chartData.reduce((s, w) => s + w[key], 0)
          return (
            <div key={label} style={{
              background: C.bg3, borderRadius: 10, padding: "0.75rem",
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: "0.6rem", color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 800, color }}>{total}g</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── page ───────────────────────────────────────────────────────
export default function InsightsPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const [data, setData] = useState<InsightsData | null>(null)
  const [goal, setGoal] = useState<{ label: string; icon: string } | null>(null)

  useEffect(() => {
    setData(computeInsights())
    const prefs = getPreferences()
    if (prefs.onboardingCompleted) {
      setGoal({ label: GOAL_LABELS[prefs.goal], icon: GOAL_ICONS[prefs.goal] })
    }
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const totalXp = Math.floor(character.total_xp)

  if (!data) return <SkeletonPageLoader />

  const hasAnyData = data.totalWorkouts > 0

  return (
    <div style={{
      padding: "1rem",
      paddingBottom: "2rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
      maxWidth: 720,
      margin: "0 auto",
    }}>
      <InsightsHeader data={data} totalXp={totalXp} goal={goal} />

      {!hasAnyData ? (
        <section style={{
          ...premiumCard(),
          textAlign: "center",
          padding: "3rem 1.5rem",
          borderStyle: "dashed",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: C.text, margin: "0 0 0.5rem" }}>
            Seus dados aparecerão aqui
          </h2>
          <p style={{ fontSize: "0.8rem", color: C.muted, lineHeight: 1.7, margin: "0 auto 1.25rem", maxWidth: 320 }}>
            Complete seu primeiro treino para começar a ver sua evolução em gráficos e métricas personalizadas.
          </p>
          <a href="/treinos" style={{
            display: "inline-block",
            padding: "0.625rem 1.5rem",
            background: C.accent,
            color: "#000",
            fontWeight: 700,
            fontSize: "0.875rem",
            borderRadius: 9999,
            textDecoration: "none",
          }}>
            Iniciar primeiro treino
          </a>
        </section>
      ) : (
        <>
          <SummarySection data={data} totalXp={totalXp} />
          <NarrativeSection data={data} />

          {/* Desktop: two-column grid for charts */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0.875rem",
          }}>
            <WeekVolumeSection data={data} />
            <DayFrequencySection data={data} />
          </div>

          <ExerciseLoadSection data={data} />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0.875rem",
          }}>
            <CategorySection data={data} />
            <PrsSection data={data} />
          </div>

          <AttributesSection character={character} />
          <TagsSection data={data} />
          <NutritionSection weeks={data.nutritionWeeks} goalCalories={data.nutritionGoalCalories} />
        </>
      )}
    </div>
  )
}
