"use client"

import { useCallback, useEffect, useState } from "react"
import { getAllHealthRecords, type HealthDataRecord } from "@/lib/health-data"
import { HealthDataManualEntryForm } from "./HealthDataManualEntryForm"
import { HealthDataImportPanel } from "./HealthDataImportPanel"
import { HealthDataExportPanel } from "./HealthDataExportPanel"
import { HealthDataRecordList } from "./HealthDataRecordList"
import { HealthDataInsightsPanel } from "./HealthDataInsightsPanel"
import { HealthImportPresetsSection } from "./health-import/HealthImportPresetsSection"

export function HealthDataSection() {
  const [records, setRecords] = useState<HealthDataRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [presetsVersion, setPresetsVersion] = useState(0)

  const load = useCallback(() => {
    setRecords(getAllHealthRecords())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sources = Array.from(new Set(records.map((r) => r.source)))

  return (
    <>
      <section className="card">
        <h3 className="section-label settings-section__title">Dados de saúde</h3>
        <p className="settings-section__body">
          Seus dados de saúde ficam armazenados localmente neste dispositivo. Eles também podem ser incluídos no
          backup do aplicativo.
        </p>

        <div className="health-import-counts" role="group" aria-label="Resumo dos dados de saúde">
          <div className="health-import-count">
            <span className="health-import-count__value">{records.length}</span>
            <span className="health-import-count__label">registro(s)</span>
          </div>
          <div className="health-import-count">
            <span className="health-import-count__value">{sources.length}</span>
            <span className="health-import-count__label">fonte(s)</span>
          </div>
        </div>

        <p className="settings-section__title" style={{ fontSize: "var(--text-xs)", fontWeight: 700, marginTop: "0.5rem" }}>
          Registros recentes
        </p>
        <HealthDataRecordList records={records} onChanged={load} />
      </section>

      {showForm ? (
        <HealthDataManualEntryForm onSaved={load} onCancel={() => setShowForm(false)} />
      ) : (
        <section className="card">
          <button type="button" className="btn btn--secondary btn--full" onClick={() => setShowForm(true)}>
            + Adicionar registro manual
          </button>
        </section>
      )}

      <HealthDataImportPanel onImported={load} onPresetSaved={() => setPresetsVersion((v) => v + 1)} />

      <HealthDataExportPanel />

      <HealthImportPresetsSection key={presetsVersion} />

      <HealthDataInsightsPanel records={records} />
    </>
  )
}
