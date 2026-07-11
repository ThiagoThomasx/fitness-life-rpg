"use client"

import { useState, useEffect } from "react"
import { getDailyLogs, createDailyLog, updateDailyLog, deleteDailyLog, DAILY_LOG_XP, type DailyLogEntry } from "@/lib/daily-log"
import { extractTags } from "@/lib/auto-tags"
import { checkAndEarnBadges } from "@/lib/badges"
import { addRewardEvent } from "@/lib/reward-events"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useRewardStore } from "@/stores/useRewardStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { getWorkoutHistory } from "@/lib/workout-history"
import { DiaryHeader } from "@/components/diary/DiaryHeader"
import { EntryForm } from "@/components/diary/EntryForm"
import { EntriesSection } from "@/components/diary/EntriesSection"

type EntryData = { energyLevel: number; sleepHours: number; mood: string; notes: string }

export default function DiarioPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { character, applyDiaryXp } = useCharacterStore()
  const pushReward = useRewardStore((s) => s.pushReward)
  const refreshBadges = useBadgeStore((s) => s.refreshBadges)

  const [todayLogs, setTodayLogs] = useState<DailyLogEntry[]>([])
  const [pastLogs, setPastLogs] = useState<DailyLogEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<DailyLogEntry | null>(null)
  const [saved, setSaved] = useState(false)

  function reload() {
    const all = getDailyLogs()
    setTodayLogs(all.filter((l) => l.date === today))
    setPastLogs(all.filter((l) => l.date !== today))
  }

  useEffect(() => {
    reload()
    // Show form automatically if no entry today
    const all = getDailyLogs()
    if (!all.some((l) => l.date === today)) {
      setShowForm(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSave(data: EntryData) {
    const tags = extractTags(data.notes)
    const isFirstEntry = todayLogs.length === 0

    if (editingLog) {
      updateDailyLog(editingLog.id, { ...data, tags })
      setEditingLog(null)
      setShowForm(false)
      reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return
    }

    const entry = createDailyLog({
      date: today,
      ...data,
      tags,
      xpEarned: isFirstEntry ? DAILY_LOG_XP : 0,
    })

    if (isFirstEntry) {
      applyDiaryXp(DAILY_LOG_XP)
      pushReward(addRewardEvent({
        type: 'xp', title: 'Diário Registrado', subtitle: 'Entrada do dia salva',
        value: `+${DAILY_LOG_XP} XP`, icon: '📓',
      }))

      const char = character ?? MOCK_CHARACTER
      const workouts = getWorkoutHistory()
      const allLogs = getDailyLogs()
      const newBadges = checkAndEarnBadges({
        workoutCount: workouts.length,
        totalPrs: workouts.reduce((a, w) => a + (w.prsCount ?? 0), 0),
        level: char.level, diaryCount: allLogs.length,
        strength: char.strength, agility: char.agility, dexterity: char.dexterity,
        constitution: char.constitution, vitality: char.vitality,
      })
      for (const badge of newBadges) {
        pushReward(addRewardEvent({
          type: 'badge', title: 'Badge Desbloqueada!', subtitle: badge.description,
          value: badge.name, icon: badge.icon,
        }))
      }
      refreshBadges()
    }

    void entry
    setShowForm(false)
    reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remover esta entrada?")) return
    deleteDailyLog(id)
    reload()
  }

  function handleEdit(log: DailyLogEntry) {
    setEditingLog(log)
    setShowForm(true)
  }

  const isFirstEntry = todayLogs.length === 0

  return (
    <div className="page page--tight">
      <DiaryHeader
        showForm={showForm}
        isFirstEntry={isFirstEntry}
        onNewEntry={() => { setEditingLog(null); setShowForm(true) }}
      />

      {showForm && (
        <EntryForm
          initial={editingLog ?? undefined}
          isFirst={isFirstEntry}
          xpValue={DAILY_LOG_XP}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingLog(null) }}
        />
      )}

      {saved && (
        <div className="alert alert--success">✓ Diário salvo!</div>
      )}

      <EntriesSection
        todayLogs={todayLogs}
        pastLogs={pastLogs}
        showForm={showForm}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
