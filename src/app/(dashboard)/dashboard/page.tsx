"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCharacterStore, xpProgress, xpToNextLevel } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { getDailyMissions, buildMissionsInput, completeMission, type DailyMission } from "@/lib/daily-missions"
import { getWeeklyProgress, type WeeklyProgress } from "@/lib/weekly-progress"
import { getWeeklyPlanProgress } from "@/lib/weekly-plan"
import type { WeeklyPlanProgress } from "@/types/planning"
import { getPreferences } from "@/lib/preferences"
import { getTodayRecommendation, type WorkoutRecommendation } from "@/lib/recommendations"
import { LevelUpModal } from "@/components/ui/LevelUpModal"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"
import { DashboardHero } from "@/components/dashboard/DashboardHero"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { MetricsGrid } from "@/components/dashboard/MetricsGrid"
import { RecommendationCard } from "@/components/dashboard/RecommendationCard"
import { MissionsSection } from "@/components/dashboard/MissionsSection"
import { WeeklyPlanCard } from "@/components/dashboard/WeeklyPlanCard"
import { TodaySection } from "@/components/dashboard/TodaySection"
import { RecentBadges } from "@/components/dashboard/RecentBadges"
import { NextMilestone } from "@/components/dashboard/NextMilestone"
import { LastWorkout } from "@/components/dashboard/LastWorkout"

export default function DashboardPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const { earnedBadges, refreshBadges } = useBadgeStore()
  const [missions, setMissions] = useState<DailyMission[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  const [planProgress, setPlanProgress] = useState<WeeklyPlanProgress | null>(null)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [todayRec, setTodayRec] = useState<WorkoutRecommendation | null>(null)
  const router = useRouter()

  const prevLevel = typeof window !== "undefined"
    ? Number(localStorage.getItem("rpg_last_seen_level") ?? 0)
    : 0

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  useEffect(() => {
    const input = buildMissionsInput()
    setMissions(getDailyMissions(input))
    setWeeklyProgress(getWeeklyProgress())
    setPlanProgress(getWeeklyPlanProgress())
    setTotalWorkouts(input.totalWorkouts)
    const prefs = getPreferences()
    if (!prefs.onboardingCompleted) {
      setShowOnboarding(true)
    } else {
      setTodayRec(getTodayRecommendation(prefs))
    }
    setLoaded(true)
  }, [])

  const character = storeCharacter ?? MOCK_CHARACTER
  const needed = xpToNextLevel(character.level)
  const progress = xpProgress(character)

  useEffect(() => {
    if (prevLevel > 0 && character.level > prevLevel) {
      setLevelUpLevel(character.level)
    }
    if (character.level > 0) {
      localStorage.setItem("rpg_last_seen_level", String(character.level))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.level])

  function handleCompleteMission(id: string) {
    completeMission(id)
    setMissions(getDailyMissions(buildMissionsInput()))
  }

  return (
    <>
      {levelUpLevel && <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />}
      {showOnboarding && (
        <OnboardingModal onComplete={() => {
          setShowOnboarding(false)
          setTodayRec(getTodayRecommendation(getPreferences()))
        }} />
      )}

      <div className="page page--wide page--tight">
        <DashboardHero
          character={character}
          progress={progress}
          needed={needed}
          weeklyProgress={weeklyProgress}
        />

        <QuickActions />

        {!loaded ? (
          <SkeletonCard height="120px" />
        ) : (
          <MetricsGrid
            weeklyProgress={weeklyProgress}
            totalWorkouts={totalWorkouts}
            totalXp={character.total_xp}
          />
        )}

        {todayRec && <RecommendationCard rec={todayRec} />}

        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3">
            {!loaded ? (
              <SkeletonCard height="140px" />
            ) : (
              <MissionsSection missions={missions} onComplete={handleCompleteMission} />
            )}
            <LastWorkout />
          </div>

          <div className="flex flex-col gap-3">
            {planProgress && <WeeklyPlanCard planProgress={planProgress} />}
            <TodaySection />
            {earnedBadges.length > 0 && <RecentBadges badges={earnedBadges} />}
            <NextMilestone totalWorkouts={totalWorkouts} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => router.push("/treinos")} className="btn btn--primary btn--lg">
            Treinar agora
          </button>
          <button onClick={() => router.push("/diario")} className="btn btn--secondary btn--lg">
            Abrir diário
          </button>
        </div>
      </div>
    </>
  )
}
