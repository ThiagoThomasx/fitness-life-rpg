import type { WorkoutRecoveryStatus } from "@/lib/workout-recovery"

const STATUS_CONFIG: Record<WorkoutRecoveryStatus, { icon: string; label: string; className: string }> = {
  recovered: { icon: "🟢", label: "Recuperado", className: "recovery-badge--recovered" },
  partial: { icon: "🟡", label: "Recuperação parcial", className: "recovery-badge--partial" },
  fatigued: { icon: "🔴", label: "Em recuperação", className: "recovery-badge--fatigued" },
  never: { icon: "🆕", label: "Novo treino", className: "recovery-badge--never" },
  active: { icon: "⏱️", label: "Sessão ativa", className: "recovery-badge--active" },
}

export function RecoveryBadge({ status }: { status: WorkoutRecoveryStatus }) {
  const { icon, label, className } = STATUS_CONFIG[status]
  return (
    <span className={`recovery-badge ${className}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  )
}
