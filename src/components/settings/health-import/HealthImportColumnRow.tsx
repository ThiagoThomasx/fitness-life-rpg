"use client"

import { HEALTH_METRIC_TYPES, type HealthImportColumnSuggestion, type HealthImportTargetField } from "@/lib/health-data"
import { CONFIDENCE_LABELS, hintStyle, inputStyle, labelStyle, METRIC_LABELS, TARGET_FIELD_LABELS } from "./health-import-labels"

const ASSIGNABLE_FIELDS: readonly HealthImportTargetField[] = [
  "metric", "value", "unit", "recordedAt", "startAt", "endAt", "source", "externalId",
]

export type ValueTransformMode = "none" | "parse_number" | "map_value" | "derive_sleep_duration"
export type TextTransformMode = "none" | "trim" | "lowercase" | "uppercase"

export interface ColumnMappingState {
  column: string
  field: HealthImportTargetField | "none"
  /** Só usado quando `field === 'value'`. */
  valueTransform: ValueTransformMode
  /** Texto bruto `Original=Número` por linha, usado quando `valueTransform === 'map_value'`. */
  valueMapText: string
  /** Só usado para campos de texto (metric/unit/source/externalId). */
  textTransform: TextTransformMode
}

export function defaultColumnMappingState(column: string, suggestion?: HealthImportColumnSuggestion): ColumnMappingState {
  return {
    column,
    field: suggestion?.field ?? "none",
    valueTransform: "none",
    valueMapText: "",
    textTransform: "none",
  }
}

interface Props {
  state: ColumnMappingState
  suggestion?: HealthImportColumnSuggestion
  usedByOtherColumn: boolean
  onChange: (next: ColumnMappingState) => void
}

/** Uma linha do mapeamento: coluna do arquivo → campo interno + transformação (seção 10). */
export function HealthImportColumnRow({ state, suggestion, usedByOtherColumn, onChange }: Props) {
  const isRequired = state.field === "metric" || state.field === "value" || state.field === "recordedAt"

  return (
    <div
      className="card"
      style={{
        padding: "0.75rem",
        border: usedByOtherColumn ? "1px solid var(--color-danger)" : "1px solid var(--color-border-subtle)",
      }}
    >
      <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 4 }}>{state.column}</p>

      {suggestion && (
        <p style={{ ...hintStyle, marginTop: 0, marginBottom: 8 }}>
          Sugestão: {TARGET_FIELD_LABELS[suggestion.field]} ({CONFIDENCE_LABELS[suggestion.confidence]})
        </p>
      )}

      <label style={labelStyle} htmlFor={`health-import-field-${state.column}`}>Campo interno</label>
      <select
        id={`health-import-field-${state.column}`}
        value={state.field}
        onChange={(e) => onChange({ ...state, field: e.target.value as ColumnMappingState["field"] })}
        style={inputStyle}
        aria-describedby={usedByOtherColumn ? `health-import-duplicate-${state.column}` : undefined}
      >
        <option value="none">Não usar esta coluna</option>
        {ASSIGNABLE_FIELDS.map((field) => (
          <option key={field} value={field}>
            {TARGET_FIELD_LABELS[field]}{isRequired && field === state.field ? " (obrigatório)" : ""}
          </option>
        ))}
      </select>

      {usedByOtherColumn && (
        <p id={`health-import-duplicate-${state.column}`} role="alert" style={{ ...hintStyle, color: "var(--color-danger)" }}>
          Este campo já está mapeado por outra coluna. Escolha um campo diferente.
        </p>
      )}

      {state.field === "value" && (
        <>
          <label style={{ ...labelStyle, marginTop: 8 }} htmlFor={`health-import-value-transform-${state.column}`}>Transformação</label>
          <select
            id={`health-import-value-transform-${state.column}`}
            value={state.valueTransform}
            onChange={(e) => onChange({ ...state, valueTransform: e.target.value as ValueTransformMode })}
            style={inputStyle}
          >
            <option value="none">Nenhuma (já é número)</option>
            <option value="parse_number">Número com separador decimal do arquivo</option>
            <option value="map_value">Mapeamento de valores (texto → número)</option>
            <option value="derive_sleep_duration">Derivar do início/fim do sono</option>
          </select>

          {state.valueTransform === "map_value" && (
            <>
              <label style={{ ...labelStyle, marginTop: 8 }} htmlFor={`health-import-value-map-${state.column}`}>
                Um mapeamento por linha (Original=Número)
              </label>
              <textarea
                id={`health-import-value-map-${state.column}`}
                value={state.valueMapText}
                onChange={(e) => onChange({ ...state, valueMapText: e.target.value })}
                rows={3}
                placeholder={"Excelente=5\nBoa=4\nRegular=3"}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </>
          )}
        </>
      )}

      {(state.field === "metric" || state.field === "unit" || state.field === "source" || state.field === "externalId") && (
        <>
          <label style={{ ...labelStyle, marginTop: 8 }} htmlFor={`health-import-text-transform-${state.column}`}>Transformação</label>
          <select
            id={`health-import-text-transform-${state.column}`}
            value={state.textTransform}
            onChange={(e) => onChange({ ...state, textTransform: e.target.value as TextTransformMode })}
            style={inputStyle}
          >
            <option value="none">Nenhuma</option>
            <option value="trim">Remover espaços nas pontas</option>
            <option value="lowercase">Minúsculas</option>
            <option value="uppercase">Maiúsculas</option>
          </select>
        </>
      )}

      {state.field === "metric" && (
        <p style={hintStyle}>
          Valores desta coluna devem corresponder a uma métrica: {HEALTH_METRIC_TYPES.map((m) => METRIC_LABELS[m]).join(", ")}.
        </p>
      )}
    </div>
  )
}
