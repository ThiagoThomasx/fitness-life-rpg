"use client"

import { useEffect, useState } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import {
  saveNutritionLog,
  getNutritionStreak,
  getNutritionCount,
  NUTRITION_XP,
  type NutritionGoal,
  type NutritionLog,
} from "@/lib/nutrition"
import { checkAndEarnBadges } from "@/lib/badges"
import { addRewardEvent } from "@/lib/reward-events"
import { getWorkoutHistory } from "@/lib/workout-history"
import { getDiaryCount } from "@/lib/daily-log"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { MACRO_COLORS } from "@/lib/theme-colors"
import { CalorieRing } from "./CalorieRing"
import { MacroBar } from "./MacroBar"
import { NumberInput } from "./NumberInput"

type Props = {
  goal: NutritionGoal
  todayLog: NutritionLog | null
  onSaved: (log: NutritionLog) => void
}

export function TodayLogSection({ goal, todayLog, onSaved }: Props) {
  const { applyDiaryXp } = useCharacterStore()
  const { pushReward } = useRewardStore()
  const { refreshBadges } = useBadgeStore()
  const character = useCharacterStore((s) => s.character) ?? MOCK_CHARACTER

  const [calories, setCalories] = useState(todayLog?.calories ?? 0)
  const [protein, setProtein] = useState(todayLog?.protein_g ?? 0)
  const [carbs, setCarbs] = useState(todayLog?.carbs_g ?? 0)
  const [fat, setFat] = useState(todayLog?.fat_g ?? 0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (todayLog) {
      setCalories(todayLog.calories)
      setProtein(todayLog.protein_g)
      setCarbs(todayLog.carbs_g)
      setFat(todayLog.fat_g)
    }
  }, [todayLog])

  function handleSave() {
    const isFirstLog = todayLog === null
    const log = saveNutritionLog({ calories, protein_g: protein, carbs_g: carbs, fat_g: fat }, isFirstLog)

    if (isFirstLog) {
      applyDiaryXp(NUTRITION_XP)
      const ev = addRewardEvent({ type: "xp", title: `+${NUTRITION_XP} XP`, subtitle: "Nutrição registrada!", value: String(NUTRITION_XP), icon: "🥗" })
      pushReward(ev)

      const history = getWorkoutHistory()
      const newlyEarned = checkAndEarnBadges({
        workoutCount: history.length,
        totalPrs: history.reduce((s, w) => s + w.prsCount, 0),
        level: character.level,
        diaryCount: getDiaryCount(),
        strength: character.strength,
        agility: character.agility,
        dexterity: character.dexterity,
        constitution: character.constitution,
        vitality: character.vitality,
        nutritionCount: getNutritionCount(),
        nutritionStreak: getNutritionStreak(),
      })
      refreshBadges()
      for (const badge of newlyEarned) {
        const bev = addRewardEvent({ type: "badge", title: badge.name, subtitle: badge.description, icon: badge.icon })
        pushReward(bev)
      }
    }

    setSaved(true)
    onSaved(log)
    setTimeout(() => setSaved(false), 2000)
  }

  const caloriesOver = calories > goal.calories

  return (
    <section className="card">
      <div className="section-label">Registro de hoje</div>

      <div className="today-log__summary">
        <CalorieRing calories={calories} goal={goal.calories} />
        <div className="today-log__summary-body">
          <div className="today-log__goal">
            Meta: <strong className="text-primary">{goal.calories} kcal</strong>
          </div>
          <div className={caloriesOver ? "today-log__remaining today-log__remaining--over" : "today-log__remaining"}>
            {caloriesOver ? `${calories - goal.calories} kcal acima da meta` : `${goal.calories - calories} kcal restantes`}
          </div>
          {todayLog && <div className="today-log__xp-granted">✓ XP já concedido hoje</div>}
        </div>
      </div>

      <div className="today-log__macros">
        <MacroBar label="Proteína" value={protein} goal={goal.protein_g} color={MACRO_COLORS.protein} />
        <MacroBar label="Carboidrato" value={carbs} goal={goal.carbs_g} color={MACRO_COLORS.carbs} />
        <MacroBar label="Gordura" value={fat} goal={goal.fat_g} color={MACRO_COLORS.fat} />
      </div>

      <div className="today-log__inputs">
        <NumberInput label="Calorias" value={calories} onChange={setCalories} unit="kcal" max={10000} />
        <NumberInput label="Proteína" value={protein} onChange={setProtein} unit="g" />
        <NumberInput label="Carboidrato" value={carbs} onChange={setCarbs} unit="g" />
        <NumberInput label="Gordura" value={fat} onChange={setFat} unit="g" />
      </div>

      <button
        onClick={handleSave}
        className={saved ? "btn btn--full today-log__save today-log__save--done" : "btn btn--primary btn--full"}
      >
        {saved ? "✓ Salvo!" : todayLog ? "Atualizar registro" : `Registrar (+${NUTRITION_XP} XP)`}
      </button>
    </section>
  )
}
