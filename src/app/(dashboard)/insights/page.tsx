"use client"

import { useEffect, useState } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { computeInsights, type InsightsData } from "@/lib/insights"
import { getPreferences, GOAL_LABELS, GOAL_ICONS } from "@/lib/preferences"
import { SkeletonPageLoader } from "@/components/ui/Skeleton"
import { InsightsHeader } from "@/components/insights/InsightsHeader"
import { SummarySection } from "@/components/insights/SummarySection"
import { NarrativeSection } from "@/components/insights/NarrativeSection"
import { WeekVolumeSection } from "@/components/insights/WeekVolumeSection"
import { DayFrequencySection } from "@/components/insights/DayFrequencySection"
import { ExerciseLoadSection } from "@/components/insights/ExerciseLoadSection"
import { CategorySection } from "@/components/insights/CategorySection"
import { PrsSection } from "@/components/insights/PrsSection"
import { AttributesSection } from "@/components/insights/AttributesSection"
import { TagsSection } from "@/components/insights/TagsSection"
import { NutritionSection } from "@/components/insights/NutritionSection"

export default function InsightsPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const [data, setData] = useState<InsightsData | null>(null)
  const [goal, setGoal] = useState<{ label: string; icon: string } | null>(null)

  useEffect(() => {
    setData(computeInsights())
    const prefs = getPreferences()
    if (prefs.onboardingCompleted) {
      setGoal({ label: GOAL_LABELS[prefs.goal], icon: GOAL_ICONS[prefs.goal] })
    }
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const totalXp = Math.floor(character.total_xp)

  if (!data) return <SkeletonPageLoader />

  const hasAnyData = data.totalWorkouts > 0

  return (
    <div className="page">
      <InsightsHeader data={data} totalXp={totalXp} goal={goal} />

      {!hasAnyData ? (
        <section className="card card--dashed empty-state">
          <div className="empty-state__icon" aria-hidden="true">🚀</div>
          <h2 className="display-heading" style={{ fontSize: "var(--text-xl)" }}>Seus dados aparecerão aqui</h2>
          <p className="empty-state__desc" style={{ maxWidth: 320 }}>
            Complete seu primeiro treino para começar a ver sua evolução em gráficos e métricas personalizadas.
          </p>
          <a href="/treinos" className="btn btn--primary">
            Iniciar primeiro treino
          </a>
        </section>
      ) : (
        <>
          <SummarySection data={data} totalXp={totalXp} />
          <NarrativeSection data={data} />

          <div className="insights-chart-grid">
            <WeekVolumeSection data={data} />
            <DayFrequencySection data={data} />
          </div>

          <ExerciseLoadSection data={data} />

          <div className="insights-chart-grid">
            <CategorySection data={data} />
            <PrsSection data={data} />
          </div>

          <AttributesSection character={character} />
          <TagsSection data={data} />
          <NutritionSection weeks={data.nutritionWeeks} />
        </>
      )}
    </div>
  )
}
