// Regras determinísticas do Coach — Sprint 26 Parte 2.
//
// Cada regra é uma função pura `CoachSignals -> CoachRuleFinding[]`. Nenhuma
// regra lê storage, nenhuma recalcula um motor — todas leem só o que
// `signals.ts` já preparou. `weight` (0-1) descreve o quão fora do esperado a
// condição está (vira prioridade em `priority.ts`); `sampleSize` descreve
// quantos pontos de dado sustentam o achado (vira confiança). Regras que não
// encontram nada retornam array vazio — nunca inventam um achado para "ter
// conteúdo".

import { MUSCLE_GROUP_LABELS } from '../muscle-groups'
import { ALL_MUSCLE_GROUPS } from '../training-load'
import { periodLabel, pct, round } from './helpers'
import type { CoachRule, CoachRuleFinding } from './types'
import type { CoachSignals } from './signals'

const MIN_SESSIONS_FOR_CONSISTENCY_SIGNAL = 2
const LOW_ADHERENCE_THRESHOLD = 0.6
const HIGH_ADHERENCE_THRESHOLD = 0.9
const LONG_GAP_DAYS_THRESHOLD = 14
const EXCESSIVE_VOLUME_WEIGHT_DIVISOR = 60
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

// ─── Coach.Recovery.HighLoadLowReadiness ────────────────────────────────────
// "Carga elevada + Readiness baixo + Recuperação ruim" — o exemplo canônico
// da spec. Reaproveita o padrão já cruzado por `analytics/fatigue.ts`
// (`fatigue:high_load_low_readiness`) em vez de recruzar carga x prontidão.

function evaluateHighLoadLowReadiness(signals: CoachSignals): CoachRuleFinding[] {
  const pattern = signals.recovery.patterns.find((p) => p.id.startsWith('fatigue:high_load_low_readiness'))
  if (!pattern) return []

  return [
    {
      category: 'recovery',
      title: pattern.title,
      summary: pattern.explanation,
      evidence: pattern.evidence,
      sampleSize: signals.recovery.readiness.totalCheckIns,
      weight: 0.85,
      suggestion: `Considere reduzir o volume da sessão de hoje em relação ao planejado, já que carga e prontidão estão desalinhadas em ${periodLabel(signals.period)}.`,
      actions: [{ kind: 'planner', label: 'Ver plano da semana' }],
    },
  ]
}

// ─── Coach.Load.HighLoadMajorityFatigued ────────────────────────────────────
// Carga em alta + maioria dos grupos musculares ainda em recuperação —
// eixo objetivo (recuperação), distinto do eixo subjetivo (prontidão) acima.

function evaluateHighLoadMajorityFatigued(signals: CoachSignals): CoachRuleFinding[] {
  const pattern = signals.recovery.patterns.find((p) => p.id.startsWith('fatigue:high_load_majority_fatigued'))
  if (!pattern) return []

  const fatiguedCount = ALL_MUSCLE_GROUPS.filter(
    (mg) => signals.recovery.recoveryByMuscleGroup[mg].status !== 'recovered'
  ).length

  return [
    {
      category: 'training_load',
      title: pattern.title,
      summary: pattern.explanation,
      evidence: pattern.evidence,
      sampleSize: fatiguedCount,
      weight: 0.75,
      suggestion: 'Priorize grupos musculares já recuperados na próxima sessão em vez de repetir os que ainda estão em recuperação.',
      actions: [{ kind: 'history', label: 'Ver histórico de treinos' }],
    },
  ]
}

// ─── Coach.Consistency.LowAdherence ─────────────────────────────────────────

function evaluateLowAdherence(signals: CoachSignals): CoachRuleFinding[] {
  const c = signals.consistency
  if (c.plannedSessions < MIN_SESSIONS_FOR_CONSISTENCY_SIGNAL) return []
  if (c.weeklyAdherenceRate === null || c.weeklyAdherenceRate >= LOW_ADHERENCE_THRESHOLD) return []

  const weight = clamp01((LOW_ADHERENCE_THRESHOLD - c.weeklyAdherenceRate) / LOW_ADHERENCE_THRESHOLD + 0.3)

  return [
    {
      category: 'consistency',
      title: 'Aderência ao plano abaixo do esperado',
      summary: `Nos ${periodLabel(signals.period)}, a aderência semanal ao plano ficou em ${pct(c.weeklyAdherenceRate)}.`,
      evidence: [
        `${c.missedSessions} sessões perdidas de ${c.plannedSessions} planejadas`,
        `Aderência semanal: ${pct(c.weeklyAdherenceRate)}`,
      ],
      sampleSize: c.completedSessions,
      weight,
      suggestion: 'Revise a frequência planejada — pode ser mais realista reduzir o número de sessões por semana do que continuar perdendo treinos.',
      actions: [{ kind: 'planner', label: 'Rever plano semanal' }],
    },
  ]
}

