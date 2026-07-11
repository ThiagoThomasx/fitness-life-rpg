"use client"

type Props = {
  showForm: boolean
  isFirstEntry: boolean
  onNewEntry: () => void
}

export function DiaryHeader({ showForm, isFirstEntry, onNewEntry }: Props) {
  return (
    <div className="diary-header">
      <h1 className="diary-header__title">📓 Diário</h1>
      {!showForm && (
        <button onClick={onNewEntry} className="btn btn--secondary btn--sm">
          {isFirstEntry ? "+ Registrar hoje" : "+ Nova entrada"}
        </button>
      )}
    </div>
  )
}
