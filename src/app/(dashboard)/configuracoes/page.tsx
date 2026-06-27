"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import {
  downloadBackup,
  importBackup,
  parseBackupFile,
  resetAllData,
  getStorageStatus,
  STORAGE_KEYS,
  type StorageStatus,
} from "@/lib/backup"

type Panel = "idle" | "import-confirm" | "reset-confirm"

export default function ConfiguracoesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resetInputRef = useRef<HTMLInputElement>(null)
  const [panel, setPanel] = useState<Panel>("idle")
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [resetText, setResetText] = useState("")
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const refreshStatus = useCallback(() => {
    setStatus(getStorageStatus())
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  function showMessage(type: "ok" | "err", text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  function handleExport() {
    try {
      downloadBackup()
      showMessage("ok", "Backup exportado com sucesso!")
    } catch {
      showMessage("err", "Falha ao exportar. Tente novamente.")
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setPanel("import-confirm")
    e.target.value = ""
  }

  async function handleImportConfirm() {
    if (!importFile) return
    try {
      const text = await importFile.text()
      const payload = parseBackupFile(text)
      if (!payload) {
        showMessage("err", "Arquivo inválido. Selecione um backup exportado pelo app.")
        setPanel("idle")
        return
      }
      const result = importBackup(payload)
      if (!result.ok) {
        showMessage("err", result.error ?? "Falha na importação.")
      } else {
        showMessage("ok", `Dados restaurados! ${result.restoredKeys.length} chaves importadas.`)
        refreshStatus()
      }
    } catch {
      showMessage("err", "Erro ao ler o arquivo.")
    }
    setPanel("idle")
    setImportFile(null)
  }

  function handleResetConfirm() {
    if (resetText.trim().toLowerCase() !== "resetar") return
    resetAllData()
    showMessage("ok", "Todos os dados foram apagados.")
    setPanel("idle")
    setResetText("")
    refreshStatus()
  }

  const keyLabels: Record<string, string> = {
    "lrpg-fit:character": "Personagem & XP",
    "lrpg-fit:active-session": "Sessão ativa",
    "lrpg-fit:workout-history": "Histórico de treinos",
    "lrpg-fit:badges": "Conquistas",
    "lrpg-fit:daily-logs": "Diário",
    "lrpg-fit:reward-events": "Eventos de recompensa",
    "lrpg-fit:nutrition-goal": "Metas de nutrição",
    "lrpg-fit:nutrition-logs": "Registros nutricionais",
  }

  return (
    <div className="page">
      <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", marginBottom: "0.25rem" }}>
        Dados & Backup
      </h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "0" }}>
        Gerencie seus dados locais com segurança.
      </p>

      {message && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            background: message.type === "ok" ? "rgba(29,185,84,0.12)" : "rgba(220,53,69,0.12)",
            border: `1px solid ${message.type === "ok" ? "rgba(29,185,84,0.3)" : "rgba(220,53,69,0.3)"}`,
            color: message.type === "ok" ? "var(--color-accent)" : "#dc3545",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {message.type === "ok" ? "✓ " : "✕ "}{message.text}
        </div>
      )}

      {/* Storage status */}
      <section className="card">
        <h3 className="section-label" style={{ marginTop: 0 }}>Armazenamento local</h3>
        {status ? (
          <>
            <div className="stat-grid stat-grid--3" style={{ marginBottom: "1rem" }}>
              <div className="stat-cell">
                <div style={{ fontSize: "1.1rem" }} aria-hidden="true">💾</div>
                <div className="stat-cell__value">{status.usedKB} KB</div>
                <div className="stat-cell__label">Usado</div>
              </div>
              <div className="stat-cell">
                <div style={{ fontSize: "1.1rem" }} aria-hidden="true">📦</div>
                <div className="stat-cell__value">{status.itemCount}</div>
                <div className="stat-cell__label">Chaves ativas</div>
              </div>
              <div className="stat-cell">
                <div style={{ fontSize: "1.1rem" }} aria-hidden="true">🔑</div>
                <div className="stat-cell__value">{STORAGE_KEYS.length}</div>
                <div className="stat-cell__label">Total esperado</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {status.keys.map(({ key, bytes }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: bytes > 0 ? "var(--color-accent)" : "var(--color-border-subtle)",
                    }}
                    aria-hidden="true"
                  />
                  <span style={{ flex: 1, fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                    {keyLabels[key] ?? key}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", minWidth: 40, textAlign: "right" }}>
                    {bytes > 0 ? `${(bytes / 1024).toFixed(1)} KB` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Carregando...</p>
        )}
      </section>

      {/* Export */}
      <section className="card">
        <h3 className="section-label" style={{ marginTop: 0 }}>Exportar backup</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "0.875rem" }}>
          Baixa um arquivo <code>.json</code> com todos os seus dados locais. Guarde em local seguro.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleExport}
          style={{ width: "100%" }}
        >
          ⬇️ Exportar backup JSON
        </button>
      </section>

      {/* Import */}
      <section className="card">
        <h3 className="section-label" style={{ marginTop: 0 }}>Importar backup</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "0.875rem" }}>
          Restaura dados a partir de um arquivo de backup exportado por este app. Os dados atuais serão substituídos.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
          aria-label="Selecionar arquivo de backup"
        />
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ width: "100%" }}
        >
          📂 Selecionar arquivo .json
        </button>

        {panel === "import-confirm" && importFile && (
          <div
            role="alertdialog"
            aria-label="Confirmar importação"
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,193,7,0.1)",
              border: "1px solid rgba(255,193,7,0.35)",
            }}
          >
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "var(--color-text-primary)", marginBottom: "0.5rem" }}>
              ⚠️ Confirmar importação
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.875rem" }}>
              O arquivo <strong>{importFile.name}</strong> vai substituir os dados locais atuais. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={handleImportConfirm}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={() => { setPanel("idle"); setImportFile(null) }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Reset */}
      <section className="card" style={{ borderColor: "rgba(220,53,69,0.25)" }}>
        <h3 className="section-label" style={{ marginTop: 0, color: "#dc3545" }}>
          ⚠️ Resetar todos os dados
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "0.875rem" }}>
          Apaga permanentemente todos os dados locais do app. Exporte um backup antes de continuar.
        </p>
        {panel !== "reset-confirm" ? (
          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: "100%", borderColor: "rgba(220,53,69,0.4)", color: "#dc3545" }}
            onClick={() => setPanel("reset-confirm")}
          >
            🗑️ Iniciar reset
          </button>
        ) : (
          <div
            role="alertdialog"
            aria-label="Confirmar reset"
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(220,53,69,0.08)",
              border: "1px solid rgba(220,53,69,0.3)",
            }}
          >
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-bold)", color: "#dc3545", marginBottom: "0.5rem" }}>
              Esta ação é irreversível.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
              Digite <strong>resetar</strong> abaixo para confirmar:
            </p>
            <input
              ref={resetInputRef}
              type="text"
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              placeholder="resetar"
              autoFocus
              aria-label="Digite resetar para confirmar"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-surface)",
                color: "var(--color-text-primary)",
                fontSize: "var(--text-sm)",
                marginBottom: "0.75rem",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResetConfirm()
                if (e.key === "Escape") { setPanel("idle"); setResetText("") }
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1, background: "#dc3545", borderColor: "#dc3545" }}
                disabled={resetText.trim().toLowerCase() !== "resetar"}
                onClick={handleResetConfirm}
              >
                Apagar tudo
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={() => { setPanel("idle"); setResetText("") }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textAlign: "center" }}>
        Life RPG — Módulo Fit · Dados armazenados localmente no seu dispositivo
      </p>
    </div>
  )
}
