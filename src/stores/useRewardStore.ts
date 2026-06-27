import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RewardEvent } from '@/lib/reward-events'

interface RewardState {
  queue: RewardEvent[]
}

interface RewardActions {
  pushReward: (event: RewardEvent) => void
  popReward: () => void
  clearQueue: () => void
}

export const useRewardStore = create<RewardState & RewardActions>()(
  devtools(
    (set) => ({
      queue: [],

      pushReward: (event) =>
        set(
          (state) => ({ queue: [...state.queue, event] }),
          false,
          'rewards/push'
        ),

      popReward: () =>
        set(
          (state) => ({ queue: state.queue.slice(1) }),
          false,
          'rewards/pop'
        ),

      clearQueue: () => set({ queue: [] }, false, 'rewards/clear'),
    }),
    { name: 'RewardStore' }
  )
)
