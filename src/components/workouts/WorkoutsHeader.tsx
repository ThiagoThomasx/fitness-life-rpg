"use client"

type WorkoutsHeaderProps = {
  totalVisible: number
  onOpenLibrary: () => void
  onCreateWorkout: () => void
}

export function WorkoutsHeader({ totalVisible, onOpenLibrary, onCreateWorkout }: WorkoutsHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="display-heading text-3xl">Treinos</h1>
        <p className="mt-1 text-sm text-secondary">
          {totalVisible} treino{totalVisible !== 1 ? "s" : ""} disponíve{totalVisible !== 1 ? "is" : "l"} · escolha um e comece
        </p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <button type="button" className="btn btn--ghost" onClick={onOpenLibrary}>
          Biblioteca
        </button>
        <button type="button" className="btn btn--primary" onClick={onCreateWorkout}>
          + Criar treino
        </button>
      </div>
    </header>
  )
}
