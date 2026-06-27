"use client"

import { useEffect, useState } from "react"
import { useRewardStore } from "@/stores/useRewardStore"
import { rewardColor } from "@/lib/theme-colors"

export function RewardToast() {
  const { queue, popReward } = useRewardStore()
  const [exiting, setExiting] = useState(false)
  const current = queue[0] ?? null

  useEffect(() => {
    if (!current) return
    setExiting(false)
    const dismiss = setTimeout(() => {
      setExiting(true)
      setTimeout(popReward, 260)
    }, 3500)
    return () => clearTimeout(dismiss)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  if (!current) return null

  const colors = rewardColor(current.type)

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.94); }
        }
        @keyframes iconPop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          top: "calc(var(--topbar-height) + 12px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 150,
          minWidth: 268,
          maxWidth: 360,
          background: `${colors.bg}`,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
          animation: exiting
            ? "toastOut 0.26s cubic-bezier(0.4,0,1,1) forwards"
            : "toastIn 0.32s cubic-bezier(0.16,1,0.3,1) forwards",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: "1.75rem",
            flexShrink: 0,
            animation: "iconPop 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s both",
          }}
        >
          {current.icon}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: colors.text,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {current.title}
          </div>
          {current.subtitle && (
            <div style={{
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {current.subtitle}
            </div>
          )}
          {current.value && (
            <div style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginTop: 2,
            }}>
              {current.value}
            </div>
          )}
        </div>

        <button
          onClick={() => { setExiting(true); setTimeout(popReward, 260) }}
          aria-label="Fechar notificação"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "1rem",
            flexShrink: 0,
            padding: "2px 4px",
            borderRadius: 4,
            transition: "color var(--duration-fast)",
          }}
        >
          ✕
        </button>
      </div>
    </>
  )
}
