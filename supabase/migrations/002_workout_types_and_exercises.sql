-- Migration 002: Tipos de Treino e Exercícios
-- Módulo Fit — Life RPG

-- TIPOS DE TREINO (seed gerenciado separadamente)
CREATE TABLE IF NOT EXISTS workout_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'mobility', 'hiit', 'calisthenics', 'active_rest')),
  theme_color TEXT NOT NULL,            -- ex: '#C0392B'
  base_xp     INTEGER NOT NULL,
  attr_target TEXT NOT NULL CHECK (attr_target IN ('strength', 'agility', 'dexterity', 'constitution', 'vitality'))
);

-- EXERCÍCIOS
CREATE TABLE IF NOT EXISTS exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL CHECK (muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body')),
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('compound', 'isolation', 'bodyweight', 'cardio', 'mobility')),
  is_custom     BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL
);
