import { useEffect, useState } from 'react'

/**
 * Cria uma URL de objeto para um `Blob` (fotos de progresso) e revoga a
 * anterior sempre que o blob muda ou o componente desmonta — evita vazamento
 * de `blob:` URLs ao navegar entre galeria, modal de detalhe e comparação.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
