-- Função: update_character_attributes(p_session_id UUID)
-- Atualiza os atributos do personagem com base no tipo de treino da sessão.
-- Deve ser chamada após award_xp() para garantir que total_xp já foi atualizado.
--
-- Thresholds (XP acumulado em cada categoria):
--   Força (attr_strength)     → +1 a cada 300 XP de treinos strength
--   Constituição (constitution) → +1 a cada 7 dias consecutivos ativos
--   Agilidade (attr_agility)  → +1 a cada 200 XP de treinos cardio/hiit
--   Destreza (attr_dexterity) → +1 a cada 150 XP de treinos mobility/calisthenics
--   Vitalidade (attr_vitality) → +1 a cada 5 dias com macros registrados na meta

CREATE OR REPLACE FUNCTION update_character_attributes(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        UUID;
  v_attr_target    TEXT;

  -- XP acumulados por categoria
  v_strength_xp    INTEGER;
  v_agility_xp     INTEGER;
  v_dexterity_xp   INTEGER;

  -- Valores calculados de atributos
  v_new_strength   INTEGER;
  v_new_agility    INTEGER;
  v_new_dexterity  INTEGER;
  v_new_constitution INTEGER;
  v_new_vitality   INTEGER;

  -- Consistência
  v_streak_days    INTEGER;
  v_vitality_days  INTEGER;
BEGIN
  -- Buscar user_id e attr_target do tipo de treino
  SELECT ws.user_id, wt.attr_target
  INTO v_user_id, v_attr_target
  FROM workout_sessions ws
  JOIN workouts w ON ws.workout_id = w.id
  JOIN workout_types wt ON w.workout_type_id = wt.id
  WHERE ws.id = p_session_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular Força: XP acumulado em treinos strength ÷ 300
  SELECT COALESCE(SUM(ws.xp_earned), 0)
  INTO v_strength_xp
  FROM workout_sessions ws
  JOIN workouts w ON ws.workout_id = w.id
  JOIN workout_types wt ON w.workout_type_id = wt.id
  WHERE ws.user_id = v_user_id
    AND wt.attr_target = 'strength'
    AND ws.completed_at IS NOT NULL;

  v_new_strength := GREATEST(1, v_strength_xp / 300);

  -- Calcular Agilidade: XP acumulado em treinos cardio/hiit ÷ 200
  SELECT COALESCE(SUM(ws.xp_earned), 0)
  INTO v_agility_xp
  FROM workout_sessions ws
  JOIN workouts w ON ws.workout_id = w.id
  JOIN workout_types wt ON w.workout_type_id = wt.id
  WHERE ws.user_id = v_user_id
    AND wt.attr_target = 'agility'
    AND ws.completed_at IS NOT NULL;

  v_new_agility := GREATEST(1, v_agility_xp / 200);

  -- Calcular Destreza: XP acumulado em treinos mobility/calisthenics ÷ 150
  SELECT COALESCE(SUM(ws.xp_earned), 0)
  INTO v_dexterity_xp
  FROM workout_sessions ws
  JOIN workouts w ON ws.workout_id = w.id
  JOIN workout_types wt ON w.workout_type_id = wt.id
  WHERE ws.user_id = v_user_id
    AND wt.attr_target = 'dexterity'
    AND ws.completed_at IS NOT NULL;

  v_new_dexterity := GREATEST(1, v_dexterity_xp / 150);

  -- Calcular Constituição: streak atual de dias ativos (sem falhar meta)
  -- Conta dias consecutivos retroativamente a partir de hoje
  WITH ranked AS (
    SELECT
      DATE(started_at) AS active_date,
      ROW_NUMBER() OVER (ORDER BY DATE(started_at) DESC) AS rn
    FROM workout_sessions
    WHERE user_id = v_user_id AND completed_at IS NOT NULL
    GROUP BY DATE(started_at)
  )
  SELECT COUNT(*)
  INTO v_streak_days
  FROM ranked
  WHERE active_date = CURRENT_DATE - INTERVAL '1 day' * (rn - 1);

  v_new_constitution := GREATEST(1, v_streak_days / 7);

  -- Calcular Vitalidade: dias com macros registrados e meta atingida (calorias ±10%)
  SELECT COUNT(*)
  INTO v_vitality_days
  FROM daily_nutrition
  WHERE user_id = v_user_id
    AND calories_actual IS NOT NULL
    AND calories_target IS NOT NULL
    AND ABS(calories_actual - calories_target) <= calories_target * 0.10;

  v_new_vitality := GREATEST(1, v_vitality_days / 5);

  -- Atualizar personagem com valores calculados (nunca decresce)
  UPDATE characters
  SET
    attr_strength     = GREATEST(attr_strength, v_new_strength),
    attr_agility      = GREATEST(attr_agility, v_new_agility),
    attr_dexterity    = GREATEST(attr_dexterity, v_new_dexterity),
    attr_constitution = GREATEST(attr_constitution, v_new_constitution),
    attr_vitality     = GREATEST(attr_vitality, v_new_vitality),
    updated_at        = NOW()
  WHERE user_id = v_user_id;
END;
$$;
