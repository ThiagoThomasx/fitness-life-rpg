-- Migration 005: Row Level Security (RLS)
-- Módulo Fit — Life RPG
--
-- Princípio: usuário lê e escreve apenas seus próprios dados.
-- xp_transactions: usuário pode ler, mas INSERT apenas via service role (SECURITY DEFINER functions).

-- Habilitar RLS em todas as tabelas de usuário
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_nutrition  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges      ENABLE ROW LEVEL SECURITY;

-- workout_types e exercises são dados públicos (sem RLS restritivo)
ALTER TABLE workout_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

-- ======================================================
-- USERS
-- ======================================================
CREATE POLICY "users: leitura própria"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: atualização própria"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ======================================================
-- CHARACTERS
-- ======================================================
CREATE POLICY "characters: leitura própria"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "characters: update próprio"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

-- ======================================================
-- XP TRANSACTIONS (read-only para o usuário)
-- ======================================================
CREATE POLICY "xp_transactions: leitura própria"
  ON xp_transactions FOR SELECT
  USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    )
  );

-- INSERT bloqueado para o usuário — somente via funções SECURITY DEFINER

-- ======================================================
-- WORKOUTS
-- ======================================================
CREATE POLICY "workouts: leitura própria"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workouts: insert próprio"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts: update próprio"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "workouts: delete próprio"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ======================================================
-- WORKOUT_EXERCISES (via workout do usuário)
-- ======================================================
CREATE POLICY "workout_exercises: acesso próprio"
  ON workout_exercises FOR ALL
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- ======================================================
-- WORKOUT_SESSIONS
-- ======================================================
CREATE POLICY "workout_sessions: acesso próprio"
  ON workout_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ======================================================
-- EXERCISE_SETS (via sessão do usuário)
-- ======================================================
CREATE POLICY "exercise_sets: acesso próprio"
  ON exercise_sets FOR ALL
  USING (
    session_id IN (
      SELECT id FROM workout_sessions WHERE user_id = auth.uid()
    )
  );

-- ======================================================
-- DAILY_LOGS
-- ======================================================
CREATE POLICY "daily_logs: acesso próprio"
  ON daily_logs FOR ALL
  USING (auth.uid() = user_id);

-- ======================================================
-- DAILY_NUTRITION
-- ======================================================
CREATE POLICY "daily_nutrition: acesso próprio"
  ON daily_nutrition FOR ALL
  USING (auth.uid() = user_id);

-- ======================================================
-- USER_BADGES
-- ======================================================
CREATE POLICY "user_badges: leitura própria"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- ======================================================
-- DADOS PÚBLICOS (leitura para autenticados)
-- ======================================================
CREATE POLICY "workout_types: leitura pública"
  ON workout_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "exercises: leitura pública"
  ON exercises FOR SELECT
  USING (auth.role() = 'authenticated');

-- Exercícios customizados: insert pelo próprio usuário
CREATE POLICY "exercises: insert customizado"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_custom = TRUE);

CREATE POLICY "badge_definitions: leitura pública"
  ON badge_definitions FOR SELECT
  USING (auth.role() = 'authenticated');
