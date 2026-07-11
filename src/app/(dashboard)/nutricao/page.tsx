"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getNutritionGoal,
  saveNutritionGoal,
  getTodayNutritionLog,
  getNutritionLogs,
  getNutritionStreak,
  DEFAULT_GOAL,
  type NutritionGoal,
  type NutritionLog,
} from "@/lib/nutrition"
import { NutritionHeader } from "@/components/nutrition/NutritionHeader"
import { StreakBanner } from "@/components/nutrition/StreakBanner"
import { GoalSection } from "@/components/nutrition/GoalSection"
import { TodayLogSection } from "@/components/nutrition/TodayLogSection"
import { HistorySection } from "@/components/nutrition/HistorySection"

export default function NutricaoPage() {
  const [goal, setGoal] = useState<NutritionGoal>(DEFAULT_GOAL)
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null)
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [streak, setStreak] = useState(0)

  const reload = useCallback(() => {
    setGoal(getNutritionGoal())
    setTodayLog(getTodayNutritionLog())
    setLogs(getNutritionLogs())
    setStreak(getNutritionStreak())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  function handleGoalSave(g: NutritionGoal) {
    saveNutritionGoal(g)
    setGoal(g)
  }

  return (
    <div className="page page--tight">
      <NutritionHeader />
      <StreakBanner streak={streak} />
      <GoalSection goal={goal} onSave={handleGoalSave} />
      <TodayLogSection goal={goal} todayLog={todayLog} onSaved={(log) => { setTodayLog(log); reload() }} />
      <HistorySection logs={logs} />
    </div>
  )
}