// ─── Coach.Program.HighAdherence ────────────────────────────────────────────
// Reforço positivo — prioridade baixa por design (não é uma ação a tomar).

function evaluateHighAdherence(signals: CoachSignals): CoachRuleFinding[] {
  const c = signals.consistency
  if (c.plannedSessions < MIN_SESSIONS_FOR_CONSISTENCY_SIGNAL) return []
  if (c.weeklyAdherenceRate === null || c.weeklyAdherenceRate < HIGH_ADHERENCE_THRESHOLD) return []

  return [
    {
      category: 'program',
      title: 'Excelente consistência com o plano',
      summary: `Nos ${periodLabel(signals.period)}, a aderência semanal ao plano foi de ${pct(c.weeklyAdherenceRate)}.`,
      evidence: [
        `${c.completedSessions} sessões concluídas de ${c.plannedSessions} planejadas`,
        `Sequência atual: ${c.currentStreakDays} dias`,
      ],
      sampleSize: c.completedSessions,
      weight: 0.2,
      suggestion: 'Continue seguindo o plano como está — a aderência atual está sólida.',
      actions: [{ kind: 'planner', label: 'Ver plano da semana' }],
    },
  ]
}

// ─── Coach.Frequency.LongGap ────────────────────────────────────────────────
// "Posteriores 16 dias sem treino" — o exemplo canônico da spec, um por
// grupo muscular com hiato longo desde o último treino.

function evaluateLongGapMuscleGroup(signals: CoachSignals): CoachRuleFinding[] {
  const findings: CoachRuleFinding[] = []

  for (const mg of ALL_MUSCLE_GROUPS) {
    const recovery = signals.recovery.recoveryByMuscleGroup[mg]
    if (!recovery.lastTrainedAt || recovery.hoursSinceTrained === null) continue

    const days = Math.floor(recovery.hoursSinceTrained / 24)
    if (days < LONG_GAP_DAYS_THRESHOLD) continue

    const label = MUSCLE_GROUP_LABELS[mg]
    findings.push({
      category: 'frequency',
      title: `${label} sem treino há ${days} dias`,
      summary: `O grupo muscular ${label} não é treinado há ${days} dias, o maior hiato entre os grupos monitorados.`,
      evidence: [`Último treino de ${label}: ${days} dias atrás`],
      sampleSize: 1,
      weight: clamp01(days / 30),
      suggestion: `Priorize ${label} na próxima sessão ou no planejamento da semana.`,
      actions: [{ kind: 'planner', label: 'Rever plano semanal' }],
      scopeKey: mg,
    })
  }

  return findings
}

// ─── Coach.Muscle.Neglected ─────────────────────────────────────────────────
// Participação baixa em SÉRIES no período (distinto de "sem treinar há N
// dias" — um grupo pode ter sido treinado recentemente e ainda assim receber
// pouquíssimo volume relativo aos demais).

function evaluateNeglectedMuscleGroup(signals: CoachSignals): CoachRuleFinding[] {
  // Sem NENHUM treino registrado no período, "negligenciado" não é um sinal
  // útil — todo grupo estaria em 0%, e o problema real seria consistência
  // (já coberto por `Coach.Consistency.LowAdherence`), não distribuição.
  const totalSets = signals.muscleBalance.distribution.reduce((sum, d) => sum + d.sets, 0)
  if (totalSets === 0) return []

  const findings: CoachRuleFinding[] = []

  for (const mg of signals.muscleBalance.neglectedGroups) {
    const entry = signals.muscleBalance.distribution.find((d) => d.muscleGroup === mg)
    if (!entry) continue

    const label = MUSCLE_GROUP_LABELS[mg]
    findings.push({
      category: 'muscle_balance',
      title: `${label} com participação baixa no volume total`,
      summary: `Nos ${periodLabel(signals.period)}, ${label} representou apenas ${round(entry.participationPercent, 1)}% das séries totais.`,
      evidence: [
        `${entry.sets} séries de ${label} em ${entry.frequency} sessões`,
        `Participação: ${round(entry.participationPercent, 1)}% do total de séries`,
      ],
      sampleSize: entry.frequency,
      weight: clamp01(0.5 - entry.participationPercent / 100),
      suggestion: `Redistribua parte do volume semanal para incluir mais séries de ${label}.`,
      actions: [{ kind: 'planner', label: 'Rever plano semanal' }],
      scopeKey: mg,
    })
  }

  return findings
}

// ─── Coach.Volume.Imbalance ─────────────────────────────────────────────────
// "Quadríceps 35% acima da média" — o exemplo canônico da spec, participação
// excessiva de um grupo em relação à fatia proporcional esperada.

