"use client"

import { useState } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartHeader, EmptyChart, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "@/components/insights/ChartCard"
import { CHART_COLORS } from "@/lib/theme-colors"
import type { ExerciseDataQuality } from "@/lib/exercise-detail-engine"
import {
  getExerciseLoadSeries,
  getExercise1RMSeries,
  getExerciseVolumeSeries,
  getExerciseRepsSeries,
  getExerciseFrequencySeries,
  type ExercisePeriodFilter,
} from "@/lib/exercise-detail-engine"

const PERIOD_OPTIONS: { id: ExercisePeriodFilter; label: string }[] = [
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "6m", label: "6 meses" },
  { id: "1y", label: "1 ano" },
  { id: "all", label: "Todo o histórico" },
]

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type ExerciseChartsSectionProps = {
  exerciseId: string
  dataQuality: ExerciseDataQuality
}

/**
 * Gráficos de progresso (Sprint 22 §16/§17/§18). Um filtro de período único
 * controla os cinco gráficos — eixos nunca misturam métricas diferentes
 * (cada `ResponsiveContainer` tem seu próprio eixo Y). Todos os pontos vêm
 * prontos do motor (`exercise-detail-engine.ts`); nenhum recálculo aqui.
 */
export function ExerciseChartsSection({ exerciseId, dataQuality }: ExerciseChartsSectionProps) {
  const [period, setPeriod] = useState<ExercisePeriodFilter>("all")

  if (dataQuality.status === "no_data") return null

  const loadSeries = getExerciseLoadSeries(exerciseId, period)
  const rmSeries = getExercise1RMSeries(exerciseId, period)
  const volumeSeries = getExerciseVolumeSeries(exerciseId, period)
  const repsSeries = getExerciseRepsSeries(exerciseId, period)
  const frequencySeries = getExerciseFrequencySeries(exerciseId, period)

  return (
    <section className="card" aria-labelledby="exercise-charts-title">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 id="exercise-charts-title" className="section-label">Gráficos de progresso</h2>
      </div>

      <div className="filter-row" role="group" aria-label="Filtrar gráficos por período" style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={period === opt.id ? "filter-pill filter-pill--active" : "filter-pill"}
            aria-pressed={period === opt.id}
            onClick={() => setPeriod(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <ChartHeader title="Carga por execução" description="Maior carga válida registrada em cada sessão" />
          {loadSeries.length === 0 ? (
            <EmptyChart icon="🏋️" title="Sem carga registrada" description="Registre carga em ao menos uma execução para ver este gráfico" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={loadSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="performedAt" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="kg" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => formatDateShort(String(v))}
                    formatter={(v, _n, p) => [`${v}kg × ${p.payload.supportingReps ?? "—"} reps`, p.payload.workoutName]}
                  />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ fill: CHART_COLORS.primary, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted">
                {loadSeries.length} execuções com carga, de {loadSeries[0].value}kg a {loadSeries[loadSeries.length - 1].value}kg no período.
              </p>
            </>
          )}
        </div>

        <div>
          <ChartHeader title="1RM estimado" description="Estimativa de repetição máxima, não medida diretamente" />
          {rmSeries.length === 0 ? (
            <EmptyChart icon="📈" title="Sem estimativa disponível" description="Depende de execuções com carga registrada" />
          ) : (
            <>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={rmSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="performedAt" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(v) => formatDateShort(String(v))}
                  formatter={(v, _n, p) => [`~${v}kg (${p.payload.supportingLoadKg}kg × ${p.payload.supportingReps})`, "1RM estimado"]}
                />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS.tertiary} strokeWidth={2.5} dot={{ fill: CHART_COLORS.tertiary, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
              <p className="text-xs text-muted">
                {rmSeries.length} estimativas de 1RM, de {rmSeries[0].value}kg a {rmSeries[rmSeries.length - 1].value}kg no período.
              </p>
            </>
          )}
        </div>

        <div>
          <ChartHeader title="Volume por execução" description="Carga × repetições somadas na sessão" />
          {volumeSeries.length === 0 ? (
            <EmptyChart icon="📦" title="Sem volume registrado" description="Depende de execuções com carga registrada" />
          ) : (
            <>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={volumeSeries} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="performedAt" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => formatDateShort(String(v))} formatter={(v) => [`${v}kg`, "Volume"]} />
                <Bar dataKey="value" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
              <p className="text-xs text-muted">
                {volumeSeries.length} execuções com volume, de {volumeSeries[0].value}kg a {volumeSeries[volumeSeries.length - 1].value}kg no período.
              </p>
            </>
          )}
        </div>

        <div>
          <ChartHeader title="Repetições" description="Total de repetições (soma das séries) por execução" />
          {repsSeries.length === 0 ? (
            <EmptyChart icon="🔁" title="Sem repetições registradas" description="Registre séries para ver este gráfico" />
          ) : (
            <>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={repsSeries} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="performedAt" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => formatDateShort(String(v))} formatter={(v) => [`${v} reps`, "Total"]} />
                <Bar dataKey="value" fill={CHART_COLORS.quaternary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
              <p className="text-xs text-muted">
                {repsSeries.length} execuções com repetições, de {repsSeries[0].value} a {repsSeries[repsSeries.length - 1].value} reps no período.
              </p>
            </>
          )}
        </div>

        <div>
          <ChartHeader title="Frequência" description="Execuções por semana, a partir do histórico deste exercício" />
          {frequencySeries.length === 0 ? (
            <EmptyChart icon="🗓️" title="Sem execuções no período" description="Ajuste o filtro de período para ver a frequência" />
          ) : (
            <>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={frequencySeries} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="weekStart" tickFormatter={formatDateShort} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `Semana de ${formatDateShort(String(v))}`} formatter={(v) => [`${v} execuções`, "Frequência"]} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
              <p className="text-xs text-muted">
                {frequencySeries.length} semana(s) no período, totalizando {frequencySeries.reduce((sum, w) => sum + w.count, 0)} execuções.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
