"use client"

import { HEALTH_IMPORT_DATE_FORMATS, isAmbiguousSlashDate, type HealthImportDateFormat } from "@/lib/health-data"
import { DATE_FORMAT_LABELS, hintStyle, inputStyle, labelStyle } from "./health-import-labels"

export type TimezoneMode = "utc" | "local" | "fixed"

export interface DateSettingsState {
  dateFormat: HealthImportDateFormat
  timezoneMode: TimezoneMode
  fixedOffsetMinutes: number
}

export const DEFAULT_DATE_SETTINGS: DateSettingsState = { dateFormat: "ISO", timezoneMode: "utc", fixedOffsetMinutes: 0 }

export function resolveTimezoneOffsetMinutes(state: DateSettingsState): number {
  if (state.timezoneMode === "utc") return 0
  if (state.timezoneMode === "local") return -new Date().getTimezoneOffset()
  return state.fixedOffsetMinutes
}

interface Props {
  state: DateSettingsState
  /** Um valor de exemplo da coluna de data (primeira linha), usado para detectar ambiguidade. */
  sampleValue: string | null
  onChange: (next: DateSettingsState) => void
}

/** Formato de data, timezone e resolução de ambiguidade (seções 12, 17, 18). */
export function HealthImportDateSettingsCard({ state, sampleValue, onChange }: Props) {
  const dateFormatChosenExplicitly = state.dateFormat === "DD/MM/YYYY" || state.dateFormat === "MM/DD/YYYY"
  const isAmbiguous = sampleValue !== null && isAmbiguousSlashDate(sampleValue) && !dateFormatChosenExplicitly

  return (
    <section className="card">
      <h4 className="section-label settings-section__title">Formato de data</h4>

      <label style={labelStyle} htmlFor="health-import-date-format">Formato usado no arquivo</label>
      <select
        id="health-import-date-format"
        value={state.dateFormat}
        onChange={(e) => onChange({ ...state, dateFormat: e.target.value as HealthImportDateFormat })}
        style={inputStyle}
      >
        {HEALTH_IMPORT_DATE_FORMATS.map((format) => (
          <option key={format} value={format}>{DATE_FORMAT_LABELS[format]}</option>
        ))}
      </select>
      {sampleValue && <p style={hintStyle}>Exemplo do arquivo: &quot;{sampleValue}&quot;</p>}

      {isAmbiguous && (
        <div role="alert" className="alert alert--danger" style={{ marginTop: 8 }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Este arquivo usa DD/MM/AAAA ou MM/DD/AAAA?</p>
          <p style={{ fontSize: "var(--text-xs)", marginBottom: 8 }}>
            &quot;{sampleValue}&quot; pode ser interpretado das duas formas. Escolha explicitamente antes de continuar.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => onChange({ ...state, dateFormat: "DD/MM/YYYY" })}>
              DD/MM/AAAA
            </button>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => onChange({ ...state, dateFormat: "MM/DD/YYYY" })}>
              MM/DD/AAAA
            </button>
          </div>
        </div>
      )}

      <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="health-import-timezone-mode">Fuso horário</label>
      <select
        id="health-import-timezone-mode"
        value={state.timezoneMode}
        onChange={(e) => onChange({ ...state, timezoneMode: e.target.value as TimezoneMode })}
        style={inputStyle}
      >
        <option value="utc">UTC</option>
        <option value="local">Fuso local deste dispositivo</option>
        <option value="fixed">Offset fixo</option>
      </select>

      {state.timezoneMode === "fixed" && (
        <>
          <label style={{ ...labelStyle, marginTop: 8 }} htmlFor="health-import-timezone-offset">Offset em minutos (ex.: -180 para UTC-3)</label>
          <input
            id="health-import-timezone-offset"
            type="number"
            step={15}
            value={state.fixedOffsetMinutes}
            onChange={(e) => onChange({ ...state, fixedOffsetMinutes: Number(e.target.value) || 0 })}
            style={inputStyle}
          />
        </>
      )}

      <p style={hintStyle}>
        Um horário de {state.dateFormat === "ISO" ? "12:00" : "12:00"} no arquivo será interpretado como{" "}
        {new Date(Date.UTC(2026, 0, 1, 12, 0) - resolveTimezoneOffsetMinutes(state) * 60_000).toISOString().slice(11, 16)} UTC.
      </p>
    </section>
  )
}
