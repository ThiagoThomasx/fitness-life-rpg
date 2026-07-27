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
import { MAX_HEALTH_IMPORT_FILE_BYTES } from "@/lib/health-data/manual-entry"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { PreferencesLinkCard } from "@/components/settings/PreferencesLinkCard"
import { StorageStatusSection } from "@/components/settings/StorageStatusSection"
import { BackupExportSection } from "@/components/settings/BackupExportSection"
import { BackupImportSection } from "@/components/settings/BackupImportSection"
import { DataResetSection } from "@/components/settings/DataResetSection"
import { PhotoResetSection } from "@/components/settings/PhotoResetSection"
import { BodyProgressResetSection } from "@/components/settings/BodyProgressResetSection"
import { TemplatesProgramsResetSection } from "@/components/settings/TemplatesProgramsResetSection"
import { WorkoutHistoryResetSection } from "@/components/settings/WorkoutHistoryResetSection"
import { CoachAdaptiveResetSection } from "@/components/settings/CoachAdaptiveResetSection"
import { HealthDataResetSection } from "@/components/settings/HealthDataResetSection"
import { HealthImportSettingsResetSection } from "@/components/settings/HealthImportSettingsResetSection"
import { HealthRecoveryLinkCard } from "@/components/settings/HealthRecoveryLinkCard"
import { BodyWellnessExportSection } from "@/components/settings/BodyWellnessExportSection"
import { HealthDataSection } from "@/components/settings/HealthDataSection"
import { resetHealthData, resetHealthImportPresets } from "@/lib/health-data"
import { clearAllPhotos } from "@/lib/body-progress-photo-db"
import { stripAllPhotoLinks, resetAllBodyProgress } from "@/lib/body-progress-photo-link"
import { getBodyProgressEntries } from "@/lib/body-progress"
import { getCheckIns } from "@/lib/readiness-check-ins"
import { resetWorkoutTemplates } from "@/lib/workout-templates"
import { resetTrainingPrograms } from "@/lib/training-programs"
import { resetWorkoutHistory } from "@/lib/workout-history"
import { resetPersonalRecordEvents } from "@/lib/personal-record-events"
import { resetCoachDecisions } from "@/lib/coach/decisions"
import { resetAdaptivePlanning } from "@/lib/adaptive-planning/storage"
import {
  downloadBodyProgressCsv,
  downloadWellnessCsv,
  downloadBodyWellnessMarkdownReport,
  filterBodyProgressByPeriod,
  filterCheckInsByPeriod,
  type ExportPeriodOption,
} from "@/lib/body-wellness-export"

type Panel = "idle" | "import-confirm" | "reset-confirm" | "photo-reset-confirm" | "body-reset-confirm" | "templates-programs-reset-confirm" | "workout-history-reset-confirm" | "coach-adaptive-reset-confirm" | "health-data-reset-confirm" | "health-import-settings-reset-confirm"

