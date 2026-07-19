"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getBodyProgressEntries, type BodyProgressEntry } from "@/lib/body-progress"
import { summarizeWeightTrend, summarizeMeasurementTrend, type BodyMetricSummary } from "@/lib/body-progress-trends"
import { getCheckIns } from "@/lib/readiness-check-ins"
import type { WorkoutReadinessCheckIn } from "@/lib/readiness-check-ins"
import { getWorkoutHistory } from "@/lib/workout-history"
import {
  summarizeWellnessTrends,
  computeSleepEnergyAssociation,
  computeStressFrequencyAssociation,
  type WellnessMetricSummary,
} from "@/lib/wellness-trends"
import { CHART_COLORS } from "@/lib/theme-colors"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "./ChartCard"
import { BodyPeriodComparisonCard } from "./BodyPeriodComparisonCard"

const TREND_LABELS: Record<BodyMetricSummary["trend"], string> = {
  increasing: "Aumentando",
  stable: "Estável",
  decreasing: "Reduzindo",
  irregular: "Oscilando",
  insufficient_data: "Dados insuficientes",
}

const MEASUREMENT_LABELS: Record<string, string> = {
  waistCm: "Cintura", abdomenCm: "Abdômen", chestCm: "Peito", hipsCm: "Quadril",
  rightArmCm: "Braço direito", leftArmCm: "Braço esquerdo",
  rightThighCm: "Coxa direita", leftThighCm: "Coxa esquerda",
  rightCalfCm: "Panturrilha direita", leftCalfCm: "Panturrilha esquerda", neckCm: "Pescoço",
}

const WELLNESS_METRIC_LABELS: Record<WellnessMetricSummary["metric"], string> = {
  energy: "Energia", soreness: "Dor muscular", sleepQuality: "Qualidade do sono",
  motivation: "Motivação", stress: "Estresse", mood: "Humor", sleepHours: "Horas de sono",
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-")
  return `${day}/${month}`
}

function measurementsPresent(entries: BodyProgressEntry[]): string[] {
  const fields = new Set<string>()
  for (const entry of entries) {
    if (!entry.measurements) continue
    for (const key of Object.keys(entry.measurements)) {
      if (key !== "custom") fields.add(key)
    }
  }
  return Array.from(fields)
}

export function BodyWellnessSection() {
  const [entries, setEntries] = useState<BodyProgressEntry[]>([])
  const [checkIns, setCheckIns] = useState<WorkoutReadinessCheckIn[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setEntries(getBodyProgressEntries())
    setCheckIns(getCheckIns())
    setLoaded(true)
  }, [])

  if (!loaded) return null

  const hasBodyData = entries.length > 0
  const hasWellnessData = checkIns.length > 0

  if (!hasBodyData && !hasWellnessData) return null

  const weightSummary = hasBodyData ? summarizeWeightTrend(entries) : null
  const measurementFields = measurementsPresent(entries)
  const measurementSummaries = measurementFields.map((field) => summarizeMeasurementTrend(entries, field))
  const wellnessSummaries = hasWellnessData ? summarizeWellnessTrends(checkIns) : []
  const sleepEnergyAssociation = hasWellnessData ? computeSleepEnergyAssociation(checkIns) : null
  const stressFrequencyAssociation = hasWellnessData
    ? computeStressFrequencyAssociation(checkIns, getWorkoutHistory())
    : null

  const weightChartData = entries
    .filter((e) => e.weightKg !== undefined)
    .map((e) => ({ date: formatDate(e.recordedAt), weight: e.weightKg }))

  return (
    <section>
      <h2 className="section-label" style={{ marginBottom: "0.75rem" }}>Corpo e bem-estar</h2>

      <div className="insights-chart-grid">
        <section className="card">
          <ChartHeader title="Peso corporal" description="Registros ao longo do tempo, em kg" />
          {weightChartData.length === 0 ? (
            <EmptyChart icon="⚖️" title="Sem registros de peso" description="Adicione um registro no Perfil para ver o gráfico aqui" ctaLabel="Ir para o Perfil" ctaHref="/perfil" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Peso"]} />
                  <Line type="monotone" dataKey="weight" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              {weightSummary && weightSummary.trend !== "insufficient_data" && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 8 }}>
                  Tendência recente: {TREND_LABELS[weightSummary.trend]}
                </p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <ChartHeader title="Bem-estar recente" description="Médias a partir dos check-ins de prontidão" />
          {wellnessSummaries.every((s) => s.sampleSize === 0) ? (
            <EmptyChart icon="🌤️" title="Sem check-ins ainda" description="Faça check-ins antes dos treinos para ver médias aqui" />
          ) : (
            <div className="stat-grid stat-grid--3">
              {wellnessSummaries
                .filter((s) => s.sampleSize > 0)
                .map((s) => (
                  <div className="stat-cell" key={s.metric}>
                    <div className="stat-cell__value numeric">
                      {s.average !== undefined ? s.average.toFixed(1) : "—"}
                    </div>
                    <div className="stat-cell__label">{WELLNESS_METRIC_LABELS[s.metric]}</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      {measurementSummaries.length > 0 && (
        <section className="card" style={{ marginTop: "0.75rem" }}>
          <ChartHeader title="Medidas" description="Primeiro registro comparado ao mais recente" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {measurementSummaries.map((summary) => (
              <div key={summary.metric} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{MEASUREMENT_LABELS[summary.metric] ?? summary.metric}</span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                  {summary.firstValue !== undefined && summary.latestValue !== undefined
                    ? `${summary.firstValue} cm → ${summary.latestValue} cm`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasBodyData && (
        <div style={{ marginTop: "0.75rem" }}>
          <BodyPeriodComparisonCard entries={entries} />
        </div>
      )}

      {(sleepEnergyAssociation || stressFrequencyAssociation) && (
        <section className="card" style={{ marginTop: "0.75rem" }}>
          <ChartHeader title="Associações no seu histórico" description="Coincidências observadas — não indicam causa" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {sleepEnergyAssociation && (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{sleepEnergyAssociation.message}</p>
            )}
            {stressFrequencyAssociation && (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{stressFrequencyAssociation.message}</p>
            )}
          </div>
        </section>
      )}
    </section>
  )
}
