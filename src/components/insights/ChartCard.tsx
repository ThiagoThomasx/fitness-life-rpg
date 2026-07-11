"use client"

type ChartHeaderProps = {
  title: string
  description?: string
}

export function ChartHeader({ title, description }: ChartHeaderProps) {
  return (
    <div className="chart-card__header">
      <h3 className="chart-card__title">{title}</h3>
      {description && <p className="chart-card__desc">{description}</p>}
    </div>
  )
}

type EmptyChartProps = {
  icon: string
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export function EmptyChart({ icon, title, description, ctaLabel, ctaHref }: EmptyChartProps) {
  return (
    <div className="empty-state chart-empty">
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__desc">{description}</div>
      {ctaLabel && ctaHref && (
        <a href={ctaHref} className="badge-pill badge-pill--accent chart-empty__cta">
          {ctaLabel}
        </a>
      )}
    </div>
  )
}

export const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-control)",
  fontSize: "var(--text-xs)",
  color: "var(--color-text-primary)",
}

export const GRID_STROKE = "var(--color-border-subtle)"
export const AXIS_TICK = { fill: "var(--color-text-muted)", fontSize: 10 }
