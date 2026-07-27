"use client"

import { useEffect } from "react"
import { EmptyState } from "@/components/ui/EmptyState"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <div className="page">
      <EmptyState
        icon="⚠️"
        title="Algo deu errado"
        description="Ocorreu um erro inesperado ao carregar esta página. Você pode tentar novamente."
        action={
          <button type="button" className="btn btn--primary" onClick={reset}>
            Tentar novamente
          </button>
        }
      />
    </div>
  )
}
