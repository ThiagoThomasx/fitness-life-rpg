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
  // Peito
  { id: 'ex-1', workout_type_id: 'wt-1', name: 'Supino Reto', muscle_groups: ['peitoral', 'tríceps', 'ombros'], equipment: ['barra', 'banco'], instructions: null },
  { id: 'ex-2', workout_type_id: 'wt-1', name: 'Supino Inclinado', muscle_groups: ['peitoral superior', 'tríceps'], equipment: ['barra', 'banco inclinado'], instructions: null },
  { id: 'ex-3', workout_type_id: 'wt-1', name: 'Crucifixo', muscle_groups: ['peitoral'], equipment: ['halteres', 'banco'], instructions: null },
  // Costas
  { id: 'ex-4', workout_type_id: 'wt-1', name: 'Remada Curvada', muscle_groups: ['costas', 'bíceps', 'lombar'], equipment: ['barra'], instructions: null },
  { id: 'ex-5', workout_type_id: 'wt-1', name: 'Puxada Alta', muscle_groups: ['latíssimo', 'bíceps'], equipment: ['polia'], instructions: null },
  { id: 'ex-6', workout_type_id: 'wt-1', name: 'Remada Baixa', muscle_groups: ['costas média', 'bíceps'], equipment: ['polia'], instructions: null },
  // Pernas
  { id: 'ex-7', workout_type_id: 'wt-1', name: 'Agachamento Livre', muscle_groups: ['quadríceps', 'glúteos', 'isquiotibiais'], equipment: ['barra', 'rack'], instructions: null },
  { id: 'ex-8', workout_type_id: 'wt-1', name: 'Leg Press', muscle_groups: ['quadríceps', 'glúteos'], equipment: ['máquina leg press'], instructions: null },
  { id: 'ex-9', workout_type_id: 'wt-1', name: 'Cadeira Extensora', muscle_groups: ['quadríceps'], equipment: ['máquina extensora'], instructions: null },
  { id: 'ex-10', workout_type_id: 'wt-1', name: 'Mesa Flexora', muscle_groups: ['isquiotibiais'], equipment: ['máquina flexora'], instructions: null },
  // Ombros
  { id: 'ex-11', workout_type_id: 'wt-1', name: 'Desenvolvimento', muscle_groups: ['ombros', 'tríceps'], equipment: ['barra'], instructions: null },
  { id: 'ex-12', workout_type_id: 'wt-1', name: 'Elevação Lateral', muscle_groups: ['deltoide lateral'], equipment: ['halteres'], instructions: null },
  // Bíceps / Tríceps
  { id: 'ex-13', workout_type_id: 'wt-1', name: 'Rosca Direta', muscle_groups: ['bíceps'], equipment: ['barra'], instructions: null },
  { id: 'ex-14', workout_type_id: 'wt-1', name: 'Rosca Martelo', muscle_groups: ['bíceps', 'braquial'], equipment: ['halteres'], instructions: null },
  { id: 'ex-15', workout_type_id: 'wt-1', name: 'Tríceps Corda', muscle_groups: ['tríceps'], equipment: ['polia'], instructions: null },
  // Core / Agilidade
  { id: 'ex-16', workout_type_id: 'wt-3', name: 'Prancha', muscle_groups: ['core', 'abdômen'], equipment: [], instructions: null },
  { id: 'ex-17', workout_type_id: 'wt-3', name: 'Abdominal', muscle_groups: ['abdômen'], equipment: [], instructions: null },
  { id: 'ex-21', workout_type_id: 'wt-3', name: 'Mountain Climber', muscle_groups: ['core', 'ombros', 'cardio'], equipment: [], instructions: null },
  { id: 'ex-22', workout_type_id: 'wt-3', name: 'Burpee', muscle_groups: ['corpo todo'], equipment: [], instructions: null },
  { id: 'ex-23', workout_type_id: 'wt-3', name: 'Jump Squat', muscle_groups: ['quadríceps', 'glúteos'], equipment: [], instructions: null },
  // Cardio
  { id: 'ex-18', workout_type_id: 'wt-2', name: 'Caminhada', muscle_groups: ['pernas', 'cardiovascular'], equipment: ['esteira'], instructions: null },
  { id: 'ex-24', workout_type_id: 'wt-2', name: 'Corrida Leve', muscle_groups: ['pernas', 'cardiovascular'], equipment: ['esteira'], instructions: null },
  { id: 'ex-25', workout_type_id: 'wt-2', name: 'Ciclismo Indoor', muscle_groups: ['pernas', 'cardiovascular'], equipment: ['bicicleta ergométrica'], instructions: null },
  { id: 'ex-26', workout_type_id: 'wt-2', name: 'Pular Corda', muscle_groups: ['panturrilhas', 'cardiovascular'], equipment: ['corda'], instructions: null },
  { id: 'ex-27', workout_type_id: 'wt-2', name: 'Elíptico', muscle_groups: ['pernas', 'braços', 'cardiovascular'], equipment: ['elíptico'], instructions: null },
  // Flexibilidade / Mobilidade
  { id: 'ex-19', workout_type_id: 'wt-4', name: 'Mobilidade de Quadril', muscle_groups: ['quadril', 'glúteos'], equipment: [], instructions: null },
  { id: 'ex-20', workout_type_id: 'wt-4', name: 'Alongamento Geral', muscle_groups: ['corpo todo'], equipment: [], instructions: null },
  { id: 'ex-28', workout_type_id: 'wt-4', name: 'Flexão de Coluna', muscle_groups: ['coluna', 'lombar'], equipment: [], instructions: null },
  { id: 'ex-29', workout_type_id: 'wt-4', name: 'Rotação de Ombros', muscle_groups: ['ombros', 'pescoço'], equipment: [], instructions: null },
  { id: 'ex-30', workout_type_id: 'wt-4', name: 'Yoga Flow', muscle_groups: ['corpo todo'], equipment: ['tapete'], instructions: null },
  // Bodyweight / Sem equipamento
  { id: 'ex-31', workout_type_id: 'wt-1', name: 'Flexão de Braço', muscle_groups: ['peitoral', 'tríceps', 'ombros'], equipment: [], instructions: null },
  { id: 'ex-32', workout_type_id: 'wt-1', name: 'Agachamento Livre', muscle_groups: ['quadríceps', 'glúteos'], equipment: [], instructions: null },
  { id: 'ex-33', workout_type_id: 'wt-1', name: 'Afundo', muscle_groups: ['quadríceps', 'glúteos'], equipment: [], instructions: null },
  { id: 'ex-34', workout_type_id: 'wt-1', name: 'Barra Fixa', muscle_groups: ['latíssimo', 'bíceps'], equipment: ['barra fixa'], instructions: null },
  { id: 'ex-35', workout_type_id: 'wt-1', name: 'Mergulho (Dips)', muscle_groups: ['tríceps', 'peitoral'], equipment: ['paralelas'], instructions: null },
]

