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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "20px 16px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>⚔️</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.01em",
            lineHeight: 1.2,
          }}>Fitness RPG</span>
          <span style={{
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}>v1.0 · RPG</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "12px 10px",
        overflowY: "auto" as const,
      }} aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 10px",
                borderRadius: "7px",
                textDecoration: "none",
                color: isActive ? "#1db954" : "rgba(255,255,255,0.45)",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase" as const,
                background: isActive ? "rgba(29,185,84,0.1)" : "transparent",
                borderLeft: isActive ? "2px solid #1db954" : "2px solid transparent",
                transition: "color 140ms ease, background 140ms ease",
              }}
              className="nav-item"
            >
              <span style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                opacity: isActive ? 1 : 0.7,
              }}>
                {item.icon}
              </span>
              <span style={{ whiteSpace: "nowrap" as const }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "12px 10px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}>
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "#1db954",
          color: "#000",
          fontSize: "0.7rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {avatarLetter}
        </div>
        <span style={{
          flex: 1,
          fontSize: "0.63rem",
          color: "rgba(255,255,255,0.3)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }}>
          {emailDisplay}
        </span>
        <button
          onClick={handleSignOut}
          aria-label="Sair da conta"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.25)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          className="signout-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )

  const sidebarStyle: React.CSSProperties = {
    width: "220px",
    background: "#0c0e12",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        style={{
          ...sidebarStyle,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
        }}
        className="sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
        className="hamburger-btn"
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 100,
          background: "rgba(12,14,18,0.94)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          color: "rgba(255,255,255,0.75)",
          padding: "8px",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 190,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        aria-label="Menu lateral"
        className="sidebar-mobile"
        style={{
          ...sidebarStyle,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 200,
          boxShadow: "4px 0 32px rgba(0,0,0,0.6)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 260ms cubic-bezier(0.4,0,0.2,1)",
          display: "none",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      <style jsx global>{`
        .nav-item:hover {
          color: rgba(255,255,255,0.8) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        .signout-btn:hover {
          color: rgba(255,255,255,0.7) !important;
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .sidebar-mobile { display: block !important; }
        }
        @media (min-width: 768px) {
          .sidebar-mobile { display: none !important; }
          .hamburger-btn { display: none !important; }
        }
      `}</style>
    </>
  )
}
