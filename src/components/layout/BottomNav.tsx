"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", icon: "🏠" },
  { href: "/treinos", label: "Treinos", icon: "💪" },
  { href: "/plano", label: "Plano", icon: "📅" },
  { href: "/insights", label: "Insights", icon: "📊" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "nav-item--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        )
      })}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottomnav-height);
          background: var(--color-bg-elevated);
          border-top: 1px solid var(--color-border-subtle);
          display: flex;
          align-items: stretch;
          z-index: 100;
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          text-decoration: none;
          color: var(--color-text-muted);
          transition: color var(--duration-fast) var(--ease-out);
          -webkit-tap-highlight-color: transparent;
        }
        .nav-item:hover,
        .nav-item--active {
          color: var(--color-accent);
        }
        .nav-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        .nav-label {
          font-size: 0.625rem;
          font-weight: var(--font-medium);
          letter-spacing: 0.02em;
        }
      `}</style>
    </nav>
  )
}
