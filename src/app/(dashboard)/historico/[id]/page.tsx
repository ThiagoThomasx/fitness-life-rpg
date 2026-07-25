"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getWorkoutDetail, type WorkoutDetailData } from "@/lib/workout-detail-engine"
import { EmptyState } from "@/components/ui/EmptyState"
import { SkeletonPageLoader } from "@/components/ui/Skeleton"
import { WorkoutDetailHeader } from "@/components/historico/WorkoutDetailHeader"
import { WorkoutDetailSummary } from "@/components/historico/WorkoutDetailSummary"
import { WorkoutDetailExercisesSection } from "@/components/historico/WorkoutDetailExercisesSection"
import { WorkoutDetailReadinessSection } from "@/components/historico/WorkoutDetailReadinessSection"
import { WorkoutDetailTrainingLoadSection } from "@/components/historico/WorkoutDetailTrainingLoadSection"
import { WorkoutDetailTimelineSection } from "@/components/historico/WorkoutDetailTimelineSection"
import { WorkoutDetailRecordsSection } from "@/components/historico/WorkoutDetailRecordsSection"
import { PlannedWorkoutComparisonView } from "@/components/plano/PlannedWorkoutComparisonView"

/**
 * `/historico/[id]` — página definitiva de uma sessão concluída (Sprint 22
 * Parte 3A). Todo o cálculo vem de `workout-detail-engine.ts`, que só compõe
 * motores já existentes (readiness, comparação planejado×realizado, carga
 * semanal, programa, recordes) — nada é recalculado aqui.
 */
export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<WorkoutDetailData | null | undefined>(undefined)

  useEffect(() => {
    setData(getWorkoutDetail(params.id) ?? null)
  }, [params.id])

  if (data === undefined) return <SkeletonPageLoader />

  if (data === null) {
    return (
      <div className="page">
        <Link href="/treinos" className="text-xs text-muted">← Voltar aos treinos</Link>
        <EmptyState
          icon="🔍"
          title="Sessão não encontrada"
          description="Este treino concluído não existe mais no histórico."
          action={
            <Link href="/treinos" className="btn btn--primary">
              Ver treinos
            </Link>
          }
        />
      </div>
    )
  }

  const { workout, volumeKg, totalSets, totalReps, checkIn, readinessResult, program, comparison, trainingWeek, recordEvents } = data

  return (
    <div className="page page--wide">
      <WorkoutDetailHeader workout={workout} program={program} />

      <WorkoutDetailSummary
        workout={workout}
        volumeKg={volumeKg}
        totalSets={totalSets}
        totalReps={totalReps}
        recordCount={recordEvents.length}
      />

      <WorkoutDetailRecordsSection recordEvents={recordEvents} />

      <WorkoutDetailExercisesSection exercises={workout.exercises} />

      {comparison && (
        <section className="card">
          <h2 className="section-label">Planejado × realizado</h2>
          <div style={{ marginTop: "var(--space-2)" }}>
            <PlannedWorkoutComparisonView comparison={comparison} />
          </div>
        </section>
      )}

      <WorkoutDetailTrainingLoadSection volumeKg={volumeKg} comparison={comparison} trainingWeek={trainingWeek} />

      <WorkoutDetailReadinessSection checkIn={checkIn} readinessResult={readinessResult} />

      <WorkoutDetailTimelineSection workout={workout} checkIn={checkIn} recordEvents={recordEvents} />
    </div>
  )
}
