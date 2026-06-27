"use client"

import { useEffect, useState } from "react"

type Props = {
  level: number
  onClose: () => void
}

export function LevelUpModal({ level, onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Nível ${level} alcançado!`}
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1A",
          border: "1px solid rgba(245,158,11,0.35)",
          borderRadius: 20,
          padding: "2rem 2.5rem",
          textAlign: "center",
          maxWidth: 320,
          width: "100%",
          boxShadow: "0 0 60px rgba(245,158,11,0.2), 0 20px 60px rgba(0,0,0,0.7)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.85) translateY(20px)",
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <style>{`
          @keyframes levelStarSpin {
            0%   { transform: rotate(0deg) scale(1); }
            50%  { transform: rotate(180deg) scale(1.15); }
            100% { transform: rotate(360deg) scale(1); }
          }
          @keyframes levelGlow {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1; }
          }
        `}</style>

        <div style={{
          fontSize: "4rem",
          lineHeight: 1,
          marginBottom: "1rem",
          animation: "levelStarSpin 1.2s ease-in-out",
        }}>
          ⭐
        </div>

        <div style={{
          fontSize: "0.75rem",
          color: "#f59e0b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
          marginBottom: "0.5rem",
          animation: "levelGlow 1.5s ease infinite",
        }}>
          Level Up!
        </div>

        <div style={{
          fontSize: "3.5rem",
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          marginBottom: "0.5rem",
        }}>
          {level}
        </div>

        <div style={{
          fontSize: "0.875rem",
          color: "#b3b3b3",
          marginBottom: "1.75rem",
          lineHeight: 1.5,
        }}>
          Você alcançou o nível {level}.<br />Continue treinando!
        </div>

        <button
          onClick={handleClose}
          className="btn btn--primary btn--full"
          style={{ fontSize: "0.875rem", padding: "0.75rem" }}
        >
          Continuar 🔥
        </button>
      </div>
    </div>
  )
}
