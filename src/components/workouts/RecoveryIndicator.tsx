import { formatTimeSinceCompleted } from "@/lib/workout-recovery"

export function RecoveryIndicator({ lastCompletedAt }: { lastCompletedAt: string | null }) {
  return <span className="recovery-indicator">{formatTimeSinceCompleted(lastCompletedAt)}</span>
}