export default function ConfiguracoesPage() {
  const [panel, setPanel] = useState<Panel>("idle")
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [resetText, setResetText] = useState("")
  const [photoResetText, setPhotoResetText] = useState("")
  const [bodyResetText, setBodyResetText] = useState("")
  const [bodyResetDeletePhotos, setBodyResetDeletePhotos] = useState(true)
  const [templatesProgramsResetText, setTemplatesProgramsResetText] = useState("")
  const [resetTemplatesSelected, setResetTemplatesSelected] = useState(true)
  const [resetProgramsSelected, setResetProgramsSelected] = useState(true)
  const [workoutHistoryResetText, setWorkoutHistoryResetText] = useState("")
  const [coachAdaptiveResetText, setCoachAdaptiveResetText] = useState("")
  const [healthDataResetText, setHealthDataResetText] = useState("")
  const [healthImportSettingsResetText, setHealthImportSettingsResetText] = useState("")
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

  async function handleExport() {
    try {
      await downloadBackup()
      showMessage("ok", "Backup exportado com sucesso!")
    } catch {
      showMessage("err", "Falha ao exportar. Tente novamente.")
    }
  }

  function handleFileSelected(file: File) {
    if (file.size > MAX_HEALTH_IMPORT_FILE_BYTES) {
      const maxMb = (MAX_HEALTH_IMPORT_FILE_BYTES / (1024 * 1024)).toFixed(0)
      showMessage("err", `Arquivo muito grande. O limite é ${maxMb}MB.`)
      return
    }
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

  async function handleResetConfirm() {
    if (resetText.trim().toLowerCase() !== "resetar") return
    await resetAllData()
    // Full page reload clears all in-memory Zustand stores; redirect back here to show success
    window.location.href = "/configuracoes?resetado=true"
  }

  async function handlePhotoResetConfirm() {
    if (photoResetText.trim().toLowerCase() !== "resetar") return
    await clearAllPhotos()
    await stripAllPhotoLinks()
    setPanel("idle")
    setPhotoResetText("")
    // Fotos não passam por nenhuma store Zustand — sem necessidade de reload de página.
    showMessage("ok", "Todas as fotos de progresso foram apagadas.")
  }

  async function handleBodyResetConfirm() {
    if (bodyResetText.trim().toLowerCase() !== "resetar") return
    const result = await resetAllBodyProgress(bodyResetDeletePhotos)
    setPanel("idle")
    setBodyResetText("")
    // Progresso corporal não passa por nenhuma store Zustand — sem necessidade de reload de página.
    showMessage(
      "ok",
      `${result.entriesDeleted} registro(s) corporal(is) apagado(s)${result.photosDeleted > 0 ? ` e ${result.photosDeleted} foto(s)` : ""}.`
    )
  }

  function handleBodyProgressCsvExport(period: ExportPeriodOption) {
    downloadBodyProgressCsv(filterBodyProgressByPeriod(getBodyProgressEntries(), period))
    showMessage("ok", "CSV de progresso corporal exportado.")
  }

  function handleWellnessCsvExport(period: ExportPeriodOption) {
    downloadWellnessCsv(filterCheckInsByPeriod(getCheckIns(), period))
    showMessage("ok", "CSV de bem-estar exportado.")
  }

  function handleMarkdownReportExport(period: ExportPeriodOption) {
    downloadBodyWellnessMarkdownReport({ entries: getBodyProgressEntries(), checkIns: getCheckIns(), period })
    showMessage("ok", "Relatório em Markdown exportado.")
  }

  function handleTemplatesProgramsResetConfirm() {
    if (templatesProgramsResetText.trim().toLowerCase() !== "resetar") return
    if (!resetTemplatesSelected && !resetProgramsSelected) return
    if (resetTemplatesSelected) resetWorkoutTemplates()
    if (resetProgramsSelected) resetTrainingPrograms()
    setPanel("idle")
    setTemplatesProgramsResetText("")
    const parts = [resetTemplatesSelected && "templates", resetProgramsSelected && "programas"].filter(Boolean)
    showMessage("ok", `Apagado(s): ${parts.join(" e ")}.`)
  }

  function handleWorkoutHistoryResetConfirm() {
    if (workoutHistoryResetText.trim().toLowerCase() !== "resetar") return
    resetWorkoutHistory()
    resetPersonalRecordEvents()
    setPanel("idle")
    setWorkoutHistoryResetText("")
    showMessage("ok", "Histórico de treinos e recordes derivados foram apagados.")
  }

  function handleCoachAdaptiveResetConfirm() {
    if (coachAdaptiveResetText.trim().toLowerCase() !== "resetar") return
    resetCoachDecisions()
    resetAdaptivePlanning()
    setPanel("idle")
    setCoachAdaptiveResetText("")
    showMessage("ok", "Decisões do Coach e ajustes adaptativos foram apagados. Mudanças já aplicadas continuam valendo.")
  }

  function handleHealthDataResetConfirm() {
    if (healthDataResetText.trim().toLowerCase() !== "resetar") return
    resetHealthData()
    setPanel("idle")
    setHealthDataResetText("")
    // Dados de saúde não passam por nenhuma store Zustand — sem necessidade de reload de página.
    showMessage("ok", "Dados de saúde apagados. Treinos, Readiness e Body Progress não foram afetados.")
  }

  function handleHealthImportSettingsResetConfirm() {
    if (healthImportSettingsResetText.trim().toLowerCase() !== "resetar") return
    resetHealthImportPresets()
    setPanel("idle")
    setHealthImportSettingsResetText("")
    showMessage("ok", "Configurações de importação apagadas. Registros de saúde já importados não foram afetados.")
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

      <HealthRecoveryLinkCard />

      <HealthDataSection />

      <BodyWellnessExportSection
        onExportBodyCsv={handleBodyProgressCsvExport}
        onExportWellnessCsv={handleWellnessCsvExport}
        onExportMarkdownReport={handleMarkdownReportExport}
      />

      <PhotoResetSection
        isConfirming={panel === "photo-reset-confirm"}
        resetText={photoResetText}
        onStart={() => setPanel("photo-reset-confirm")}
        onResetTextChange={setPhotoResetText}
        onConfirm={handlePhotoResetConfirm}
        onCancel={() => { setPanel("idle"); setPhotoResetText("") }}
      />

      <BodyProgressResetSection
        isConfirming={panel === "body-reset-confirm"}
        resetText={bodyResetText}
        deletePhotos={bodyResetDeletePhotos}
        onStart={() => setPanel("body-reset-confirm")}
        onResetTextChange={setBodyResetText}
        onDeletePhotosChange={setBodyResetDeletePhotos}
        onConfirm={handleBodyResetConfirm}
        onCancel={() => { setPanel("idle"); setBodyResetText("") }}
      />

      <TemplatesProgramsResetSection
        isConfirming={panel === "templates-programs-reset-confirm"}
        resetText={templatesProgramsResetText}
        resetTemplates={resetTemplatesSelected}
        resetPrograms={resetProgramsSelected}
        onStart={() => setPanel("templates-programs-reset-confirm")}
        onResetTextChange={setTemplatesProgramsResetText}
        onResetTemplatesChange={setResetTemplatesSelected}
        onResetProgramsChange={setResetProgramsSelected}
        onConfirm={handleTemplatesProgramsResetConfirm}
        onCancel={() => { setPanel("idle"); setTemplatesProgramsResetText("") }}
      />

      <WorkoutHistoryResetSection
        isConfirming={panel === "workout-history-reset-confirm"}
        resetText={workoutHistoryResetText}
        onStart={() => setPanel("workout-history-reset-confirm")}
        onResetTextChange={setWorkoutHistoryResetText}
        onConfirm={handleWorkoutHistoryResetConfirm}
        onCancel={() => { setPanel("idle"); setWorkoutHistoryResetText("") }}
      />

      <CoachAdaptiveResetSection
        isConfirming={panel === "coach-adaptive-reset-confirm"}
        resetText={coachAdaptiveResetText}
        onStart={() => setPanel("coach-adaptive-reset-confirm")}
        onResetTextChange={setCoachAdaptiveResetText}
        onConfirm={handleCoachAdaptiveResetConfirm}
        onCancel={() => { setPanel("idle"); setCoachAdaptiveResetText("") }}
      />

      <HealthDataResetSection
        isConfirming={panel === "health-data-reset-confirm"}
        resetText={healthDataResetText}
        onStart={() => setPanel("health-data-reset-confirm")}
        onResetTextChange={setHealthDataResetText}
        onConfirm={handleHealthDataResetConfirm}
        onCancel={() => { setPanel("idle"); setHealthDataResetText("") }}
      />

      <HealthImportSettingsResetSection
        isConfirming={panel === "health-import-settings-reset-confirm"}
        resetText={healthImportSettingsResetText}
        onStart={() => setPanel("health-import-settings-reset-confirm")}
        onResetTextChange={setHealthImportSettingsResetText}
        onConfirm={handleHealthImportSettingsResetConfirm}
        onCancel={() => { setPanel("idle"); setHealthImportSettingsResetText("") }}
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
