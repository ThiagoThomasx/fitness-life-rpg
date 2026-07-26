"use client"

import { useState } from "react"
import { deleteHealthDataRecord, type HealthDataRecord } from "@/lib/health-data"

const METRIC_LABELS: Record<string, string> = {
  steps: "Passos",
  sleep_duration: "Sono",
  sleep_quality: "Qualidade do sono",
  resting_heart_rate: "FC de repouso",
  weight: "Peso",
  active_calories: "Calorias ativas",
  activity_duration: "Duração de atividade",
  distance: "Distância",
  wellness_energy: "Energia",
  wellness_soreness: "Dor muscular",
  wellness_motivation: "Motivação",
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

type Props = {
  records: HealthDataRecord[]
  onChanged: () => void
}

export function HealthDataRecordList({ records, onChanged }: Props) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function handleDelete(id: string) {
    deleteHealthDataRecord(id)
    setConfirmingDeleteId(null)
    onChanged()
  }

  if (records.length === 0) {
    return (
      <p className="settings-section__body" style={{ marginTop: 8 }}>
        Nenhum registro de saúde ainda. Adicione um manualmente ou importe um arquivo.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      {records.slice(0, 25).map((record) => {
        const isBodyProgressSourced = record.source === "body_progress"
        return (
          <div key={record.id} className="health-data-row">
            <div>
              <div className="health-data-row__metric">
                {METRIC_LABELS[record.metric] ?? record.metric} — {record.value} {record.unit}
              </div>
              <div className="health-data-row__meta">
                {formatDate(record.recordedAt)} · fonte: {record.source} · qualidade: {record.quality}
              </div>
            </div>

            {isBodyProgressSourced ? (
              <span className="health-data-row__meta" title="Peso é gerenciado em Progresso Corporal">
                <a href="/perfil">Editar em Progresso Corporal</a>
              </span>
            ) : confirmingDeleteId === record.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn btn--danger" style={{ fontSize: "var(--text-xs)" }} onClick={() => handleDelete(record.id)}>
                  Confirmar
                </button>
                <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setConfirmingDeleteId(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                style={{ fontSize: "var(--text-xs)" }}
                onClick={() => setConfirmingDeleteId(record.id)}
                aria-label={`Excluir registro de ${METRIC_LABELS[record.metric] ?? record.metric}`}
              >
                Excluir
              </button>
            )}
          </div>
        )
      })}
      {records.length > 25 && (
        <p className="settings-section__body" style={{ fontSize: "var(--text-xs)", marginTop: 8 }}>
          Mostrando os 25 registros mais recentes de {records.length}.
        </p>
      )}
    </div>
  )
}
