"use client"

import { useState } from "react"
import type { DailyLogEntry } from "@/lib/daily-log"
import { extractTags } from "@/lib/auto-tags"
import { EnergyStars } from "./EnergyStars"
import { MoodPicker } from "./MoodPicker"
import { TagChip } from "./TagChip"

type EntryData = { energyLevel: number; sleepHours: number; mood: string; notes: string }

type Props = {
  initial?: DailyLogEntry
  isFirst: boolean
  xpValue: number
  onSave: (data: EntryData) => void
  onCancel?: () => void
}

export function EntryForm({ initial, isFirst, xpValue, onSave, onCancel }: Props) {
  const [energyLevel, setEnergyLevel] = useState(initial?.energyLevel ?? 3)
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours ?? 7)
  const [mood, setMood] = useState(initial?.mood ?? "😊")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const previewTags = extractTags(notes)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ energyLevel, sleepHours, mood, notes })
  }

  return (
    <section className="card entry-form">
      <div className="section-label">
        {initial ? "Editar entrada" : isFirst ? "Registrar dia de hoje" : "Nova entrada de hoje"}
      </div>

      <form onSubmit={handleSubmit} className="entry-form__body">
        <div>
          <label className="field-label">Energia</label>
          <EnergyStars value={energyLevel} onChange={setEnergyLevel} />
        </div>

        <div>
          <label className="field-label">Humor</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div>
          <label className="field-label">
            Horas de sono: <strong className="text-primary">{sleepHours}h</strong>
          </label>
          <input
            type="range"
            min={3}
            max={12}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="entry-form__slider"
          />
        </div>

        <div>
          <label className="field-label">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi seu dia? Como se sentiu?"
            rows={3}
            className="textarea"
          />
        </div>

        {previewTags.length > 0 && (
          <div>
            <div className="entry-form__tags-label">Tags detectadas</div>
            <div className="log-card__tags">
              {previewTags.map((t) => <TagChip key={t} tag={t} />)}
            </div>
          </div>
        )}

        <div className="entry-form__actions">
          <button type="submit" className="btn btn--primary btn--full">
            {initial ? "Atualizar" : isFirst ? `Salvar (+${xpValue} XP)` : "Adicionar entrada"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn--ghost">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
