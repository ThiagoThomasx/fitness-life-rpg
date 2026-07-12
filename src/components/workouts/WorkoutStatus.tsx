import type { WorkoutRecoveryInfo } from "@/lib/workout-recovery"
import { RecoveryBadge } from "./RecoveryBadge"
import { RecoveryIndicator } from "./RecoveryIndicator"

export function WorkoutStatus({ recovery, isTopPick }: { recovery: WorkoutRecoveryInfo; isTopPick?: boolean }) {
  return (
    <span className="workout-status">
      {isTopPick && <span className="badge-recommended-recovery">⭐ Recomendado hoje</span>}
      <RecoveryBadge status={recovery.status} />
      <RecoveryIndicator lastCompletedAt={recovery.lastCompletedAt} />
    </span>
  )
}
