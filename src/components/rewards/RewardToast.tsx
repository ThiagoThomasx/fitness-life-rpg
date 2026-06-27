"use client"

import { useEffect } from "react"
import { useRewardStore } from "@/stores/useRewardStore"

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  badge: { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.4)", text: "#8b5cf6" },
  level_up: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b" },
  attribute_up: { bg: "rgba(29,185,84,0.12)", border: "rgba(29,185,84,0.3)", text: "#1db954" },
  xp: { bg: "rgba(29,185,84,0.1)", border: "rgba(29,185,84,0.25)", text: "#1db954" },
}

export function RewardToast() {
  const { queue, popReward } = useRewardStore()
  const current = queue[0] ?? null
  useEffect(() => {
    if (!current) return
    const id = setTimeout(() => {
      popReward()
    }, 3500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, popReward])

  if (!current) return null

  const colors = TYPE_COLORS[current.type] ?? TYPE_COLORS.xp

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "72px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        minWidth: 260,
        maxWidth: 340,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        animation: "toastIn 0.3s ease",
        backdropFilter: "blur(8px)",
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{current.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: colors.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {current.title}
        </div>
        {current.subtitle && (
          <div style={{ fontSize: "0.75rem", color: "#b3b3b3", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.subtitle}
          </div>
        )}
        {current.value && (
          <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#ffffff", marginTop: 2 }}>
            {current.value}
          </div>
        )}
      </div>
      <button
        onClick={popReward}
        aria-label="Fechar"
        style={{ background: "none", border: "none", color: "#6a6a6a", cursor: "pointer", fontSize: "1rem", flexShrink: 0, padding: "0 2px" }}
      >
        ✕
      </button>
    </div>
  )
}
