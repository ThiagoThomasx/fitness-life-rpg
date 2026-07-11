"use client"

import type { InsightsData } from "@/lib/insights"

type Props = {
  data: InsightsData
}

export function NarrativeSection({ data }: Props) {
  const weekWorkouts = data.weekVolumes.at(-1)?.workouts ?? 0
  const topDay = data.dayFrequency.slice().sort((a, b) => b.count - a.count)[0]
  const hasEnough = data.totalWorkouts >= 3

  if (!hasEnough) {
    return (
      <section className="card narrative-card">
        <div className="narrative-card__header">
          <div className="narrative-card__icon" aria-hidden="true">🤖</div>
          <div className="narrative-card__eyebrow">Leitura da semana</div>
        </div>
        <p className="narrative-card__text">
          Complete mais treinos para que eu possa gerar uma leitura personalizada da sua evolução.
          Preciso de pelo menos 3 sessões registradas.
        </p>
      </section>
    )
  }

  const lines: string[] = []
  if (weekWorkouts > 0) {
    lines.push(`Você treinou ${weekWorkouts} dia${weekWorkouts !== 1 ? "s" : ""} nesta semana.`)
  }
  if (topDay) {
    lines.push(`Seu dia favorito para treinar é ${topDay.day} (${topDay.count} sessões no histórico).`)
  }
  if (data.totalPrs > 0) {
    lines.push(`Você acumulou ${data.totalPrs} recorde${data.totalPrs !== 1 ? "s" : ""} pessoal${data.totalPrs !== 1 ? "is" : ""} no total.`)
  }
  lines.push(data.totalWorkouts >= 10 ? "Parabéns pela consistência!" : "Continue treinando para desbloquear mais insights.")

  return (
    <section className="card narrative-card">
      <div className="narrative-card__header">
        <div className="narrative-card__icon" aria-hidden="true">🤖</div>
        <div>
          <div className="narrative-card__eyebrow">Leitura da semana</div>
          <div className="narrative-card__meta">Gerada com base nos seus dados</div>
        </div>
      </div>
      <p className="narrative-card__text">{lines.join(" ")}</p>
    </section>
  )
}
