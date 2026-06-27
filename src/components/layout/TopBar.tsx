"use client"

import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface TopBarProps {
  user: User
}

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const avatarLetter = user.email?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-icon">⚔️</span>
        <span className="topbar-name">Fitness RPG</span>
      </div>

      <button
        className="topbar-avatar"
        onClick={handleSignOut}
        title="Sair"
        aria-label="Sair da conta"
      >
        {avatarLetter}
      </button>

      <style jsx>{`
        .topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--topbar-height);
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-4);
          z-index: 100;
        }
        .topbar-brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .topbar-icon {
          font-size: 1.25rem;
        }
        .topbar-name {
          font-size: var(--text-base);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
        }
        .topbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          color: #000;
          font-size: var(--text-sm);
          font-weight: var(--font-bold);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity var(--duration-fast);
        }
        .topbar-avatar:hover {
          opacity: 0.85;
        }
      `}</style>
    </header>
  )
}
