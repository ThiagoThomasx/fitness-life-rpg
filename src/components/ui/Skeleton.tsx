type SkeletonProps = {
  width?: string
  height?: string
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = "100%", height = "1rem", className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ height = "120px" }: { height?: string }) {
  return <div className="skeleton skeleton--card" style={{ height }} aria-hidden="true" />
}

export function SkeletonText({ lines = 2, width = "100%" }: { lines?: number; width?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton skeleton--text"
          style={{ width: i === lines - 1 ? "66%" : width }}
        />
      ))}
    </div>
  )
}

export function SkeletonPageLoader() {
  return (
    <div className="page" aria-busy="true" aria-label="Carregando…">
      <SkeletonCard height="160px" />
      <SkeletonCard height="100px" />
      <SkeletonCard height="100px" />
      <SkeletonCard height="80px" />
    </div>
  )
}
