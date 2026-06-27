import type { Character, WorkoutType, Exercise, Workout } from '@/types/database'

export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'hero@fitrpg.local',
  user_metadata: { full_name: 'Herói Local' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmation_sent_at: undefined,
  confirmed_at: new Date().toISOString(),
  recovery_sent_at: undefined,
  last_sign_in_at: new Date().toISOString(),
  factors: undefined,
  identities: [],
}

export const MOCK_WORKOUT_TYPES: WorkoutType[] = [
  { id: 'wt-1', name: 'Força', slug: 'strength', category: 'strength', base_xp: 50, icon: '💪' },
  { id: 'wt-2', name: 'Cardio', slug: 'cardio', category: 'cardio', base_xp: 40, icon: '🏃' },
  { id: 'wt-3', name: 'Agilidade', slug: 'agility', category: 'agility', base_xp: 45, icon: '⚡' },
  { id: 'wt-4', name: 'Flexibilidade', slug: 'flexibility', category: 'flexibility', base_xp: 30, icon: '🧘' },
]

export const MOCK_EXERCISES: Exercise[] = [
  { id: 'ex-1', workout_type_id: 'wt-1', name: 'Supino Reto', muscle_groups: ['peitoral', 'tríceps'], equipment: ['barra', 'banco'], instructions: null },
  { id: 'ex-2', workout_type_id: 'wt-1', name: 'Agachamento', muscle_groups: ['quadríceps', 'glúteos'], equipment: ['barra', 'rack'], instructions: null },
  { id: 'ex-3', workout_type_id: 'wt-1', name: 'Levantamento Terra', muscle_groups: ['lombar', 'glúteos'], equipment: ['barra'], instructions: null },
  { id: 'ex-4', workout_type_id: 'wt-1', name: 'Desenvolvimento', muscle_groups: ['ombros', 'tríceps'], equipment: ['barra'], instructions: null },
  { id: 'ex-5', workout_type_id: 'wt-1', name: 'Rosca Direta', muscle_groups: ['bíceps'], equipment: ['barra'], instructions: null },
  { id: 'ex-6', workout_type_id: 'wt-1', name: 'Remada Curvada', muscle_groups: ['costas', 'bíceps'], equipment: ['barra'], instructions: null },
  { id: 'ex-7', workout_type_id: 'wt-2', name: 'Corrida', muscle_groups: ['pernas', 'cardiovascular'], equipment: ['esteira'], instructions: null },
  { id: 'ex-8', workout_type_id: 'wt-2', name: 'Bicicleta', muscle_groups: ['pernas', 'cardiovascular'], equipment: ['bicicleta'], instructions: null },
  { id: 'ex-9', workout_type_id: 'wt-1', name: 'Pulldown', muscle_groups: ['costas', 'bíceps'], equipment: ['polia'], instructions: null },
  { id: 'ex-10', workout_type_id: 'wt-1', name: 'Tríceps Pulley', muscle_groups: ['tríceps'], equipment: ['polia'], instructions: null },
]

export type MockWorkout = Workout & { workout_type: WorkoutType; exercises: Exercise[] }

export const MOCK_WORKOUTS: MockWorkout[] = [
  {
    id: 'w-1',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Treino A — Peito e Tríceps',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[0], MOCK_EXERCISES[3], MOCK_EXERCISES[9]],
  },
  {
    id: 'w-2',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Treino B — Costas e Bíceps',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[5], MOCK_EXERCISES[8], MOCK_EXERCISES[4]],
  },
  {
    id: 'w-3',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Treino C — Pernas',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[1], MOCK_EXERCISES[2]],
  },
  {
    id: 'w-4',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-2',
    name: 'Cardio 30min',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[1],
    exercises: [MOCK_EXERCISES[6], MOCK_EXERCISES[7]],
  },
]

export const MOCK_CHARACTER: Character = {
  id: 'mock-char-id',
  user_id: 'mock-user-id',
  name: 'Herói Iniciante',
  level: 1,
  current_xp: 240,
  total_xp: 240,
  strength: 10,
  agility: 10,
  dexterity: 10,
  constitution: 10,
  vitality: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
