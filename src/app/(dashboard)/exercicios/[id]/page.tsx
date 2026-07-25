"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  getExerciseHistorySummary,
  getExercisePersonalRecords,
  getExerciseTrends,
  getExerciseTimeline,
  getExerciseSubstitutionInsights,
  type ExerciseHistorySummary,
  type ExercisePersonalRecords,
  type ExerciseTrend,
  type NormalizedExerciseExecution,
  type ExerciseSubstitutionInsights,
} from "@/lib/exercise-intelligence"
import {
  resolveExercise,
  getExerciseDataQuality,
  getExerciseRelatedWorkouts,
  type ResolvedExercise,
  type ExerciseDataQuality,
  type ExerciseRelatedWorkout,
} from "@/lib/exercise-detail-engine"
import { EmptyState } from "@/components/ui/EmptyState"
import { SkeletonPageLoader } from "@/components/ui/Skeleton"
import { ExerciseDetailHeader } from "@/components/exercicios/ExerciseDetailHeader"
import { ExerciseSummarySection } from "@/components/exercicios/ExerciseSummarySection"
import { ExerciseRecordsSection } from "@/components/exercicios/ExerciseRecordsSection"
import { ExerciseTrendsSection } from "@/components/exercicios/ExerciseTrendsSection"
import { ExerciseChartsSection } from "@/components/exercicios/ExerciseChartsSection"
import { ExerciseTimelineSection } from "@/components/exercicios/ExerciseTimelineSection"
import { ExerciseSubstitutionsSection } from "@/components/exercicios/ExerciseSubstitutionsSection"
import { ExerciseRelatedSection } from "@/components/exercicios/ExerciseRelatedSection"

interface ExerciseDetailData {
  resolved: ResolvedExercise
  summary: ExerciseHistorySummary | null
  records: ExercisePersonalRecords
  trends: ExerciseTrend[]
  executions: NormalizedExerciseExecution[]
  substitutions: ExerciseSubstitutionInsights | null
  related: ExerciseRelatedWorkout[]
  dataQuality: ExerciseDataQuality
}

/**
 * `/exercicios/[id]` — perfil histórico e analítico do exercício (Sprint 22
 * Parte 2). Todo o cálculo vem do motor puro (`exercise-intelligence.ts` +
 * `exercise-detail-engine.ts`) — esta página só resolve o ID uma vez,
 * memoiza o resultado em estado local e distribui para as seções (§3, §33:
 * nada é recalculado por card, nenhum motor roda mais de uma vez por
 * navegação).
 */
export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ExerciseDetailData | null | undefined>(undefined)

  useEffect(() => {
    const resolved = resolveExercise(params.id)
    if (!resolved) {
      setData(null)
      return
    }
    setData({
      resolved,
      summary: getExerciseHistorySummary(params.id),
      records: getExercisePersonalRecords(params.id),
      trends: getExerciseTrends(params.id),
      executions: getExerciseTimeline(params.id, "newest_first"),
      substitutions: getExerciseSubstitutionInsights(params.id),
      related: getExerciseRelatedWorkouts(params.id),
      dataQuality: getExerciseDataQuality(params.id),
    })
  }, [params.id])

  if (data === undefined) return <SkeletonPageLoader />

  if (data === null) {
    return (
      <div className="page">
        <Link href="/treinos" className="text-xs text-muted">← Voltar aos treinos</Link>
        <EmptyState
          icon="🔍"
          title="Exercício não encontrado"
          description="Não há registro deste exercício na biblioteca nem no histórico."
          action={
            <Link href="/treinos" className="btn btn--primary">
              Ver biblioteca de exercícios
            </Link>
          }
        />
      </div>
    )
  }

  const { resolved, summary, records, trends, executions, substitutions, related, dataQuality } = data
  const loadTrend = trends.find((t) => t.metric === "load")

  return (
    <div className="page page--wide">
      <ExerciseDetailHeader resolved={resolved} summary={summary} loadTrend={loadTrend} records={records} />

      {dataQuality.status === "no_data" ? (
        <section className="card">
          <p className="text-sm text-secondary">
            Este exercício ainda não possui execuções registradas.
            {resolved.origin === "history_only" && " O nome foi preservado a partir de execuções anteriores."}
          </p>
        </section>
      ) : (
        summary && <ExerciseSummarySection summary={summary} dataQuality={dataQuality} />
      )}

      {resolved.availability === "removed" && (
        <p className="text-xs text-muted">
          Este exercício não está mais na biblioteca ativa — o histórico e os recordes continuam preservados.
        </p>
      )}

      {dataQuality.status !== "no_data" && (
        <div className="exercise-detail-grid">
          <div className="exercise-detail-grid__trends">
            <ExerciseTrendsSection trends={trends} />
          </div>
          <div className="exercise-detail-grid__records">
            <ExerciseRecordsSection records={records} />
          </div>
          <div className="exercise-detail-grid__charts">
            <ExerciseChartsSection exerciseId={resolved.exerciseId} dataQuality={dataQuality} />
          </div>
          <div className="exercise-detail-grid__substitutions">
            <ExerciseSubstitutionsSection insights={substitutions} />
          </div>
          <div className="exercise-detail-grid__timeline">
            <ExerciseTimelineSection executions={executions} />
          </div>
          <div className="exercise-detail-grid__related">
            <ExerciseRelatedSection related={related} />
          </div>
        </div>
      )}
    </div>
  )
}
