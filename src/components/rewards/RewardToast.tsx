"use client"

import { useEffect, useRef, useState } from "react"
import { useRewardStore } from "@/stores/useRewardStore"
import { rewardColor } from "@/lib/theme-colors"

const VISIBLE_MS = 3500
const EXIT_MS = 260

export function RewardToast() {
  const queue = useRewardStore((s) => s.queue)
  const popReward = useRewardStore((s) => s.popReward)
  const [exiting, setExiting] = useState(false)
  // Guard síncrono: fechar 2× (clique + timeout) descartaria o toast seguinte
  const exitingRef = useRef(false)
  const current = queue[0] ?? null

  useEffect(() => {
    if (!current) return
    exitingRef.current = false
    setExiting(false)

    function dismiss() {
      if (exitingRef.current) return
      exitingRef.current = true
      setExiting(true)
      setTimeout(popReward, EXIT_MS)
    }

    const timer = setTimeout(dismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  if (!current) return null

  function handleClose() {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    setTimeout(popReward, EXIT_MS)
  }

  const colors = rewardColor(current.type)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={exiting ? "reward-toast reward-toast--exiting" : "reward-toast"}
      style={
        {
          "--toast-border": colors.border,
          "--toast-text": colors.text,
        } as React.CSSProperties
      }
    >
      <span className="reward-toast__icon" aria-hidden="true">
        {current.icon}
      </span>

      <div className="reward-toast__body">
        <div className="reward-toast__title">{current.title}</div>
        {current.subtitle && <div className="reward-toast__subtitle">{current.subtitle}</div>}
        {current.value && <div className="reward-toast__value">{current.value}</div>}
      </div>

      <button
        type="button"
        className="reward-toast__close"
        onClick={handleClose}
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  )
}
