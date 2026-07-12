"use client"

import { useEffect } from "react"
import { useCharacterStore } from "@/stores/useCharacterStore"

/**
 * Dispara a reidratação das stores Zustand persistidas (`skipHydration: true`)
 * uma única vez, após a montagem no cliente. Mantém o primeiro render do
 * cliente idêntico ao SSR (estado inicial) e evita hydration mismatch —
 * telas que dependem desses dados devem gatear a UI com `useHasHydrated`.
 *
 * Depois que o rehydrate aplica o que já estava salvo, `initializeCharacter`
 * garante que sempre exista um personagem antes de qualquer ação capaz de
 * conceder XP/atributos (Hotfix 10.1) — instalação nova ou um `character:
 * null` legado (backup antigo, storage corrompido) são recuperados do mesmo
 * jeito, sem sobrescrever um personagem já existente e válido.
 */
export function StoreHydrationBoundary() {
  useEffect(() => {
    Promise.resolve(useCharacterStore.persist.rehydrate()).then(() => {
      useCharacterStore.getState().initializeCharacter()
    })
  }, [])

  return null
}
