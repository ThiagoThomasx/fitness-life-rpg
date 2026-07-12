"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCharacterStore, xpProgress, xpToNextLevel } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { useRewardStore } from "@/stores/useRewardStore"
import { addRewardEvent } from "@/lib/reward-events"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { getDailyMissions, buildMissionsInput, completeMission, getMissionCompletions, type DailyMission } from "@/lib/daily-missions"
import { getWeeklyProgress, type WeeklyProgress } from "@/lib/weekly-progress"
import { getWeeklyPlanProgress } from "@/lib/weekly-plan"
import type { WeeklyPlanProgress } from "@/types/planning"
import { getPreferences } from "@/lib/preferences"
import { getTodayRecommendation, type WorkoutRecommendation } from "@/lib/recommendations"
import { LevelUpModal } from "@/components/ui/LevelUpModal"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"
import { useHasHydrated } from "@/hooks/useHasHydrated"
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
  const applyDiaryXp = useCharacterStore((s) => s.applyDiaryXp)
  const characterHydrated = useHasHydrated(useCharacterStore)
  const { earnedBadges, refreshBadges } = useBadgeStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const [missions, setMissions] = useState<DailyMission[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null)
  const [planProgress, setPlanProgress] = useState<WeeklyPlanProgress | null>(null)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [todayRec, setTodayRec] = useState<WorkoutRecommendation | null>(null)
  const router = useRouter()

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
    // Só compara/grava depois da store reidratar: o fallback mock (nível 1)
    // sobrescrevia rpg_last_seen_level e fazia o modal repetir no refresh.
    if (!storeCharacter) return
    const prevLevel = Number(localStorage.getItem("rpg_last_seen_level") ?? 0)
    if (prevLevel > 0 && storeCharacter.level > prevLevel) {
      setLevelUpLevel(storeCharacter.level)
    }
    if (storeCharacter.level > 0) {
      localStorage.setItem("rpg_last_seen_level", String(storeCharacter.level))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeCharacter?.level])

  function handleCompleteMission(id: string) {
    // Checa a fonte da verdade (localStorage) de forma síncrona: evita
    // creditar XP duas vezes em cliques duplicados antes do re-render.
    if (getMissionCompletions()[id]) return
    const mission = missions.find((m) => m.id === id)
    completeMission(id)
    setMissions(getDailyMissions(buildMissionsInput()))
    if (mission) {
      applyDiaryXp(mission.xpReward)
      pushReward(addRewardEvent({
        type: "xp",
        title: mission.title,
        subtitle: "Missão concluída!",
        value: `+${mission.xpReward} XP`,
        icon: mission.icon,
      }))
    }
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
        {!characterHydrated ? (
          <SkeletonCard height="340px" />
        ) : (
          <DashboardHero
            character={character}
            progress={progress}
            needed={needed}
            weeklyProgress={weeklyProgress}
          />
        )}

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
