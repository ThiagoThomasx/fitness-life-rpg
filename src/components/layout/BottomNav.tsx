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
            {isActive && <span className="nav-dot" aria-hidden="true" />}
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
          background: rgba(18, 18, 18, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          align-items: stretch;
          z-index: 100;
        }

        .nav-item {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: #5a5a5a;
          transition: color 120ms cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-tap-highlight-color: transparent;
          padding-bottom: 4px;
        }

        .nav-item:hover {
          color: #b3b3b3;
        }

        .nav-item--active {
          color: #ffffff;
        }

        .nav-icon {
          font-size: 1.2rem;
          line-height: 1;
          transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-item--active .nav-icon {
          transform: translateY(-1px);
        }

        .nav-label {
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 120ms ease;
        }

        .nav-dot {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #1db954;
          animation: dot-appear 120ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes dot-appear {
          from { opacity: 0; transform: translateX(-50%) scale(0); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </nav>
  )
}
