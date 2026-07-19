"use client"

import { useState } from "react"
import type { ExportPeriodOption } from "@/lib/body-wellness-export"

type Props = {
  onExportBodyCsv: (period: ExportPeriodOption) => void
  onExportWellnessCsv: (period: ExportPeriodOption) => void
  onExportMarkdownReport: (period: ExportPeriodOption) => void
}

const PERIOD_OPTIONS: { value: ExportPeriodOption; label: string }[] = [
  { value: "last30", label: "Últimos 30 dias" },
  { value: "last90", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o histórico" },
]

/**
 * Exportação de corpo e bem-estar — Sprint 19 Parte 4. Reaproveita os motores
 * já existentes (nenhum cálculo novo acontece aqui); fotos nunca fazem parte
 * de nenhum dos três formatos.
 */
export function BodyWellnessExportSection({ onExportBodyCsv, onExportWellnessCsv, onExportMarkdownReport }: Props) {
  const [period, setPeriod] = useState<ExportPeriodOption>("last30")

  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Exportar corpo e bem-estar</h3>
      <p className="settings-section__body">
        Exporta registros corporais e check-ins de bem-estar em CSV ou um relatório legível em Markdown. Fotos de
        progresso não são incluídas em nenhum desses arquivos.
      </p>

      <div style={{ display: "flex", gap: 6, marginTop: "var(--space-3)" }} role="group" aria-label="Período da exportação">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={period === opt.value}
            onClick={() => setPeriod(opt.value)}
            style={{
              padding: "4px 10px", borderRadius: 9999,
              border: "1px solid", borderColor: period === opt.value ? "var(--color-accent)" : "var(--color-border-subtle)",
              background: period === opt.value ? "var(--color-accent-subtle)" : "transparent",
              color: period === opt.value ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="settings-export-actions" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
        <button type="button" className="btn btn--secondary btn--full" onClick={() => onExportBodyCsv(period)}>
          ⬇️ CSV — Progresso corporal
        </button>
        <button type="button" className="btn btn--secondary btn--full" onClick={() => onExportWellnessCsv(period)}>
          ⬇️ CSV — Bem-estar
        </button>
        <button type="button" className="btn btn--primary btn--full" onClick={() => onExportMarkdownReport(period)}>
          ⬇️ Relatório em Markdown
        </button>
      </div>
    </section>
  )
}
