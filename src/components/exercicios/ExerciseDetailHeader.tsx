"use client"

import { useState } from "react"
import Link from "next/link"
import type { ResolvedExercise } from "@/lib/exercise-detail-engine"
import type { ExerciseHistorySummary, ExerciseTrend, ExercisePersonalRecords } from "@/lib/exercise-intelligence"

const ORIGIN_LABELS: Record<ResolvedExercise["origin"], string> = {
  library: "Biblioteca",
  custom: "Customizado",
  history_only: "Apenas no histórico",
}

const TREND_ICON: Record<ExerciseTrend["direction"], string> = {
  increasing: "↑",
  decreasing: "↓",
  stable: "→",
  insufficient_data: "—",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type ExerciseDetailHeaderProps = {
  resolved: ResolvedExercise
  summary: ExerciseHistorySummary | null
  loadTrend: ExerciseTrend | undefined
  records: ExercisePersonalRecords
}

/**
 * Cabeçalho da página — hierarquia Nome → contexto → última execução →
 * tendência (Sprint 22 §8). Ações limitadas ao que tem fluxo real: não há
 * rota própria para a biblioteca (é um estado dentro de `/treinos`) nem
 * editor de exercício customizado fora do modal da biblioteca — por isso
 * "editar"/"abrir na biblioteca" não viram links quebrados (Sprint 22 §9).
 */
export function ExerciseDetailHeader({ resolved, summary, loadTrend, records }: ExerciseDetailHeaderProps) {
  const [copied, setCopied] = useState(false)

  const topRecord = records.maxLoad ?? records.bestSetVolume ?? records.maxSessionVolume

  async function copyName() {
    try {
      await navigator.clipboard.writeText(resolved.exerciseName)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard indisponível (ex: contexto não seguro) — falha silenciosa, sem quebrar a página.
    }
  }

  return (
    <header>
      <Link href="/treinos" className="text-xs text-muted">← Voltar aos treinos</Link>

      <div style={{ marginTop: "var(--space-2)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-primary">{resolved.exerciseName}</h1>
          <span className="badge-pill badge-pill--level">{ORIGIN_LABELS[resolved.origin]}</span>
          {resolved.availability === "removed" && (
            <span className="badge-pill badge-pill--danger">Removido da biblioteca</span>
          )}
        </div>

        {(resolved.muscleGroups?.length || resolved.equipment?.length) && (
          <p className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
            {resolved.muscleGroups?.join(", ")}
            {resolved.muscleGroups?.length && resolved.equipment?.length ? " · " : ""}
            {resolved.equipment?.join(", ")}
          </p>
        )}

        <div className="exercise-detail-header__meta">
          {summary?.lastPerformedAt && (
            <span className="text-xs text-secondary">
              Última execução: <strong className="text-primary">{formatDate(summary.lastPerformedAt)}</strong>
            </span>
          )}
          {topRecord && (
            <span className="text-xs text-secondary">
              Recorde: <strong className="text-primary">{topRecord.value}{topRecord.unit}</strong>
            </span>
          )}
          {loadTrend && loadTrend.direction !== "insufficient_data" && (
            <span className="text-xs text-secondary">
              Tendência de carga: <strong className="text-primary">{TREND_ICON[loadTrend.direction]}</strong>
            </span>
          )}
        </div>

        <div className="exercise-detail-header__actions">
          <button type="button" className="btn btn--ghost" style={{ fontSize: "var(--text-xs)" }} onClick={copyName}>
            {copied ? "Copiado!" : "Copiar nome"}
          </button>
        </div>
      </div>
    </header>
  )
}
