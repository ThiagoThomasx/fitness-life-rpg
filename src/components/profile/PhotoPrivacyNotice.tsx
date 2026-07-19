"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type PhotoPrivacyNoticeProps = {
  onAcknowledge: () => void
  onCancel: () => void
}

/**
 * Mostrado uma única vez, antes do primeiro upload de foto de progresso.
 * A confirmação é persistida via `acknowledgeBodyPhotosPrivacy` (preferences.ts).
 */
export function PhotoPrivacyNotice({ onAcknowledge, onCancel }: PhotoPrivacyNoticeProps) {
  return (
    <ConfirmDialog
      title="Privacidade das fotos"
      description="Estas imagens ficam armazenadas apenas neste navegador. Elas não são enviadas para servidores nem analisadas pelo aplicativo, e não fazem parte do backup em JSON. Limpar os dados deste navegador pode apagar suas fotos."
      confirmLabel="Entendi"
      cancelLabel="Cancelar"
      onConfirm={onAcknowledge}
      onCancel={onCancel}
    />
  )
}
