"use client"

import { STORAGE_KEYS, type StorageStatus } from "@/lib/backup"

const KEY_LABELS: Record<string, string> = {
  "lrpg-fit:character": "Personagem & XP",
  "lrpg-fit:active-session": "Sessão ativa",
  "lrpg-fit:workout-history": "Histórico de treinos",
  "lrpg-fit:badges": "Conquistas",
  "lrpg-fit:daily-logs": "Diário",
  "lrpg-fit:reward-events": "Eventos de recompensa",
  "lrpg-fit:nutrition-goal": "Metas de nutrição",
  "lrpg-fit:nutrition-logs": "Registros nutricionais",
  "lrpg-fit:missions-completed": "Missões concluídas",
  "lrpg-fit:custom-workouts": "Treinos personalizados",
  "lrpg-fit:custom-exercises": "Exercícios personalizados",
  "lrpg-fit:weekly-plan": "Plano semanal",
  "lrpg-fit:campaigns": "Campanhas",
  "lrpg-fit:preferences": "Preferências pessoais",
  "lrpg-fit:avatar": "Avatar do personagem",
  "lrpg-fit:char-name": "Nome do personagem",
  "rpg_last_seen_level": "Último nível visto",
}

type Props = {
  status: StorageStatus | null
}

export function StorageStatusSection({ status }: Props) {
  return (
    <section className="card">
      <h3 className="section-label settings-section__title">Armazenamento local</h3>
      {status ? (
        <>
          <div className="stat-grid stat-grid--3" style={{ marginBottom: "var(--space-4)" }}>
            <div className="stat-cell">
              <div className="stat-cell__value">{status.usedKB} KB</div>
              <div className="stat-cell__label">Usado</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value">{status.itemCount}</div>
              <div className="stat-cell__label">Chaves ativas</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell__value">{STORAGE_KEYS.length}</div>
              <div className="stat-cell__label">Total esperado</div>
            </div>
          </div>

          <div className="settings-key-list">
            {status.keys.map(({ key, bytes }) => (
              <div key={key} className="settings-key-row">
                <span
                  className={`settings-key-dot ${bytes > 0 ? "settings-key-dot--active" : ""}`}
                  aria-hidden="true"
                />
                <span className="settings-key-row__label">{KEY_LABELS[key] ?? key}</span>
                <span className="settings-key-row__size">
                  {bytes > 0 ? `${(bytes / 1024).toFixed(1)} KB` : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="settings-section__body">Carregando...</p>
      )}
    </section>
  )
}
