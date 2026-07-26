"use client"

import { useMemo, useState } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import { PERIOD_OPTIONS } from "@/components/dashboard/analytics/analytics-ui"
import type { AnalyticsPeriod } from "@/lib/analytics/types"
import {
  METRIC_LABELS,
  HEALTH_METRIC_TYPES,
  getHealthRecordsForExport,
  buildHealthDataCanonicalExport,
  serializeHealthDataCanonicalExport,
  buildHealthDataCanonicalCsv,
  buildHealthExportPreview,
  downloadHealthExportFile,
  type HealthExportFilters,
  type HealthExportFormat,
  type HealthMetricType,
} from "@/lib/health-data"

const ALL_METRICS = "all" as const

function buildContent(format: HealthExportFormat, filters: HealthExportFilters, now: Date) {
  const records = getHealthRecordsForExport(filters, now)
  const content =
    format === "json"
      ? serializeHealthDataCanonicalExport(buildHealthDataCanonicalExport(records, filters, now))
      : buildHealthDataCanonicalCsv(records)
  const preview = buildHealthExportPreview(format, records, filters, content, now)
  return { content, preview }
}

export function HealthDataExportPanel() {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<HealthExportFormat>("json")
  const [metric, setMetric] = useState<HealthMetricType | typeof ALL_METRICS>(ALL_METRICS)
  const [period, setPeriod] = useState<AnalyticsPeriod>("all")
  const [includeWeight, setIncludeWeight] = useState(true)
  const [downloaded, setDownloaded] = useState<string | null>(null)

  const filters: HealthExportFilters = useMemo(
    () => ({
      metrics: metric === ALL_METRICS ? undefined : [metric],
      period,
      includeWeight,
    }),
    [metric, period, includeWeight]
  )

  const now = useMemo(() => new Date(), [])
  const { content, preview } = useMemo(() => buildContent(format, filters, now), [format, filters, now])

  function handleDownload() {
    downloadHealthExportFile(content, preview.filename, format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8")
    setDownloaded(preview.filename)
  }

  function closeModal() {
    setOpen(false)
    setDownloaded(null)
  }

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Exportar dados de saúde</h3>
      <p className="settings-section__body">
        Baixe seus registros de saúde em JSON ou CSV. O arquivo gerado é reimportável por este mesmo app — nenhum dado é
        enviado para servidores, tudo acontece localmente no navegador.
      </p>

      <button type="button" className="btn btn--secondary btn--full" onClick={() => setOpen(true)}>
        ⬇️ Exportar dados
      </button>

      {open && (
        <ModalShell labelledBy="health-export-title" describedBy="health-export-summary" variant="sheet" onClose={closeModal}>
          <h3 id="health-export-title" className="modal-title">
            Exportar dados de saúde
          </h3>

          <div style={{ marginTop: 12 }}>
            <label htmlFor="health-export-format" className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
              Formato
            </label>
            <select
              id="health-export-format"
              className="input"
              value={format}
              onChange={(e) => setFormat(e.target.value as HealthExportFormat)}
              style={{ marginTop: 4 }}
            >
              <option value="json">JSON (formato canônico do app)</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label htmlFor="health-export-metric" className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
              Métrica
            </label>
            <select
              id="health-export-metric"
              className="input"
              value={metric}
              onChange={(e) => setMetric(e.target.value as HealthMetricType | typeof ALL_METRICS)}
              style={{ marginTop: 4 }}
            >
              <option value={ALL_METRICS}>Todas</option>
              {HEALTH_METRIC_TYPES.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label htmlFor="health-export-period" className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
              Período
            </label>
            <select
              id="health-export-period"
              className="input"
              value={period}
              onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
              style={{ marginTop: 4 }}
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <input type="checkbox" checked={includeWeight} onChange={(e) => setIncludeWeight(e.target.checked)} />
            <span className="settings-section__body" style={{ margin: 0 }}>
              Incluir peso (vem de Progresso Corporal)
            </span>
          </label>

          <div id="health-export-summary" role="status" aria-live="polite" className="health-import-counts" style={{ marginTop: 16 }}>
            <div className="health-import-count">
              <span className="health-import-count__value">{preview.count}</span>
              <span className="health-import-count__label">registro(s)</span>
            </div>
            <div className="health-import-count">
              <span className="health-import-count__value">{(preview.estimatedBytes / 1024).toFixed(1)}</span>
              <span className="health-import-count__label">KB estimado</span>
            </div>
          </div>

          <p className="settings-section__body" style={{ fontSize: "var(--text-xs)", marginTop: 8 }}>
            Período: {preview.periodLabel} · Arquivo: <code>{preview.filename}</code>
          </p>

          {preview.warnings.map((warning) => (
            <div key={warning} role="alert" className="alert alert--danger" style={{ marginTop: 8 }}>
              ✕ {warning}
            </div>
          ))}

          <p className="settings-section__body" style={{ fontSize: "var(--text-xs)", marginTop: 8, color: "var(--color-text-muted)" }}>
            ℹ️ O arquivo será gerado localmente no navegador. Nenhum dado será enviado para servidores.
          </p>

          {downloaded && (
            <div role="status" aria-live="polite" className="alert alert--success" style={{ marginTop: 8 }}>
              ✓ {downloaded} baixado.
            </div>
          )}

          <div className="settings-confirm__actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--secondary" onClick={closeModal}>
              Fechar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleDownload} disabled={preview.count === 0}>
              Baixar {format.toUpperCase()} ({preview.count})
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  )
}
