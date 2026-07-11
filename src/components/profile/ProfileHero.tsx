"use client"

import { useState } from "react"
import type { Character } from "@/types/database"
import { avatarColor } from "@/lib/theme-colors"

export const AVATAR_OPTIONS = ["🧙", "⚔️", "🦸", "🏆", "🔥", "🐉", "🦁", "🌟", "💎", "🚀"]

function getCharTitle(level: number): string {
  if (level === 1) return "Iniciante em Movimento"
  if (level <= 3) return "Aventureiro"
  if (level <= 7) return "Guerreiro"
  if (level <= 12) return "Herói"
  if (level <= 20) return "Lendário"
  return "Campeão Supremo"
}

type ProfileStats = {
  workouts: number
  diaries: number
  prs: number
}

type Props = {
  character: Character
  charName: string
  avatar: string
  earnedCount: number
  stats: ProfileStats
  onSaveName: (name: string) => void
  onPickAvatar: (avatar: string) => void
}

export function ProfileHero({
  character,
  charName,
  avatar,
  earnedCount,
  stats,
  onSaveName,
  onPickAvatar,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  function handleSaveName() {
    const trimmed = nameInput.trim()
    if (trimmed) onSaveName(trimmed)
    setEditingName(false)
  }

  const heroColor = avatarColor(avatar)
  const statCells = [
    { label: "Treinos", value: stats.workouts },
    { label: "Diários", value: stats.diaries },
    { label: "PRs", value: stats.prs },
  ]

  return (
    <section
      className="profile-hero"
      aria-label="Identidade do perfil"
      style={{ "--profile-hero-color": heroColor } as React.CSSProperties}
    >
      <div className="profile-hero__backdrop" />
      <div className="profile-hero__content">
        <div className="profile-hero__row">
          <button
            type="button"
            className="profile-hero__avatar"
            onClick={() => setShowAvatarPicker((v) => !v)}
            aria-expanded={showAvatarPicker}
            aria-label={`Trocar avatar (atual: ${avatar})`}
          >
            <span aria-hidden="true">{avatar}</span>
          </button>

          <div className="profile-hero__identity">
            {editingName ? (
              <div className="name-edit">
                <input
                  autoFocus
                  className="name-edit__input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName()
                    if (e.key === "Escape") setEditingName(false)
                  }}
                  maxLength={30}
                  aria-label="Nome do perfil"
                />
                <button type="button" className="btn btn--primary" onClick={handleSaveName}>
                  OK
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setEditingName(false)}
                  aria-label="Cancelar edição do nome"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="profile-hero__name-row">
                <h1 className="profile-hero__name">{charName}</h1>
                <button
                  type="button"
                  className="profile-hero__edit-btn"
                  onClick={() => {
                    setNameInput(charName)
                    setEditingName(true)
                  }}
                  aria-label="Editar nome"
                >
                  ✏️
                </button>
              </div>
            )}
            <div className="profile-hero__title">{getCharTitle(character.level)}</div>
            <div className="profile-hero__meta">
              <span className="badge-pill badge-pill--level">Nível {character.level}</span>
              <span className="badge-pill badge-pill--xp numeric">
                {Math.floor(character.total_xp).toLocaleString("pt-BR")} XP
              </span>
              {earnedCount > 0 && (
                <span className="badge-pill badge-pill--streak numeric">🏆 {earnedCount}</span>
              )}
            </div>
          </div>
        </div>

        {showAvatarPicker && (
          <div className="avatar-picker">
            <div className="avatar-picker__label">Escolha seu avatar</div>
            <div className="avatar-picker__grid" role="group" aria-label="Opções de avatar">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    avatar === option
                      ? "avatar-picker__option avatar-picker__option--active"
                      : "avatar-picker__option"
                  }
                  aria-pressed={avatar === option}
                  aria-label={`Avatar ${option}`}
                  onClick={() => {
                    onPickAvatar(option)
                    setShowAvatarPicker(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="profile-hero__stats">
        {statCells.map((stat) => (
          <div key={stat.label} className="profile-hero__stat">
            <div className="profile-hero__stat-value">{stat.value}</div>
            <div className="profile-hero__stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
