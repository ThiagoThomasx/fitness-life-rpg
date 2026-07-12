"use client"

import { useEffect, useState } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"
import { useBadgeStore } from "@/stores/useBadgeStore"
import { BADGE_DEFINITIONS } from "@/lib/badges"
import { getWorkoutHistory } from "@/lib/workout-history"
import { getDiaryCount } from "@/lib/daily-log"
import { getRewardHistory, type RewardEvent } from "@/lib/reward-events"
import { getProfileRecordStats, type ProfileRecordStats } from "@/lib/exercise-records"
import { MOCK_CHARACTER } from "@/lib/mock/data"
import { ProfileHero } from "@/components/profile/ProfileHero"
import { LevelProgressCard } from "@/components/profile/LevelProgressCard"
import { AttributesGrid } from "@/components/profile/AttributesGrid"
import { BadgesGrid } from "@/components/profile/BadgesGrid"
import { RecordsSection } from "@/components/profile/RecordsSection"
import { RewardsHistory } from "@/components/profile/RewardsHistory"
import { ProfileLinks } from "@/components/profile/ProfileLinks"

const AVATAR_KEY = "lrpg-fit:avatar"
const NAME_KEY = "lrpg-fit:char-name"
const DEFAULT_AVATAR = "🧙"

type ProfileStats = {
  workouts: number
  diaries: number
  prs: number
}

export default function PerfilPage() {
  const storeCharacter = useCharacterStore((s) => s.character)
  const setCharacter = useCharacterStore((s) => s.setCharacter)
  const { earnedBadges, refreshBadges } = useBadgeStore()
  const character = storeCharacter ?? MOCK_CHARACTER

  const [stats, setStats] = useState<ProfileStats>({ workouts: 0, diaries: 0, prs: 0 })
  const [recordStats, setRecordStats] = useState<ProfileRecordStats | null>(null)
  const [rewards, setRewards] = useState<RewardEvent[]>([])
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [charName, setCharName] = useState(character.name)

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  // localStorage só depois do mount (evita mismatch de hydration)
  useEffect(() => {
    const history = getWorkoutHistory()
    setStats({
      workouts: history.length,
      diaries: getDiaryCount(),
      prs: history.reduce((acc, w) => acc + (w.prsCount ?? 0), 0),
    })
    setRewards(getRewardHistory())
    setRecordStats(getProfileRecordStats())
    setAvatar(window.localStorage.getItem(AVATAR_KEY) ?? DEFAULT_AVATAR)
  }, [])

  useEffect(() => {
    setCharName(window.localStorage.getItem(NAME_KEY) ?? character.name)
  }, [character.name])

  function handleSaveName(name: string) {
    window.localStorage.setItem(NAME_KEY, name)
    setCharName(name)
    setCharacter({ ...character, name })
  }

  function handlePickAvatar(next: string) {
    window.localStorage.setItem(AVATAR_KEY, next)
    setAvatar(next)
  }

  const earnedCount = new Set(earnedBadges.map((b) => b.badgeId)).size

  return (
    <div className="page">
      <ProfileHero
        character={character}
        charName={charName}
        avatar={avatar}
        earnedCount={earnedCount}
        stats={stats}
        onSaveName={handleSaveName}
        onPickAvatar={handlePickAvatar}
      />

      <LevelProgressCard character={character} />

      <section aria-labelledby="perfil-atributos">
        <div className="section-header">
          <h2 id="perfil-atributos" className="section-header__title">
            Atributos
          </h2>
        </div>
        <AttributesGrid character={character} />
      </section>

      <section aria-labelledby="perfil-conquistas">
        <div className="section-header">
          <h2 id="perfil-conquistas" className="section-header__title">
            Conquistas
          </h2>
          <span className="numeric text-xs text-muted">
            {earnedCount}/{BADGE_DEFINITIONS.length}
          </span>
        </div>
        <BadgesGrid
          earnedBadges={earnedBadges}
          progressCtx={{
            workoutCount: stats.workouts,
            totalPrs: stats.prs,
            diaryCount: stats.diaries,
            character,
          }}
        />
      </section>

      <section aria-labelledby="perfil-recordes">
        <div className="section-header">
          <h2 id="perfil-recordes" className="section-header__title">
            Recordes
          </h2>
        </div>
        {recordStats && <RecordsSection stats={recordStats} />}
      </section>

      <section aria-labelledby="perfil-recompensas">
        <div className="section-header">
          <h2 id="perfil-recompensas" className="section-header__title">
            Recompensas recentes
          </h2>
        </div>
        <RewardsHistory events={rewards} />
      </section>

      <section aria-labelledby="perfil-dados">
        <h2 id="perfil-dados" className="section-label">
          Dados & configurações
        </h2>
        <ProfileLinks />
      </section>
    </div>
  )
}
