"use client"

import { useEffect, useRef } from "react"

// Contador de locks para modais aninhados (ex.: builder + criar exercício)
let scrollLockCount = 0

function lockScroll() {
  scrollLockCount++
  document.body.style.overflow = "hidden"
}

function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) document.body.style.overflow = ""
}

type ModalShellProps = {
  labelledBy: string
  /** id do elemento com a descrição/corpo do dialog, se houver um único parágrafo natural */
  describedBy?: string
  variant?: "center" | "sheet"
  /** false para modais que exigem ação explícita (ex.: resumo pós-treino) */
  dismissible?: boolean
  onClose?: () => void
  children: React.ReactNode
}

export function ModalShell({
  labelledBy,
  describedBy,
  variant = "center",
  dismissible = true,
  onClose,
  children,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Refs para o efeito de mount não depender da identidade de onClose —
  // pais que re-renderizam com frequência (ex.: timer da sessão) recriam o
  // callback a cada render e um efeito dependente roubaria o foco a cada tick.
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  onCloseRef.current = onClose
  dismissibleRef.current = dismissible

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    lockScroll()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissibleRef.current && onCloseRef.current) {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      unlockScroll()
      previouslyFocused?.focus()
    }
  }, [])

  const overlayClass =
    variant === "sheet" ? "modal-overlay modal-overlay--sheet" : "modal-overlay"
  const panelClass =
    variant === "sheet" ? "modal-panel modal-panel--sheet" : "modal-panel modal-panel--center"

  return (
    <div className={overlayClass} onClick={dismissible ? onClose : undefined}>
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
