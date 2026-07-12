"use client"

import { useState, useEffect, useCallback } from "react"
import {
  downloadBackup,
  importBackup,
  parseBackupFile,
  resetAllData,
  getStorageStatus,
  type StorageStatus,
} from "@/lib/backup"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { PreferencesLinkCard } from "@/components/settings/PreferencesLinkCard"
import { StorageStatusSection } from "@/components/settings/StorageStatusSection"
import { BackupExportSection } from "@/components/settings/BackupExportSection"
import { BackupImportSection } from "@/components/settings/BackupImportSection"
import { DataResetSection } from "@/components/settings/DataResetSection"

type Panel = "idle" | "import-confirm" | "reset-confirm"

export default function ConfiguracoesPage() {
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
    const params = new URLSearchParams(window.location.search)
    if (params.get("resetado") === "true") {
      setMessage({ type: "ok", text: "Todos os dados foram apagados. O app está limpo." })
      const url = new URL(window.location.href)
      url.searchParams.delete("resetado")
      window.history.replaceState({}, "", url.toString())
    }
    if (params.get("importado") === "true") {
      const count = params.get("chaves")
      setMessage({
        type: "ok",
        text: count ? `Backup restaurado com sucesso! ${count} chaves importadas.` : "Backup restaurado com sucesso!",
      })
      const url = new URL(window.location.href)
      url.searchParams.delete("importado")
      url.searchParams.delete("chaves")
      window.history.replaceState({}, "", url.toString())
    }
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

  function handleFileSelected(file: File) {
    setImportFile(file)
    setPanel("import-confirm")
  }

  async function handleImportConfirm() {
    if (!importFile) return
    try {
      const text = await importFile.text()
      const payload = parseBackupFile(text)
      if (!payload) {
        showMessage("err", "Arquivo inválido. Selecione um backup exportado pelo app.")
        setPanel("idle")
        setImportFile(null)
        return
      }
      const result = importBackup(payload)
      if (!result.ok) {
        showMessage("err", result.error ?? "Falha na importação.")
        setPanel("idle")
        setImportFile(null)
        return
      }
      // Recarrega a página para re-hidratar as stores Zustand com os dados
      // importados (mesmo padrão do reset): sem isso, Dashboard/Perfil
      // continuariam mostrando o estado anterior até um refresh manual.
      window.location.href = `/configuracoes?importado=true&chaves=${result.restoredKeys.length}`
    } catch {
      showMessage("err", "Erro ao ler o arquivo.")
      setPanel("idle")
      setImportFile(null)
    }
  }

  function handleResetConfirm() {
    if (resetText.trim().toLowerCase() !== "resetar") return
    resetAllData()
    // Full page reload clears all in-memory Zustand stores; redirect back here to show success
    window.location.href = "/configuracoes?resetado=true"
  }

  return (
    <div className="page">
      <SettingsHeader />

      <PreferencesLinkCard />

      {message && (
        <div role="alert" className={`alert ${message.type === "ok" ? "alert--success" : "alert--danger"}`}>
          {message.type === "ok" ? "✓ " : "✕ "}{message.text}
        </div>
      )}

      <StorageStatusSection status={status} />

      <BackupExportSection onExport={handleExport} />

      <BackupImportSection
        isConfirming={panel === "import-confirm"}
        fileName={importFile?.name ?? null}
        onFileSelected={handleFileSelected}
        onConfirm={handleImportConfirm}
        onCancel={() => { setPanel("idle"); setImportFile(null) }}
      />

      <DataResetSection
        isConfirming={panel === "reset-confirm"}
        resetText={resetText}
        onStart={() => setPanel("reset-confirm")}
        onResetTextChange={setResetText}
        onConfirm={handleResetConfirm}
        onCancel={() => { setPanel("idle"); setResetText("") }}
      />

      <p className="settings-footer-note">
        Life RPG — Módulo Fit · Dados armazenados localmente no seu dispositivo
      </p>
    </div>
  )
}
