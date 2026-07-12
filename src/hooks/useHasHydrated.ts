import { useEffect, useState } from "react"

type PersistApi = {
  hasHydrated: () => boolean
  onFinishHydration: (listener: () => void) => () => void
}

type PersistedStore = {
  persist: PersistApi
}

/**
 * Rastreia quando uma store Zustand com `persist` terminou de reidratar do
 * localStorage. Evita o flash de estado inicial (mock/zerado) antes dos
 * dados persistidos chegarem — use para gatear UI que depende de uma store
 * persistida, em vez de duplicar essa checagem por tela.
 */
export function useHasHydrated(store: PersistedStore): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated())

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return store.persist.onFinishHydration(() => setHydrated(true))
  }, [store])

  return hydrated
}

/**
 * Indica se o componente já passou pela montagem no cliente. Use para
 * valores que dependem do relógio/timezone local (saudação, "hoje") e não
 * podem ser calculados durante o SSR sem causar hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