export type MockWorkout = Workout & {
  workout_type: WorkoutType
  exercises: Exercise[]
  color: string
  estimated_minutes: number
}

export const MOCK_WORKOUTS: MockWorkout[] = [
  {
    id: 'w-1',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Peito & Tríceps',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[0], MOCK_EXERCISES[1], MOCK_EXERCISES[2], MOCK_EXERCISES[14]],
    color: '#C0392B',
    estimated_minutes: 50,
  },
  {
    id: 'w-2',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Costas & Bíceps',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[3], MOCK_EXERCISES[4], MOCK_EXERCISES[5], MOCK_EXERCISES[12], MOCK_EXERCISES[13]],
    color: '#C0392B',
    estimated_minutes: 55,
  },
  {
    id: 'w-3',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Pernas',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[6], MOCK_EXERCISES[7], MOCK_EXERCISES[8], MOCK_EXERCISES[9]],
    color: '#C0392B',
    estimated_minutes: 60,
  },
  {
    id: 'w-4',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Ombros & Core',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[10], MOCK_EXERCISES[11], MOCK_EXERCISES[15], MOCK_EXERCISES[16]],
    color: '#8E44AD',
    estimated_minutes: 45,
  },
  {
    id: 'w-5',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-4',
    name: 'Mobilidade 20min',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[3],
    exercises: [MOCK_EXERCISES[25], MOCK_EXERCISES[26], MOCK_EXERCISES[27], MOCK_EXERCISES[28]],
    color: '#16A085',
    estimated_minutes: 20,
  },
  {
    id: 'w-6',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-2',
    name: 'Cardio Leve',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[1],
    exercises: [MOCK_EXERCISES[20], MOCK_EXERCISES[21]],
    color: '#2980B9',
    estimated_minutes: 30,
  },
  {
    id: 'w-7',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-1',
    name: 'Treino Sem Academia',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[0],
    exercises: [MOCK_EXERCISES[30], MOCK_EXERCISES[31], MOCK_EXERCISES[32], MOCK_EXERCISES[15], MOCK_EXERCISES[16]],
    color: '#27AE60',
    estimated_minutes: 35,
  },
  {
    id: 'w-8',
    user_id: 'mock-user-id',
    workout_type_id: 'wt-3',
    name: 'HIIT 20min',
    notes: null,
    created_at: new Date().toISOString(),
    workout_type: MOCK_WORKOUT_TYPES[2],
    exercises: [MOCK_EXERCISES[17], MOCK_EXERCISES[18], MOCK_EXERCISES[19], MOCK_EXERCISES[21]],
    color: '#E67E22',
    estimated_minutes: 20,
  },
]

export const MOCK_CHARACTER: Character = {
  id: 'mock-char-id',
  user_id: 'mock-user-id',
  name: 'Herói Iniciante',
  level: 1,
  current_xp: 0,
  total_xp: 0,
  strength: 5,
  agility: 5,
  dexterity: 5,
  constitution: 5,
  vitality: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
