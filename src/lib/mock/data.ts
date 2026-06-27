import type { Character } from '@/types/database'

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
