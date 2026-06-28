"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Início",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    iconActive: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <rect x="9" y="12" width="6" height="10" fill="rgba(10,10,10,0.85)" rx="0.5" />
      </svg>
    ),
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
        <path d="M3 9.5h18" /><path d="M3 14.5h18" />
        <path d="M3 9.5v5" /><path d="M21 9.5v5" />
        <path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" />
      </svg>
    ),
    iconActive: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    iconActive: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
    iconActive: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    iconActive: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="app-dock" aria-label="Navegação principal">
      <div className="app-dock__inner">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-dock__item${isActive ? " app-dock__item--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="app-dock__icon">
                {isActive ? item.iconActive : item.icon}
              </span>
              <span className="app-dock__label">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <style jsx>{`
        .app-dock {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 24px);
          max-width: 620px;
          background: rgba(16, 16, 16, 0.94);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 22px;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.5),
            0 1px 0 rgba(255, 255, 255, 0.04) inset,
            0 0 0 0.5px rgba(255, 255, 255, 0.03) inset;
          z-index: 100;
          padding: 0 6px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .app-dock__inner {
          display: flex;
          align-items: stretch;
          height: 62px;
        }

        .app-dock__item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.35);
          border-radius: 16px;
          margin: 5px 2px;
          padding: 0 4px;
          transition: color 160ms ease, background 160ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          position: relative;
          min-width: 0;
        }

        .app-dock__item:active {
          transform: scale(0.92);
        }

        .app-dock__item--active {
          color: #1db954;
          background: rgba(29, 185, 84, 0.1);
        }

        .app-dock__item--active:active {
          transform: scale(0.94);
        }

        .app-dock__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .app-dock__item--active .app-dock__icon {
          transform: translateY(-1px);
          filter: drop-shadow(0 0 6px rgba(29, 185, 84, 0.4));
        }

        .app-dock__label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .app-dock__item--active .app-dock__label {
          font-weight: 700;
          color: #1db954;
        }

        @media (min-width: 480px) {
          .app-dock {
            bottom: 16px;
            width: calc(100% - 40px);
          }

          .app-dock__item {
            margin: 6px 3px;
          }
        }
      `}</style>
    </nav>
  )
}
