"use client"

import Link from "next/link"

const ACTIONS = [
  { icon: "🏋️", label: "Treinar", href: "/treinos" },
  { icon: "📓", label: "Diário", href: "/diario" },
  { icon: "📊", label: "Insights", href: "/insights" },
  { icon: "🥗", label: "Nutrição", href: "/nutricao" },
  { icon: "📅", label: "Plano", href: "/plano" },
] as const

export function QuickActions() {
  return (
    <nav aria-label="Ações rápidas" className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="card--interactive flex min-w-[72px] flex-shrink-0 flex-col items-center gap-1.5 rounded-card border border-subtle bg-surface-raised px-4 py-3 no-underline"
        >
          <span className="text-xl" aria-hidden="true">{action.icon}</span>
          <span className="whitespace-nowrap text-[0.65rem] font-bold text-secondary">{action.label}</span>
        </Link>
      ))}
    </nav>
  )
}
