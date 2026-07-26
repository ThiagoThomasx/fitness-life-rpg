"use client"

import { useMemo, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import {
  applyMappingToCsv,
  buildMappingRowTrace,
  createHealthImportPreset,
  isAmbiguousSlashDate,
  loadHealthImportPresets,
  suggestColumnMappings,
  suggestCompatiblePresets,
  suggestMetric,
  validateMapping,
  type HealthImportColumnMapping,
  type HealthImportFieldTransformation,
  type HealthImportMapping,
  type HealthImportStaticValues,
} from "@/lib/health-data"
import type { ParsedImportItem } from "@/lib/health-data"
import { HealthImportColumnRow, defaultColumnMappingState, type ColumnMappingState } from "./HealthImportColumnRow"
import { HealthImportStaticFieldsCard, DEFAULT_STATIC_FIELDS, type StaticFieldsState } from "./HealthImportStaticFieldsCard"
import { HealthImportDateSettingsCard, DEFAULT_DATE_SETTINGS, resolveTimezoneOffsetMinutes, type DateSettingsState } from "./HealthImportDateSettingsCard"
import { HealthImportPresetBanner } from "./HealthImportPresetBanner"
import { HealthImportRowTracePreview } from "./HealthImportRowTracePreview"
import { hintStyle, inputStyle, labelStyle } from "./health-import-labels"

const TRACE_SAMPLE_ROWS = 3

function parseValueMapText(text: string): Record<string, number> {
  const map: Record<string, number> = {}
  for (const line of text.split("\n")) {
    const [key, rawValue] = line.split("=")
    if (!key || rawValue === undefined) continue
    const num = Number(rawValue.trim())
    if (Number.isFinite(num)) map[key.trim()] = num
  }
  return map
}

function buildTransformations(columnStates: ColumnMappingState[], decimalSeparator: "." | ","): HealthImportFieldTransformation[] {
  const transformations: HealthImportFieldTransformation[] = []

  for (const state of columnStates) {
    if (state.field === "value") {
      if (state.valueTransform === "parse_number") {
        transformations.push({ field: "value", transformation: { kind: "parse_number", decimalSeparator } })
      } else if (state.valueTransform === "map_value") {
        transformations.push({ field: "value", transformation: { kind: "map_value", valueMap: parseValueMapText(state.valueMapText) } })
      } else if (state.valueTransform === "derive_sleep_duration") {
        transformations.push({ field: "value", transformation: { kind: "derive_sleep_duration" } })
      }
    } else if (state.field === "metric" || state.field === "unit" || state.field === "source" || state.field === "externalId") {
      if (state.textTransform !== "none") {
        transformations.push({ field: state.field, transformation: { kind: state.textTransform } })
      }
    }
  }

  return transformations
}

interface Props {
  fileName: string
  header: string[]
  rows: string[][]
  onCancel: () => void
  onMapped: (items: ParsedImportItem[], mapping: HealthImportMapping) => void
  onPresetSaved?: () => void
}

/**
 * Wizard de mapeamento para CSV não canônico — configura a engine da Part 1
 * (detecção, transformações, presets) e entrega `ParsedImportItem[]` prontos
 * para o preview existente (`HealthDataImportPanel`), sem reimplementar
 * nenhuma regra de importação aqui (seção 4).
 */
export function HealthImportMappingWizard({ fileName, header, rows, onCancel, onMapped, onPresetSaved }: Props) {
  const suggestions = useMemo(() => suggestColumnMappings(header), [header])
  const presets = useMemo(() => loadHealthImportPresets(), [])
  const compatiblePresetIds = useMemo(
    () => suggestCompatiblePresets({ name: fileName, kind: "csv", header, sampleRows: rows.slice(0, 5) }, presets),
    [fileName, header, rows, presets]
  )
  const suggestedPresets = presets.filter((p) => compatiblePresetIds.includes(p.id))
  const metricSuggestion = useMemo(() => suggestMetric({ name: fileName, header }), [fileName, header])

  const [columnStates, setColumnStates] = useState<ColumnMappingState[]>(() =>
    header.map((column) => defaultColumnMappingState(column, suggestions.find((s) => s.column === column)))
  )
  const [staticFields, setStaticFields] = useState<StaticFieldsState>(() =>
    metricSuggestion && !suggestions.some((s) => s.field === "metric")
      ? { ...DEFAULT_STATIC_FIELDS, metric: metricSuggestion.metric }
      : DEFAULT_STATIC_FIELDS
  )
  const [dateSettings, setDateSettings] = useState<DateSettingsState>(DEFAULT_DATE_SETTINGS)
  const [decimalSeparator, setDecimalSeparator] = useState<"." | ",">(".")
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const metricMappedByColumn = columnStates.some((s) => s.field === "metric")

  const fieldUsage = useMemo(() => {
    const usage = new Map<string, string[]>()
    for (const state of columnStates) {
      if (state.field === "none") continue
      const columns = usage.get(state.field) ?? []
      columns.push(state.column)
      usage.set(state.field, columns)
    }
    return usage
  }, [columnStates])

  function isColumnConflicting(state: ColumnMappingState): boolean {
    if (state.field === "none") return false
    return (fieldUsage.get(state.field)?.length ?? 0) > 1
  }
  const hasConflict = columnStates.some(isColumnConflicting)

  const draftMapping: HealthImportMapping = useMemo(() => {
    const columns: HealthImportColumnMapping = {}
    for (const state of columnStates) {
      if (state.field !== "none") columns[state.field] = state.column
    }
    const staticValues: HealthImportStaticValues = {
      metric: staticFields.metric || undefined,
      unit: staticFields.unit || undefined,
      source: staticFields.source,
    }
    return {
      id: "draft",
      name: fileName,
      sourceFormat: "csv",
      columns,
      static: staticValues,
      dateFormat: dateSettings.dateFormat,
      timezoneOffsetMinutes: resolveTimezoneOffsetMinutes(dateSettings),
      decimalSeparator,
      delimiter: ",",
      transformations: buildTransformations(columnStates, decimalSeparator),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [columnStates, staticFields, dateSettings, decimalSeparator, fileName])

  const validation = useMemo(() => validateMapping(draftMapping), [draftMapping])

  const recordedAtSampleValue = useMemo(() => {
    const column = draftMapping.columns.recordedAt ?? draftMapping.columns.startAt
    if (!column) return null
    const index = header.indexOf(column)
    if (index === -1) return null
    return rows[0]?.[index] ?? null
  }, [draftMapping, header, rows])

  const dateFormatChosenExplicitly = dateSettings.dateFormat === "DD/MM/YYYY" || dateSettings.dateFormat === "MM/DD/YYYY"
  const isAmbiguousUnresolved =
    recordedAtSampleValue !== null && isAmbiguousSlashDate(recordedAtSampleValue) && !dateFormatChosenExplicitly

  const traces = useMemo(() => {
    if (!validation.valid) return []
    return rows.slice(0, TRACE_SAMPLE_ROWS).map((cells) => buildMappingRowTrace(draftMapping, header, cells))
  }, [validation.valid, rows, draftMapping, header])

  function updateColumnState(column: string, next: ColumnMappingState) {
    setColumnStates((prev) => prev.map((s) => (s.column === column ? next : s)))
  }

  function applyPreset(preset: HealthImportMapping) {
    setColumnStates(
      header.map((column) => {
        const field = (Object.keys(preset.columns) as (keyof HealthImportColumnMapping)[]).find((f) => preset.columns[f] === column)
        const transformation = preset.transformations.find((t) => t.field === field)
        return {
          column,
          field: field ?? "none",
          valueTransform:
            transformation?.transformation.kind === "parse_number"
              ? "parse_number"
              : transformation?.transformation.kind === "map_value"
                ? "map_value"
                : transformation?.transformation.kind === "derive_sleep_duration"
                  ? "derive_sleep_duration"
                  : "none",
          valueMapText:
            transformation?.transformation.kind === "map_value"
              ? Object.entries(transformation.transformation.valueMap).map(([k, v]) => `${k}=${v}`).join("\n")
              : "",
          textTransform:
            transformation?.transformation.kind === "trim" || transformation?.transformation.kind === "lowercase" || transformation?.transformation.kind === "uppercase"
              ? transformation.transformation.kind
              : "none",
        }
      })
    )
    setStaticFields({ metric: preset.static.metric ?? "", unit: preset.static.unit ?? "", source: preset.static.source ?? "csv_import" })
    if (preset.dateFormat) setDateSettings((prev) => ({ ...prev, dateFormat: preset.dateFormat! }))
    setDecimalSeparator(preset.decimalSeparator)
    setAppliedPresetId(preset.id)
  }

  function handleSavePreset() {
    if (!presetName.trim()) return
    const result = createHealthImportPreset({
      name: presetName.trim(),
      sourceFormat: draftMapping.sourceFormat,
      columns: draftMapping.columns,
      static: draftMapping.static,
      dateFormat: draftMapping.dateFormat,
      timezoneOffsetMinutes: draftMapping.timezoneOffsetMinutes,
      decimalSeparator: draftMapping.decimalSeparator,
      delimiter: draftMapping.delimiter,
      transformations: draftMapping.transformations,
    })
    setSaveMessage(result.ok ? `Preset "${presetName.trim()}" salvo.` : (result.error ?? "Falha ao salvar o preset."))
    if (result.ok) {
      setShowSavePreset(false)
      setPresetName("")
      onPresetSaved?.()
    }
  }

  function handleContinue() {
    if (!validation.valid || hasConflict || isAmbiguousUnresolved) return
    const result = applyMappingToCsv(draftMapping, header, rows)
    if (!result.ok) return
    onMapped(result.items, draftMapping)
  }

  const canContinue = validation.valid && !hasConflict && !isAmbiguousUnresolved

  return (
    <ModalShell labelledBy="health-import-mapping-title" variant="sheet" onClose={onCancel} dismissible>
      <h3 id="health-import-mapping-title" className="modal-title">Mapear colunas — {fileName}</h3>
      <p className="settings-section__body" style={{ marginTop: 4 }}>
        Este arquivo não usa o formato canônico. Configure como cada coluna deve ser interpretada antes da prévia.
      </p>

      <div style={{ marginTop: 12 }}>
        <HealthImportPresetBanner
          suggestedPresets={suggestedPresets}
          appliedPresetId={appliedPresetId}
          onApply={applyPreset}
          onClearApplied={() => setAppliedPresetId(null)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <HealthImportStaticFieldsCard
          state={staticFields}
          metricMappedByColumn={metricMappedByColumn}
          metricSuggestion={metricSuggestion}
          onChange={setStaticFields}
        />

        <section className="card">
          <h4 className="section-label settings-section__title">Colunas encontradas</h4>
          <p className="settings-section__body">Escolha o campo interno e a transformação de cada coluna.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {columnStates.map((state) => (
              <HealthImportColumnRow
                key={state.column}
                state={state}
                suggestion={suggestions.find((s) => s.column === state.column)}
                usedByOtherColumn={isColumnConflicting(state)}
                onChange={(next) => updateColumnState(state.column, next)}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <h4 className="section-label settings-section__title">Números</h4>
          <label style={labelStyle} htmlFor="health-import-decimal-separator">Separador decimal usado no arquivo</label>
          <select
            id="health-import-decimal-separator"
            value={decimalSeparator}
            onChange={(e) => setDecimalSeparator(e.target.value as "." | ",")}
            style={inputStyle}
          >
            <option value=".">Ponto (72.5)</option>
            <option value=",">Vírgula (72,5)</option>
          </select>
        </section>

        <HealthImportDateSettingsCard state={dateSettings} sampleValue={recordedAtSampleValue} onChange={setDateSettings} />

        <HealthImportRowTracePreview traces={traces} />

        {!validation.valid && (
          <div role="alert" aria-live="assertive" className="alert alert--danger">
            {validation.errors.map((e, i) => <p key={i}>{e.reason}</p>)}
          </div>
        )}

        <section className="card">
          {!showSavePreset ? (
            <button type="button" className="btn btn--secondary btn--full" onClick={() => setShowSavePreset(true)}>
              💾 Salvar este mapeamento como preset
            </button>
          ) : (
            <>
              <label style={labelStyle} htmlFor="health-import-preset-name">Nome do preset</label>
              <input
                id="health-import-preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                style={inputStyle}
                placeholder="ex.: Samsung Health CSV"
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={handleSavePreset} disabled={!presetName.trim()}>
                  Salvar preset
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setShowSavePreset(false)}>Cancelar</button>
              </div>
            </>
          )}
          {saveMessage && <p role="status" aria-live="polite" style={hintStyle}>{saveMessage}</p>}
        </section>
      </div>

      <div className="settings-confirm__actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn--primary" onClick={handleContinue} disabled={!canContinue}>
          Ver prévia
        </button>
      </div>
    </ModalShell>
  )
}
