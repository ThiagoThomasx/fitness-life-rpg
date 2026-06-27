-- Migration 001: Usuário, Personagem e Audit Trail de XP
-- Módulo Fit — Life RPG

-- USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- PERSONAGEM (1:1 com user)
CREATE TABLE IF NOT EXISTS characters (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level              INTEGER DEFAULT 1,
  current_xp         INTEGER DEFAULT 0,
  total_xp           INTEGER DEFAULT 0,
  -- Atributos
  attr_strength      INTEGER DEFAULT 1,   -- Força
  attr_constitution  INTEGER DEFAULT 1,   -- Constituição
  attr_agility       INTEGER DEFAULT 1,   -- Agilidade
  attr_dexterity     INTEGER DEFAULT 1,   -- Destreza
  attr_vitality      INTEGER DEFAULT 1,   -- Vitalidade
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- XP AUDIT TRAIL (imutável, append-only)
-- INSERT apenas via service role — usuário não escreve diretamente
CREATE TABLE IF NOT EXISTS xp_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,
  source_type  TEXT NOT NULL CHECK (source_type IN ('workout', 'diary', 'badge', 'pr', 'streak')),
  source_id    UUID,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índice crítico para queries de audit trail
CREATE INDEX IF NOT EXISTS idx_xp_transactions_character
  ON xp_transactions(character_id, created_at);
