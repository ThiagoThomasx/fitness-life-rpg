"use client"

import Link from "next/link"

const LINKS = [
  {
    href: "/configuracoes",
    icon: "⚙️",
    label: "Dados & Backup",
    desc: "Exportar, importar e resetar dados locais",
  },
  {
    href: "/insights",
    icon: "📊",
    label: "Ver Insights",
    desc: "Gráficos de progresso e histórico",
  },
]

export function ProfileLinks() {
  return (
    <div className="flex flex-col gap-2">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="quick-link">
          <span className="quick-link__icon" aria-hidden="true">
            {link.icon}
          </span>
          <span className="quick-link__body">
            <span className="quick-link__label">{link.label}</span>
            <span className="quick-link__desc block">{link.desc}</span>
          </span>
          <span className="quick-link__chevron" aria-hidden="true">
            ›
          </span>
        </Link>
      ))}
    </div>
  )
}
