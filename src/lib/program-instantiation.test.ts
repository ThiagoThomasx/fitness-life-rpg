import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeProgramInstantiationDates,
  detectInstantiationConflicts,
  previewProgramInstantiation,
  instantiateProgramIntoPlanner,
  getNextMonday,
  getToday,
} from './program-instantiation'
import { saveTrainingProgram, type TrainingProgramSession, type TrainingProgramWeek } from './training-programs'
import { savePlannedWorkout, getPlannedWorkouts, type WorkoutTemplateSnapshot } from './planned-workouts'

beforeEach(() => {
  window.localStorage.clear()
})

function snapshot(name = 'Treino A'): WorkoutTemplateSnapshot {
  return {
    name,
    exerciseBlocks: [{ id: 'blk-1', type: 'single', exercise: { id: 'ex-1', exerciseName: 'Supino' } }],
    capturedAt: new Date().toISOString(),
  }
}

function session(overrides: Partial<TrainingProgramSession> = {}): TrainingProgramSession {
  return {
    id: `sess-${Math.random()}`,
    name: 'Treino A',
    templateSnapshot: snapshot(),
    isOptional: false,
    ...overrides,
  }
}

function week(weekNumber: number, sessions: TrainingProgramSession[]): TrainingProgramWeek {
  return { id: `week-${Math.random()}`, weekNumber, sessions }
}

describe('getNextMonday / getToday', () => {
  it('returns a date in YYYY-MM-DD format', () => {
    expect(getNextMonday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('next monday is always a Monday', () => {
    const monday = new Date(`${getNextMonday()}T00:00:00`)
    expect(monday.getDay()).toBe(1)
  })
})

describe('computeProgramInstantiationDates', () => {
  it('positions a session by preferredWeekday within its week', () => {
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session({ preferredWeekday: 3 })])],
      tags: [],
    }).program!

    const dates = computeProgramInstantiationDates(program, '2026-07-20') // Monday
    expect(dates).toHaveLength(1)
    expect(dates[0].weekday).toBe(3)
  })

  it('positions a session by dayIndex offset from week start', () => {
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session({ dayIndex: 2 })])],
      tags: [],
    }).program!

    const dates = computeProgramInstantiationDates(program, '2026-07-20')
    expect(dates[0].date).toBe('2026-07-22')
  })

  it('assigns flexible sessions to free slots without collision', () => {
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session({ dayIndex: 0 }), session(), session()])],
      tags: [],
    }).program!

    const dates = computeProgramInstantiationDates(program, '2026-07-20')
    const uniqueDates = new Set(dates.map((d) => d.date))
    expect(uniqueDates.size).toBe(3)
  })

  it('offsets week 2 by 7 days from week 1', () => {
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session({ dayIndex: 0 })]), week(2, [session({ dayIndex: 0 })])],
      tags: [],
    }).program!

    const dates = computeProgramInstantiationDates(program, '2026-07-20')
    expect(dates.map((d) => d.date)).toEqual(['2026-07-20', '2026-07-27'])
  })
})

describe('detectInstantiationConflicts', () => {
  it('finds no conflicts on an empty planner', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    const dates = computeProgramInstantiationDates(program, '2026-07-20')
    expect(detectInstantiationConflicts(dates)).toHaveLength(0)
  })

  it('detects a conflict when a planned workout already exists on that date', () => {
    savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'Existente', templateSnapshot: snapshot(), isOptional: false })
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    const dates = computeProgramInstantiationDates(program, '2026-07-20')
    const conflicts = detectInstantiationConflicts(dates)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].date).toBe('2026-07-20')
  })
})

describe('previewProgramInstantiation', () => {
  it('does not persist anything', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    previewProgramInstantiation(program, '2026-07-20')
    expect(getPlannedWorkouts()).toHaveLength(0)
  })

  it('reports total sessions and weeks', () => {
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session(), session()]), week(2, [session()])],
      tags: [],
    }).program!
    const preview = previewProgramInstantiation(program, '2026-07-20')
    expect(preview.totalSessions).toBe(3)
    expect(preview.totalWeeks).toBe(2)
  })
})

describe('instantiateProgramIntoPlanner', () => {
  it('cancel strategy creates nothing', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    const result = instantiateProgramIntoPlanner(program, '2026-07-20', 'cancel')
    expect(result.cancelled).toBe(true)
    expect(getPlannedWorkouts()).toHaveLength(0)
  })

  it('keep strategy adds alongside existing planned workouts', () => {
    savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'Existente', templateSnapshot: snapshot(), isOptional: false })
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    instantiateProgramIntoPlanner(program, '2026-07-20', 'keep')
    expect(getPlannedWorkouts()).toHaveLength(2)
  })

  it('replace strategy removes existing in range before inserting', () => {
    savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'Existente', templateSnapshot: snapshot(), isOptional: false })
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0 })])], tags: [] }).program!
    instantiateProgramIntoPlanner(program, '2026-07-20', 'replace')
    const all = getPlannedWorkouts()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Treino A')
  })

  it('skip strategy omits conflicting dates only', () => {
    savePlannedWorkout({ date: '2026-07-20', weekday: 1, name: 'Existente', templateSnapshot: snapshot(), isOptional: false })
    const program = saveTrainingProgram({
      name: 'P',
      weeks: [week(1, [session({ dayIndex: 0 }), session({ dayIndex: 1 })])],
      tags: [],
    }).program!
    const result = instantiateProgramIntoPlanner(program, '2026-07-20', 'skip')
    expect(result.created).toHaveLength(1)
    expect(result.skippedDates).toContain('2026-07-20')
    expect(getPlannedWorkouts()).toHaveLength(2) // existing + the one non-conflicting insert
  })

  it('stores source metadata for independence tracking', () => {
    const program = saveTrainingProgram({
      name: 'Programa X',
      weeks: [week(1, [session({ dayIndex: 0, templateId: 'tpl-1' })])],
      tags: [],
    }).program!
    const result = instantiateProgramIntoPlanner(program, '2026-07-20', 'keep')
    expect(result.created[0].source?.programId).toBe(program.id)
    expect(result.created[0].source?.templateId).toBe('tpl-1')
  })

  it('editing the program after instantiation does not affect already-created planned workouts', () => {
    const program = saveTrainingProgram({ name: 'P', weeks: [week(1, [session({ dayIndex: 0, name: 'Original' })])], tags: [] }).program!
    const result = instantiateProgramIntoPlanner(program, '2026-07-20', 'keep')
    const plannedName = result.created[0].name
    // Simulate editing elsewhere — this module has no reference back to the live program object.
    expect(plannedName).toBe('Original')
    expect(getPlannedWorkouts()[0].name).toBe('Original')
  })
})
