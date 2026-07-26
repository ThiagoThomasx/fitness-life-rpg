// Versioning helpers (Sprint 27 Parte 3).
//
// O repositório já versiona programas e templates (`version: number`,
// incrementado a cada `updateTrainingProgram`/`updateWorkoutTemplate` — ver
// auditoria). Este módulo NÃO reimplementa esse versionamento — só calcula
// os metadados que ligam uma proposta aplicada à transição de versão que ela
// causou, para o audit trail (`AdaptiveAuditEntry.previousVersion/newVersion`
// em `types.ts`). A execução real (Sprint 27 Parte 4) continua chamando
// `updateTrainingProgram`/`updateWorkoutTemplate` diretamente.

import type { ProgramTarget } from './types'

export interface VersionedEntity {
  version: number
}

export interface VersionTransition {
  previousVersion: number
  newVersion: number
}

/** `before`/`after` já resolvidos pelo chamador — nunca lê storage. */
export function describeVersionTransition(before: VersionedEntity, after: VersionedEntity): VersionTransition {
  return { previousVersion: before.version, newVersion: after.version }
}

/**
 * Mesma checagem usada por `applicability.ts` (Fase 20/25 — proposta não pode
 * ficar "aplicável" sobre um snapshot desatualizado), exposta aqui para que
 * o executor (Parte 4) possa reusar sem duplicar a comparação.
 */
export function isProgramVersionStale(target: ProgramTarget, currentProgramVersion: number): boolean {
  if (target.programVersion === undefined) return false
  return target.programVersion !== currentProgramVersion
}
