"use client"

import Link from "next/link"
import type { ExerciseHighlightsGroups, ExerciseHighlight } from "@/lib/exercise-highlights"
import { ChartHeader } from "./ChartCard"

const GROUP_LABELS: { key: keyof ExerciseHighlightsGroups; title: string; icon: string }[] = [
  { key: "recentRecords", title: "Recordes recentes", icon: "🏆" },
  { key: "improving", title: "Em evolução", icon: "📈" },
  { key: "mostSubstituted", title: "Mais substituídos", icon: "🔄" },
  { key: "noRecentExecution", title: "Sem execução recente", icon: "🕓" },
]

function HighlightRow({ highlight }: { highlight: ExerciseHighlight }) {
  return (
    <Link
      href={`/exercicios/${highlight.exerciseId}`}
      className="flex items-center justify-between gap-2"
      style={{ textDecoration: "none", padding: "var(--space-1) 0" }}
    >
      <span className="text-sm text-secondary min-w-0 truncate">{highlight.exerciseName}</span>
      <span className="text-xs text-muted flex-shrink-0">{highlight.detail}</span>
    </Link>
  )
}

type ExerciseHighlightsSectionProps = {
  highlights: ExerciseHighlightsGroups
}

/**
 * Integração mínima de Insights com a página de detalhe do exercício
 * (Sprint 22 §36). Não inicia Analytics 2.0 — só uma lista curta por
 * categoria, cada item abrindo `/exercicios/[id]`. Grupos vazios não
 * renderizam (nunca mostra "0 destaques" como se fosse dado relevante).
 */
export function ExerciseHighlightsSection({ highlights }: ExerciseHighlightsSectionProps) {
  const visibleGroups = GROUP_LABELS.filter((g) => highlights[g.key].length > 0)
  if (visibleGroups.length === 0) return null

  return (
    <section className="card">
      <ChartHeader title="Exercícios em destaque" description="Recordes recentes, evolução, substituições e exercícios parados" />
      <div className="grid gap-4 md:grid-cols-2" style={{ marginTop: "var(--space-2)" }}>
        {visibleGroups.map((group) => (
          <div key={group.key}>
            <div className="section-label mb-2">{group.icon} {group.title}</div>
            <div className="flex flex-col">
              {highlights[group.key].map((h) => (
                <HighlightRow key={`${group.key}-${h.exerciseId}`} highlight={h} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
