"use client"

import { useEffect } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"

/**
 * Dispara a reidratação das stores Zustand persistidas (`skipHydration: true`)
 * uma única vez, após a montagem no cliente. Mantém o primeiro render do
 * cliente idêntico ao SSR (estado inicial) e evita hydration mismatch —
 * telas que dependem desses dados devem gatear a UI com `useHasHydrated`.
 */
export function StoreHydrationBoundary() {
  useEffect(() => {
    useCharacterStore.persist.rehydrate()
  }, [])

  return null
}
