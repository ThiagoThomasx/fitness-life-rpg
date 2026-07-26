"use client"

import { ACTIVE_HEALTH_DATA_SOURCES, HEALTH_METRIC_TYPES, type HealthDataSource, type HealthImportMetricSuggestion, type HealthMetricType } from "@/lib/health-data"
import { CONFIDENCE_LABELS, hintStyle, inputStyle, labelStyle, METRIC_LABELS, SOURCE_LABELS } from "./health-import-labels"

export interface StaticFieldsState {
  metric: HealthMetricType | ""
  unit: string
  source: HealthDataSource
}

export const DEFAULT_STATIC_FIELDS: StaticFieldsState = { metric: "", unit: "", source: "csv_import" }

interface Props {
  state: StaticFieldsState
  metricMappedByColumn: boolean
  metricSuggestion?: HealthImportMetricSuggestion | null
  onChange: (next: StaticFieldsState) => void
}

/** Valores fixos usados quando o arquivo não tem uma coluna correspondente (seção 11). */
export function HealthImportStaticFieldsCard({ state, metricMappedByColumn, metricSuggestion, onChange }: Props) {
  return (
    <section className="card">
      <h4 className="section-label settings-section__title">Valores fixos</h4>
      <p className="settings-section__body">Usados quando o arquivo não tem uma coluna para o campo.</p>

      {!metricMappedByColumn && (
        <>
          <label style={labelStyle} htmlFor="health-import-static-metric">Métrica (obrigatória, já que nenhuma coluna foi mapeada)</label>
          {metricSuggestion && (
            <p style={{ ...hintStyle, marginTop: 0, marginBottom: 6 }}>
              Sugestão: {METRIC_LABELS[metricSuggestion.metric]} ({CONFIDENCE_LABELS[metricSuggestion.confidence]} — {metricSuggestion.evidence})
            </p>
          )}
          <select
            id="health-import-static-metric"
            value={state.metric}
            onChange={(e) => onChange({ ...state, metric: e.target.value as HealthMetricType })}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {HEALTH_METRIC_TYPES.map((m) => (
              <option key={m} value={m}>{METRIC_LABELS[m]}</option>
            ))}
          </select>
        </>
      )}

      <label style={{ ...labelStyle, marginTop: 8 }} htmlFor="health-import-static-unit">Unidade (se nenhuma coluna de unidade)</label>
      <input
        id="health-import-static-unit"
        value={state.unit}
        onChange={(e) => onChange({ ...state, unit: e.target.value })}
        placeholder="ex.: kg, lb, count"
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 8 }} htmlFor="health-import-static-source">Fonte</label>
      <select
        id="health-import-static-source"
        value={state.source}
        onChange={(e) => onChange({ ...state, source: e.target.value as HealthDataSource })}
        style={inputStyle}
      >
        {ACTIVE_HEALTH_DATA_SOURCES.map((s) => (
          <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
        ))}
      </select>
      <p style={hintStyle}>Se uma coluna estiver mapeada para &quot;Fonte&quot;, o valor da coluna sempre tem prioridade sobre este valor fixo.</p>
    </section>
  )
}
