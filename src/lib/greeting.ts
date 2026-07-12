import { useMounted } from "@/hooks/useHasHydrated"

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

/**
 * Saudação segura para SSR/SSG: a hora local do servidor (build/request)
 * quase sempre diverge da hora local do cliente, então o texto só é
 * calculado após montar — evita hydration mismatch em telas estáticas
 * (Dashboard, Treinos) que exibem a saudação.
 */
export function useGreeting(): string {
  const mounted = useMounted()
  return mounted ? getGreeting() : ""
}
