"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/env"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Escape fecha o drawer; scroll lock enquanto aberto; foco gerenciado
  useEffect(() => {
    if (!mobileOpen) return

    const hamburger = hamburgerRef.current

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.classList.add("body-scroll-lock")
    closeBtnRef.current?.focus()

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.classList.remove("body-scroll-lock")
      hamburger?.focus()
    }
  }, [mobileOpen])

  async function handleSignOut() {
    if (isSupabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push("/auth/login")
    router.refresh()
  }

  const avatarLetter = userEmail?.[0]?.toUpperCase() ?? "U"
  const emailDisplay = userEmail
    ? userEmail.length > 22 ? userEmail.slice(0, 22) + "…" : userEmail
    : "Usuário"

  const sidebarContent = (
    <>
      <div className="sidebar__header">
        <span className="sidebar__logo" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
            <path d="M3 9.5v5" /><path d="M21 9.5v5" />
            <path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" />
          </svg>
        </span>
        <div className="sidebar__brand">
          <span className="sidebar__brand-name">Fitness Life</span>
          <span className="sidebar__brand-tag">Progressão física</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={`nav-link${isActive ? " nav-link--active" : ""}`}
            >
              <span className="nav-link__icon">{item.icon}</span>
              <span className="nav-link__label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__avatar" aria-hidden="true">{avatarLetter}</div>
        <span className="sidebar__email">{emailDisplay}</span>
        <button onClick={handleSignOut} aria-label="Sair da conta" className="icon-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
      {/* Sidebar desktop */}
      <aside aria-label="Barra lateral" className="sidebar sidebar--desktop">
        {sidebarContent}
      </aside>

      {/* Botão hamburger (mobile) */}
      <button
        ref={hamburgerRef}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-drawer"
        className="hamburger-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay do drawer (mobile) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="drawer-overlay"
        />
      )}

      {/* Drawer mobile */}
      <aside
        id="mobile-drawer"
        aria-label="Menu lateral"
        aria-hidden={!mobileOpen}
        className={`sidebar sidebar--drawer${mobileOpen ? " sidebar--open" : ""}`}
      >
        <button
          ref={closeBtnRef}
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
          className="sidebar__close-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
