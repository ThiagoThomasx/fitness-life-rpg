"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { buildHealthRecoveryDashboard } from "@/lib/health-data"
import type { AnalyticsPeriod } from "@/lib/analytics/types"
import { PERIOD_OPTIONS } from "@/components/dashboard/analytics/analytics-ui"
import { HealthRecoverySummary } from "@/components/health-recovery/HealthRecoverySummary"
import { HealthRecoveryMetricSection } from "@/components/health-recovery/HealthRecoveryMetricSection"
import { HealthRecoveryWeightSection } from "@/components/health-recovery/HealthRecoveryWeightSection"
import { HealthRecoveryQualitySection } from "@/components/health-recovery/HealthRecoveryQualitySection"
import { HealthRecoveryConflictsSection } from "@/components/health-recovery/HealthRecoveryConflictsSection"
import { formatMinutesAsHours } from "@/components/health-recovery/health-recovery-ui"

/**
 * Experiência de Recuperação (Sprint 29 Parte 2) — rota própria, não
 * adicionada à navegação principal (decisão travada no Sprint 1, CLAUDE.md
 * regra 6). Acessível via card em Configurações → "Dados de saúde", mesmo
 * padrão de `/preferencias`. `buildHealthRecoveryDashboard` é chamado uma
 * única vez por troca de período — nenhuma seção recalcula por conta própria
 * (ver seção 31 do brief da Sprint 29 — performance).
 */
export default function SaudePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")

  useEffect(() => {
    setMounted(true)
  }, [])

  const dashboard = useMemo(() => (mounted ? buildHealthRecoveryDashboard(period) : null), [mounted, period])

  return (
    <main className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: "1.25rem", padding: 0 }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)" }}>🩺 Saúde e recuperação</h1>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
            Seus dados de saúde ficam armazenados localmente neste dispositivo.
          </p>
        </div>
      </div>

      {!dashboard ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="filter-row" role="group" aria-label="Filtrar saúde por período">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={period === opt.id ? "filter-pill filter-pill--active" : "filter-pill"}
                aria-pressed={period === opt.id}
                onClick={() => setPeriod(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {!dashboard.hasAnyData ? (
            <section className="card empty-state">
              <div className="empty-state__icon" aria-hidden="true">🩺</div>
              <div className="empty-state__title">Nenhum dado de saúde ainda</div>
              <div className="empty-state__desc">
                Adicione registros manuais ou importe um arquivo em Configurações → Dados de saúde para ver sua
                experiência de recuperação aqui.
              </div>
            </section>
          ) : (
            <>
              <HealthRecoverySummary dashboard={dashboard} />

              <HealthRecoveryMetricSection
                icon="😴"
                title="Sono"
                description="Duração de sono por noite, comparada à sua linha de base"
                view={dashboard.sleep}
                dailySeries={dashboard.dailySeries}
                metric="sleep_duration"
                unit="min"
                formatValue={formatMinutesAsHours}
                emptyDescription="Registre ou importe dados de sono para ver esta seção"
              />

              <HealthRecoveryMetricSection
                icon="❤️"
                title="Frequência cardíaca de repouso"
                description="A frequência cardíaca de repouso pode variar por diversos fatores. Este dado é informativo e não representa diagnóstico."
                view={dashboard.restingHeartRate}
                dailySeries={dashboard.dailySeries}
                metric="resting_heart_rate"
                unit="bpm"
                emptyDescription="Registre ou importe dados de FC de repouso para ver esta seção"
              />

              <HealthRecoveryMetricSection
                icon="🚶"
                title="Passos"
                description="Passos diários, comparados à sua linha de base"
                view={dashboard.steps}
                dailySeries={dashboard.dailySeries}
                metric="steps"
                unit=""
                formatValue={(v) => Math.round(v).toLocaleString("pt-BR")}
                emptyDescription="Registre ou importe dados de passos para ver esta seção"
              />

              <HealthRecoveryMetricSection
                icon="🏃"
                title="Atividade externa"
                description="Minutos de atividade fora dos treinos registrados no app"
                view={dashboard.activityMinutes}
                dailySeries={dashboard.dailySeries}
                metric="activity_duration"
                unit="min"
                emptyDescription="Registre ou importe dados de atividade para ver esta seção"
              />

              <HealthRecoveryWeightSection weight={dashboard.weight} />

              <HealthRecoveryQualitySection quality={dashboard.quality} />

              <HealthRecoveryConflictsSection conflicts={dashboard.conflicts} />
            </>
          )}
        </div>
      )}
    </main>
  )
}
