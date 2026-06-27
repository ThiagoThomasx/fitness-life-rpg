-- Migration 003: Treinos Planejados e Sessões de Execução
-- Módulo Fit — Life RPG

-- TREINOS (planos, podem ser templates)
CREATE TABLE IF NOT EXISTS workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_type_id UUID REFERENCES workout_types(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  scheduled_at    DATE,
  is_template     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- EXERCÍCIOS DO PLANO DE TREINO
CREATE TABLE IF NOT EXISTS workout_exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT,
  sets_target INTEGER DEFAULT 3,
  reps_target INTEGER DEFAULT 10,
  order_index INTEGER NOT NULL,
  notes       TEXT
);

-- SESSÕES DE TREINO (execuções reais)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_id            UUID REFERENCES workouts(id) ON DELETE SET NULL,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_minutes      INTEGER,
  xp_earned             INTEGER DEFAULT 0,
  intensity_multiplier  DECIMAL(3,2) DEFAULT 1.0,
  notes                 TEXT
);

-- HISTÓRICO DE CARGAS (cada série executada)
CREATE TABLE IF NOT EXISTS exercise_sets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id  UUID REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number   INTEGER NOT NULL,
  weight_kg    DECIMAL(6,2),
  reps         INTEGER,
  is_pr        BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES CRÍTICOS
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session
  ON exercise_sets(session_id);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_user
  ON exercise_sets(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON workout_sessions(user_id, started_at);

-- RECORDES PESSOAIS (view materializada para performance)
-- Fórmula Epley para 1RM estimado: weight × (1 + reps/30)
CREATE MATERIALIZED VIEW IF NOT EXISTS personal_records AS
SELECT DISTINCT ON (ws.user_id, es.exercise_id)
  es.id,
  ws.user_id,
  es.exercise_id,
  es.weight_kg,
  es.reps,
  ROUND((es.weight_kg * (1 + es.reps / 30.0))::NUMERIC, 2) AS estimated_1rm,
  es.completed_at
FROM exercise_sets es
JOIN workout_sessions ws ON es.session_id = ws.id
WHERE es.weight_kg IS NOT NULL
ORDER BY ws.user_id, es.exercise_id, es.weight_kg DESC, es.reps DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_records_user_exercise
  ON personal_records(user_id, exercise_id);
