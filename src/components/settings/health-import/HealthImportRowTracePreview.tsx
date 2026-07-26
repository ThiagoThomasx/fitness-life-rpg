"use client"

import type { MappingRowTraceEntry } from "@/lib/health-data"
import { TARGET_FIELD_LABELS } from "./health-import-labels"

interface Props {
  traces: MappingRowTraceEntry[][]
}

/**
 * Mostra original → transformado para uma amostra de linhas, sem recalcular
 * nada — os dados já vêm prontos de `buildMappingRowTrace` (seção 19).
 */
export function HealthImportRowTracePreview({ traces }: Props) {
  if (traces.length === 0) return null

  return (
    <section className="card">
      <h4 className="section-label settings-section__title">Como estas linhas serão interpretadas</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {traces.map((rowTrace, rowIndex) => (
          <div key={rowIndex} className="card" style={{ padding: "0.625rem 0.75rem" }}>
            {rowTrace.map((entry) => (
              <div
                key={entry.field}
                className="health-import-list__row"
                style={{ fontSize: "var(--text-xs)" }}
              >
                <span>{TARGET_FIELD_LABELS[entry.field]}: <strong>{entry.original || "—"}</strong></span>
                <span style={{ color: entry.error ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                  {entry.error ? `⚠ ${entry.error}` : `→ ${entry.transformed || "—"}`}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
