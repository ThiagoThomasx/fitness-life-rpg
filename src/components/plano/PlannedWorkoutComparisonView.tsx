import Link from "next/link"
import type { PlannedPerformedComparison, ExercisePlannedPerformedComparison } from "@/lib/planned-performed-comparison"

const MATCH_LABELS: Record<ExercisePlannedPerformedComparison["matchStatus"], string> = {
  matched: "Realizado",
  planned_only: "Planejado, não realizado",
  performed_only: "Adicionado na sessão",
  ambiguous: "Ambíguo — não foi possível parear",
}

function formatDelta(value: number | undefined, unit: string): string | null {
  if (value === undefined || Math.abs(value) < 0.01) return null
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}${unit}`
}

function ExerciseComparisonRow({ comparison }: { comparison: ExercisePlannedPerformedComparison }) {
  const { planned, performed, differences, matchStatus } = comparison
  const badgeVariant =
    matchStatus === "matched" ? "badge-pill--accent" : matchStatus === "planned_only" ? "badge-pill--level" : "badge-pill--level"
  // Exercícios "planned_only" (não realizados) não têm `performedExerciseId` — nesse caso
  // o link usa `plannedExerciseId`, que só resolve se o exercício planejado tiver vínculo de
  // catálogo (templates podem referenciar só por nome — ver exercise-intelligence.ts).
  const linkExerciseId = comparison.performedExerciseId ?? comparison.plannedExerciseId

  return (
    <div className="target-card" style={{ textAlign: "left" }}>
      <div className="flex items-center justify-between">
        {linkExerciseId ? (
          <Link href={`/exercicios/${linkExerciseId}`} className="text-sm font-semibold text-primary" style={{ textDecoration: "none" }}>
            {comparison.exerciseName}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-primary">{comparison.exerciseName}</span>
        )}
        <span className={`badge-pill ${badgeVariant}`}>{MATCH_LABELS[matchStatus]}</span>
      </div>

      {comparison.wasSubstitution && (
        <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
          substituído de <span className="font-semibold">{comparison.substitutedFromExerciseName}</span>
        </div>
      )}

      {(planned || performed) && (
        <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
          {planned && (
            <div>
              Planejado: {planned.sets ?? "—"}x{planned.reps ?? "—"}
              {planned.loadKg !== undefined && ` · ${planned.loadKg}kg`}
            </div>
          )}
          {performed && (
            <div>
              Realizado: {performed.completedSets ?? 0} série(s)
              {performed.averageLoadKg !== undefined && ` · média ${performed.averageLoadKg.toFixed(1)}kg`}
              {performed.maximumLoadKg !== undefined && ` · máx ${performed.maximumLoadKg}kg`}
            </div>
          )}
        </div>
      )}

      {differences && (
        <div className="text-xs" style={{ marginTop: "var(--space-1)" }}>
          {[
            formatDelta(differences.setsDifference, " séries"),
            differences.repsComparable ? formatDelta(differences.repsDifference, " reps") : null,
            formatDelta(differences.loadDifferenceKg, "kg carga"),
            formatDelta(differences.volumeDifferenceKg, "kg volume"),
          ]
            .filter((v): v is string => v !== null)
            .join(" · ") || "Sem desvio relevante"}
        </div>
      )}
    </div>
  )
}

type PlannedWorkoutComparisonViewProps = {
  comparison: PlannedPerformedComparison
}

/**
 * Sprint 21 Parte 2 — visão pós-execução do treino planejado. Nunca inventa
 * dado ausente: quando o planejado não tinha meta definida, mostra "—" em
 * vez de tratar como zero (o motor `planned-performed-comparison.ts` já
 * garante isso; este componente só formata o que recebe).
 */
export function PlannedWorkoutComparisonView({ comparison }: PlannedWorkoutComparisonViewProps) {
  const { sessionSummary, exerciseComparisons, dataStatus } = comparison

  if (dataStatus === "insufficient_data") {
    return (
      <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
        Ainda não há sessão realizada vinculada a este treino planejado.
      </p>
    )
  }

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "var(--space-3)" }}>
        <div className="target-card" style={{ textAlign: "left" }}>
          <span className="text-xs text-muted">Exercícios</span>
          <div className="text-sm font-semibold text-primary">
            {sessionSummary.matchedExerciseCount + sessionSummary.addedExerciseCount}/{sessionSummary.plannedExerciseCount} planejados
          </div>
          {sessionSummary.skippedExerciseCount > 0 && (
            <div className="text-xs text-muted">{sessionSummary.skippedExerciseCount} não realizado(s)</div>
          )}
          {sessionSummary.addedExerciseCount > 0 && (
            <div className="text-xs text-muted">{sessionSummary.addedExerciseCount} adicionado(s)</div>
          )}
        </div>
        <div className="target-card" style={{ textAlign: "left" }}>
          <span className="text-xs text-muted">Volume</span>
          <div className="text-sm font-semibold text-primary">
            {sessionSummary.performedVolume !== undefined ? `${Math.round(sessionSummary.performedVolume)}kg` : "—"}
          </div>
          <div className="text-xs text-muted">
            planejado: {sessionSummary.plannedVolume !== undefined ? `${Math.round(sessionSummary.plannedVolume)}kg` : "sem meta definida"}
          </div>
        </div>
      </div>

      {dataStatus === "partial" && (
        <p className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
          Alguns exercícios não puderam ser pareados automaticamente (nome ambíguo).
        </p>
      )}

      <div className="flex flex-col gap-2">
        {exerciseComparisons.map((c, idx) => (
          <ExerciseComparisonRow key={`${c.plannedExerciseId ?? c.performedExerciseId ?? idx}`} comparison={c} />
        ))}
      </div>
    </div>
  )
}
