"use client"

import Link from "next/link"
import type { ExerciseSubstitutionInsights } from "@/lib/exercise-intelligence"
import { RECURRING_SUBSTITUTION_THRESHOLD } from "@/lib/adaptive-recommendations"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

type ExerciseSubstitutionsSectionProps = {
  insights: ExerciseSubstitutionInsights | null
}

/**
 * Substituições (Sprint 22 §22/§23/§24). O callout de recomendação
 * relacionada não duplica `adaptive-recommendations.ts` — só reaproveita o
 * mesmo limiar exportado (`RECURRING_SUBSTITUTION_THRESHOLD`) para explicar
 * por que a regra `review_exercise` pode estar ativa para este exercício em
 * algum programa, sem recalcular a recomendação em si (isso depende de
 * contexto de programa que esta página não tem — link para o Planner, onde
 * a recomendação de fato aparece).
 */
export function ExerciseSubstitutionsSection({ insights }: ExerciseSubstitutionsSectionProps) {
  if (!insights || (insights.timesReplaced === 0 && insights.timesUsedAsReplacement === 0)) {
    return null
  }

  const showReviewCallout = insights.timesReplaced >= RECURRING_SUBSTITUTION_THRESHOLD

  return (
    <section className="card" aria-labelledby="exercise-substitutions-title">
      <h2 id="exercise-substitutions-title" className="section-label">Substituições</h2>

      {showReviewCallout && (
        <div className="target-card" style={{ textAlign: "left", cursor: "default", marginTop: "var(--space-2)", borderColor: "var(--color-accent)" }}>
          <span className="text-sm font-semibold text-primary">Substituído repetidamente</span>
          <p className="text-xs text-secondary" style={{ marginTop: "var(--space-1)" }}>
            {insights.exerciseName} foi substituído em {insights.timesReplaced} sessões — pode valer revisar o próximo bloco do programa.
          </p>
          <Link href="/plano" className="text-xs" style={{ marginTop: "var(--space-1)", display: "inline-block", color: "var(--color-accent)" }}>
            Ver recomendações no Planner
          </Link>
        </div>
      )}

      <div className="stat-grid stat-grid--2" style={{ marginTop: "var(--space-3)" }}>
        {insights.timesReplaced > 0 && (
          <div className="stat-cell">
            <div className="stat-cell__label">Substituído por outro</div>
            <div className="stat-cell__value">{insights.timesReplaced}x</div>
          </div>
        )}
        {insights.timesUsedAsReplacement > 0 && (
          <div className="stat-cell">
            <div className="stat-cell__label">Usado como substituto</div>
            <div className="stat-cell__value">{insights.timesUsedAsReplacement}x</div>
          </div>
        )}
        {insights.replacementRate !== undefined && (
          <div className="stat-cell">
            <div className="stat-cell__label">Taxa de substituição</div>
            <div className="stat-cell__value">{Math.round(insights.replacementRate * 100)}%</div>
          </div>
        )}
        {insights.lastOccurrenceAt && (
          <div className="stat-cell">
            <div className="stat-cell__label">Última ocorrência</div>
            <div className="stat-cell__value">{formatDate(insights.lastOccurrenceAt)}</div>
          </div>
        )}
      </div>

      {insights.mostCommonReplacements.length > 0 && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <span className="text-xs text-muted">Substitutos mais comuns</span>
          <div className="flex flex-col gap-1" style={{ marginTop: "var(--space-1)" }}>
            {insights.mostCommonReplacements.map((r) => (
              <div key={r.exerciseId} className="flex items-center justify-between text-xs">
                <span className="text-secondary">{r.exerciseName}</span>
                <span className="text-muted">{r.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.mostCommonReasons.length > 0 && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <span className="text-xs text-muted">Motivos mais comuns</span>
          <div className="flex flex-col gap-1" style={{ marginTop: "var(--space-1)" }}>
            {insights.mostCommonReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-xs">
                <span className="text-secondary">{r.reason}</span>
                <span className="text-muted">{r.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
