"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/env"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
        <path d="M3 9.5h18" /><path d="M3 14.5h18" />
        <path d="M3 9.5v5" /><path d="M21 9.5v5" />
        <path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" />
      </svg>
    ),
  },
  {
    href: "/plano",
    label: "Plano",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const

interface AppSidebarProps {
  userEmail?: string | null
}

export default function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    if (isSupabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push("/auth/login")
    router.refresh()
  }

  const avatarLetter = userEmail?.[0]?.toUpperCase() ?? "U"

  const sidebarContent = (
    <>
      <div className="sidebar__header">
        <div className="sidebar__logo">⚔️</div>
        <div className="sidebar__brand">
          <span className="sidebar__brand-name">Fitness RPG</span>
          <span className="sidebar__brand-sub">v1.0 · RPG</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__item${isActive ? " sidebar__item--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{avatarLetter}</div>
          <span className="sidebar__email">{userEmail ?? "Usuário"}</span>
        </div>
        <button className="sidebar__signout" onClick={handleSignOut} aria-label="Sair da conta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar sidebar--desktop" aria-label="Sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="sidebar__hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <aside className={`sidebar sidebar--mobile${mobileOpen ? " sidebar--open" : ""}`} aria-label="Menu lateral">
        <button
          className="sidebar__close"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      <style jsx>{`
        /* ─── Shared sidebar shell ─── */
        .sidebar {
          width: 220px;
          background: #0c0e12;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
        }

        /* ─── Desktop: fixed left column ─── */
        .sidebar--desktop {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
        }

        /* ─── Mobile: hidden drawer ─── */
        .sidebar--mobile {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 200;
          transform: translateX(-100%);
          transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 4px 0 32px rgba(0,0,0,0.6);
        }
        .sidebar--mobile.sidebar--open {
          transform: translateX(0);
        }

        /* ─── Overlay ─── */
        .sidebar__overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 190;
          backdrop-filter: blur(2px);
        }

        /* ─── Header (logo + brand) ─── */
        .sidebar__header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 16px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sidebar__logo {
          font-size: 1.5rem;
          line-height: 1;
          flex-shrink: 0;
        }
        .sidebar__brand {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .sidebar__brand-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .sidebar__brand-sub {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* ─── Nav items ─── */
        .sidebar__nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 8px;
          overflow-y: auto;
        }
        .sidebar__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 7px;
          text-decoration: none;
          color: rgba(255,255,255,0.45);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 140ms ease, background 140ms ease;
          border-left: 2px solid transparent;
          position: relative;
        }
        .sidebar__item:hover {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.04);
        }
        .sidebar__item--active {
          color: #1db954;
          background: rgba(29, 185, 84, 0.1);
          border-left-color: #1db954;
        }
        .sidebar__item-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .sidebar__item-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ─── Footer (user + sign out) ─── */
        .sidebar__footer {
          padding: 12px 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .sidebar__user {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .sidebar__avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #1db954;
          color: #000;
          font-size: 0.7rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sidebar__email {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.35);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__signout {
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 140ms ease;
          flex-shrink: 0;
        }
        .sidebar__signout:hover {
          color: rgba(255,255,255,0.7);
        }

        /* ─── Mobile hamburger ─── */
        .sidebar__hamburger {
          display: none;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 100;
          background: rgba(12, 14, 18, 0.92);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: rgba(255,255,255,0.75);
          padding: 8px;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: color 140ms ease, background 140ms ease;
        }
        .sidebar__hamburger:hover {
          color: #fff;
          background: rgba(12, 14, 18, 0.98);
        }

        /* ─── Mobile close button ─── */
        .sidebar__close {
          display: none;
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 140ms ease;
        }
        .sidebar__close:hover {
          color: #fff;
        }

        /* ─── Responsive ─── */
        @media (max-width: 767px) {
          .sidebar--desktop {
            display: none;
          }
          .sidebar__hamburger {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sidebar__close {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        @media (min-width: 768px) {
          .sidebar--mobile {
            display: none;
          }
          .sidebar__overlay {
            display: none;
          }
          .sidebar__hamburger {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