function evaluateExcessiveVolumeGroup(signals: CoachSignals): CoachRuleFinding[] {
  const findings: CoachRuleFinding[] = []

  for (const mg of signals.muscleBalance.excessiveGroups) {
    const entry = signals.muscleBalance.distribution.find((d) => d.muscleGroup === mg)
    if (!entry) continue

    const label = MUSCLE_GROUP_LABELS[mg]
    findings.push({
      category: 'volume',
      title: `${label} com volume desproporcional`,
      summary: `Nos ${periodLabel(signals.period)}, ${label} concentrou ${round(entry.participationPercent, 1)}% das séries totais, bem acima da fatia equilibrada esperada.`,
      evidence: [
        `${entry.sets} séries de ${label} em ${entry.frequency} sessões`,
        `Participação: ${round(entry.participationPercent, 1)}% do total de séries`,
      ],
      sampleSize: entry.frequency,
      weight: clamp01(entry.participationPercent / EXCESSIVE_VOLUME_WEIGHT_DIVISOR),
      suggestion: `Redistribua parte do volume de ${label} para outros grupos musculares negligenciados.`,
      actions: [{ kind: 'planner', label: 'Rever plano semanal' }],
      scopeKey: mg,
    })
  }

  return findings
}

// ─── Coach.Progress.Stagnation ──────────────────────────────────────────────
// "Supino Inclinado, últimas 8 semanas, carga permaneceu praticamente
// estável" — o exemplo canônico da spec (id citado literalmente no doc de
// explainability). Cobre tanto "progressão" quanto "estagnação" da lista de
// regras exigidas: são o mesmo fenômeno observável nos dados deste app (carga
// estável ao longo de execuções sucessivas de um exercício) — desdobrar em
// duas regras separadas duplicaria a mesma evidência sob dois ids diferentes.

function evaluateProgressStagnation(signals: CoachSignals): CoachRuleFinding[] {
  return signals.performance.stagnationDetails.map((detail) => ({
    category: 'stagnation' as const,
    title: `${detail.exerciseName} sem evolução de carga`,
    summary: `A carga de ${detail.exerciseName} permaneceu praticamente estável nas últimas execuções registradas.`,
    evidence: [detail.trend.explanation],
    sampleSize: detail.trend.sampleSize,
    // `getExerciseTrends` já exige amostra mínima de 6 execuções para classificar como 'stable'
    // (nunca insuficiente) — o peso do achado não varia com o tamanho da amostra além disso;
    // quem varia com amostra é a CONFIANÇA (`priority.ts`), calculada separadamente.
    weight: 0.6,
    suggestion: `Considere revisar o esquema de progressão de ${detail.exerciseName} (ex.: variar reps, adicionar uma série, trocar variação).`,
    actions: [{ kind: 'exercise', label: `Ver ${detail.exerciseName}`, id: detail.exerciseId }],
    scopeKey: detail.exerciseId,
  }))
}

// ─── Coach.Records.RecentAchievement ────────────────────────────────────────
// Reforço positivo — recordes recentes, prioridade baixa por design.

function evaluateRecentRecords(signals: CoachSignals): CoachRuleFinding[] {
  if (signals.records.recent.length === 0) return []

  const [latest] = signals.records.recent
  const typeLabel: Record<string, string> = {
    first_time: 'primeira execução registrada',
    weight: 'recorde de carga',
    volume: 'recorde de volume',
    reps: 'recorde de repetições',
  }

  return [
    {
      category: 'records',
      title: `Novo recorde em ${latest.exerciseName}`,
      summary: `${latest.exerciseName} teve um ${typeLabel[latest.type]} recentemente.`,
      evidence: [`${latest.exerciseName}: ${typeLabel[latest.type]} em ${latest.date.slice(0, 10)}`],
      sampleSize: signals.records.recent.length,
      weight: 0.15,
      suggestion: 'Continue com a progressão atual desse exercício.',
      actions: [{ kind: 'exercise', label: `Ver ${latest.exerciseName}`, id: latest.exerciseId }],
      scopeKey: latest.exerciseId,
    },
  ]
}

export const COACH_RULES: CoachRule[] = [
  { id: 'Coach.Recovery.HighLoadLowReadiness', category: 'recovery', evaluate: evaluateHighLoadLowReadiness },
  { id: 'Coach.Load.HighLoadMajorityFatigued', category: 'training_load', evaluate: evaluateHighLoadMajorityFatigued },
  { id: 'Coach.Consistency.LowAdherence', category: 'consistency', evaluate: evaluateLowAdherence },
  { id: 'Coach.Program.HighAdherence', category: 'program', evaluate: evaluateHighAdherence },
  { id: 'Coach.Frequency.LongGap', category: 'frequency', evaluate: evaluateLongGapMuscleGroup },
  { id: 'Coach.Muscle.Neglected', category: 'muscle_balance', evaluate: evaluateNeglectedMuscleGroup },
  { id: 'Coach.Volume.Imbalance', category: 'volume', evaluate: evaluateExcessiveVolumeGroup },
  { id: 'Coach.Progress.Stagnation', category: 'stagnation', evaluate: evaluateProgressStagnation },
  { id: 'Coach.Records.RecentAchievement', category: 'records', evaluate: evaluateRecentRecords },
]
