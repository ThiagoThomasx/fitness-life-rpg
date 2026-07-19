"use client"

import { useEffect, useState } from "react"
import {
  buildWellnessAssociationsOverview,
  getActiveCycleWellnessOverview,
  type WellnessAssociationsOverview,
  type ActiveCycleWellnessOverview,
} from "@/lib/wellness-overview"
import type { WellnessAssociation, WellnessAssociationConfidence } from "@/lib/wellness-associations"
import { ChartHeader } from "./ChartCard"
import { CycleWellnessSection } from "@/components/plano/CycleWellnessSection"

const CONFIDENCE_LABELS: Record<WellnessAssociationConfidence, string> = {
  low: "Confiança baixa",
  medium: "Confiança média",
  high: "Confiança alta",
}

const CONFIDENCE_EXPLANATION =
  "A confiança considera quantidade de registros, duração do período e consistência da diferença observada. Não representa prova estatística."

function AssociationCard({ association }: { association: WellnessAssociation }) {
  return (
    <div
      style={{
        padding: "0.625rem 0.75rem",
        borderRadius: 8,
        background: "var(--color-bg-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <p style={{ fontSize: "0.8rem", color: "var(--color-text-primary)", margin: 0 }}>
        {association.explanation}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
        <span title={CONFIDENCE_EXPLANATION}>{CONFIDENCE_LABELS[association.confidence]}</span>
        <span>
          {association.sampleSize} semana{association.sampleSize !== 1 ? "s" : ""} analisada
          {association.sampleSize !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}

export function WellnessAssociationsSection() {
  const [overview, setOverview] = useState<WellnessAssociationsOverview | null>(null)
  const [activeCycle, setActiveCycle] = useState<ActiveCycleWellnessOverview | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setOverview(buildWellnessAssociationsOverview())
    setActiveCycle(getActiveCycleWellnessOverview())
    setLoaded(true)
  }, [])

  if (!loaded || !overview) return null
  if (overview.dataStatus === "no_data" && !activeCycle) return null

  return (
    <section>
      <h2 className="section-label" style={{ marginBottom: "0.75rem" }}>Associações no seu histórico</h2>

      <section className="card">
        <ChartHeader
          title="Bem-estar × treino"
          description="Coincidências observadas no seu histórico — não indicam causa"
        />

        {overview.dataStatus === "no_data" && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            Registre alguns check-ins de prontidão para começar a identificar associações com o seu treino.
          </p>
        )}

        {overview.dataStatus === "insufficient_data" && overview.checkInCount > 0 && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            Ainda não há registros suficientes para identificar associações estáveis entre bem-estar e treino.
            Continue registrando check-ins e concluindo treinos para que essa análise apareça aqui.
          </p>
        )}

        {overview.dataStatus === "available" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {overview.associations.map((association) => (
              <AssociationCard key={association.id} association={association} />
            ))}
          </div>
        )}
      </section>

      {activeCycle && (
        <div style={{ marginTop: "0.75rem" }}>
          <CycleWellnessSection
            summary={activeCycle.summary}
            averageReadiness={activeCycle.summary.averageReadiness}
          />
        </div>
      )}
    </section>
  )
}
