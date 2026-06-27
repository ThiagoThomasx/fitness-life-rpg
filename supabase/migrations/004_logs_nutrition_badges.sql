-- Migration 004: Diário, Nutrição e Sistema de Badges
-- Módulo Fit — Life RPG

-- LOGS DIÁRIOS (journaling / retrospectiva)
CREATE TABLE IF NOT EXISTS daily_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  what_went_well   TEXT,
  what_to_improve  TEXT,
  root_cause       TEXT,
  tags             TEXT[],        -- ['#foco-alto', '#sono-ruim']
  mood_score       SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
  energy_score     SMALLINT CHECK (energy_score BETWEEN 1 AND 5),
  xp_earned        INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
  ON daily_logs(user_id, log_date);

-- MACROS DIÁRIAS
CREATE TABLE IF NOT EXISTS daily_nutrition (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  calories_target  INTEGER,
  calories_actual  INTEGER,
  protein_g        DECIMAL(6,1),
  carbs_g          DECIMAL(6,1),
  fat_g            DECIMAL(6,1),
  protein_target_g DECIMAL(6,1),
  carbs_target_g   DECIMAL(6,1),
  fat_target_g     DECIMAL(6,1),
  UNIQUE(user_id, log_date)
);

-- DEFINIÇÕES DE BADGES (seed gerenciado separadamente)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon          TEXT NOT NULL,
  theme_color   TEXT NOT NULL,
  gradient_end  TEXT NOT NULL,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('streak', 'pr', 'volume', 'level', 'diary', 'time', 'variety')),
  trigger_value INTEGER
);

-- BADGES DO USUÁRIO
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
