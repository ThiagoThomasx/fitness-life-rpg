-- Função: award_xp(p_session_id UUID)
-- Calcula e credita XP ao personagem de forma atômica.
-- Retorna JSON com { xp_earned, level_up, new_level }
--
-- Fórmula:
--   XP = (base_xp × intensity_mult × consistency_mult) + bonuses
--
-- Multiplicador de intensidade:
--   1.0 + (volume_atual / baseline_4_sessoes × 0.3), teto 1.5
--
-- Multiplicador de consistência (treinos ativos na semana corrente):
--   1-2 dias → 1.0x | 3-4 → 1.15x | 5-6 → 1.30x | 7 → 1.50x
--
-- Bônus:
--   +15 XP  treino completo (todos os exercícios executados)
--   +10 XP  diário do dia preenchido
--   +25 XP  primeiro exercício novo executado pelo usuário
--   +50 XP  novo PR em qualquer exercício (via trigger — já inserido antes desta função)
--
-- Curva de level up: XP_necessário(N) = 100 × N²

CREATE OR REPLACE FUNCTION award_xp(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        UUID;
  v_character_id   UUID;
  v_workout_type   workout_types%ROWTYPE;
  v_session        workout_sessions%ROWTYPE;

  v_base_xp        INTEGER;
  v_intensity_mult DECIMAL;
  v_consistency_mult DECIMAL;
  v_bonus          INTEGER := 0;

  -- Volume da sessão atual
  v_current_volume DECIMAL;
  -- Baseline = média de volume das últimas 4 sessões do mesmo tipo
  v_baseline_volume DECIMAL;

  -- Dias ativos na semana atual
  v_active_days    INTEGER;

  -- Contagem de exercícios planejados vs executados
  v_planned_exercises INTEGER;
  v_completed_exercises INTEGER;

  -- Flags de bônus
  v_diary_today    BOOLEAN;
  v_has_new_exercise BOOLEAN;

  v_xp_earned      INTEGER;
  v_xp_already_from_pr INTEGER;
  v_total_xp_to_add INTEGER;

  v_new_current_xp INTEGER;
  v_new_total_xp   INTEGER;
  v_new_level      INTEGER;
  v_old_level      INTEGER;
  v_level_up       BOOLEAN := FALSE;
  v_xp_for_next_level INTEGER;
BEGIN
  -- 1. Buscar dados da sessão
  SELECT * INTO v_session FROM workout_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada: %', p_session_id;
  END IF;

  v_user_id := v_session.user_id;

  -- 2. Buscar personagem
  SELECT * INTO v_character_id FROM characters WHERE user_id = v_user_id;
  SELECT id INTO v_character_id FROM characters WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Personagem não encontrado para user_id: %', v_user_id;
  END IF;

  -- 3. Buscar tipo de treino
  SELECT wt.* INTO v_workout_type
  FROM workouts w
  JOIN workout_types wt ON w.workout_type_id = wt.id
  WHERE w.id = v_session.workout_id;

  v_base_xp := COALESCE(v_workout_type.base_xp, 80);

  -- 4. Calcular volume da sessão atual (soma de weight_kg × reps)
  SELECT COALESCE(SUM(weight_kg * reps), 0)
  INTO v_current_volume
  FROM exercise_sets
  WHERE session_id = p_session_id;

  -- 5. Calcular baseline: média de volume das últimas 4 sessões do mesmo tipo
  SELECT COALESCE(AVG(session_volume), 0)
  INTO v_baseline_volume
  FROM (
    SELECT SUM(es.weight_kg * es.reps) AS session_volume
    FROM workout_sessions ws
    JOIN workouts w ON ws.workout_id = w.id
    JOIN exercise_sets es ON es.session_id = ws.id
    WHERE ws.user_id = v_user_id
      AND w.workout_type_id = v_workout_type.id
      AND ws.id <> p_session_id
      AND ws.completed_at IS NOT NULL
    GROUP BY ws.id
    ORDER BY ws.completed_at DESC
    LIMIT 4
  ) sub;

  -- 6. Calcular multiplicador de intensidade (teto 1.5)
  IF v_baseline_volume > 0 THEN
    v_intensity_mult := LEAST(1.0 + (v_current_volume / v_baseline_volume * 0.3), 1.5);
  ELSE
    v_intensity_mult := 1.0;
  END IF;

  -- 7. Calcular multiplicador de consistência (dias ativos na semana ISO corrente)
  SELECT COUNT(DISTINCT DATE(started_at))
  INTO v_active_days
  FROM workout_sessions
  WHERE user_id = v_user_id
    AND completed_at IS NOT NULL
    AND DATE_PART('week', started_at) = DATE_PART('week', NOW())
    AND DATE_PART('year', started_at) = DATE_PART('year', NOW());

  v_consistency_mult := CASE
    WHEN v_active_days >= 7 THEN 1.50
    WHEN v_active_days >= 5 THEN 1.30
    WHEN v_active_days >= 3 THEN 1.15
    ELSE 1.0
  END;

  -- 8. Bônus: treino completo (todos os exercícios planejados executados)
  IF v_session.workout_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_planned_exercises
    FROM workout_exercises WHERE workout_id = v_session.workout_id;

    SELECT COUNT(DISTINCT exercise_id) INTO v_completed_exercises
    FROM exercise_sets WHERE session_id = p_session_id;

    IF v_planned_exercises > 0 AND v_completed_exercises >= v_planned_exercises THEN
      v_bonus := v_bonus + 15;
    END IF;
  END IF;

  -- 9. Bônus: diário do dia preenchido
  SELECT EXISTS (
    SELECT 1 FROM daily_logs
    WHERE user_id = v_user_id
      AND log_date = DATE(v_session.started_at)
      AND what_went_well IS NOT NULL
      AND what_to_improve IS NOT NULL
      AND root_cause IS NOT NULL
  ) INTO v_diary_today;

  IF v_diary_today THEN
    v_bonus := v_bonus + 10;
  END IF;

  -- 10. Bônus: primeiro exercício novo (+25 XP por exercício nunca executado antes)
  SELECT EXISTS (
    SELECT 1
    FROM exercise_sets es
    WHERE es.session_id = p_session_id
      AND NOT EXISTS (
        SELECT 1
        FROM exercise_sets es2
        JOIN workout_sessions ws2 ON es2.session_id = ws2.id
        WHERE ws2.user_id = v_user_id
          AND es2.exercise_id = es.exercise_id
          AND ws2.id <> p_session_id
          AND ws2.completed_at IS NOT NULL
      )
    LIMIT 1
  ) INTO v_has_new_exercise;

  IF v_has_new_exercise THEN
    v_bonus := v_bonus + 25;
  END IF;

  -- 11. XP de PRs já foi inserido pelo trigger check_personal_record.
  -- Buscamos o total já creditado para não duplicar.
  SELECT COALESCE(SUM(amount), 0)
  INTO v_xp_already_from_pr
  FROM xp_transactions
  WHERE source_id = p_session_id AND source_type = 'pr';

  -- 12. Calcular XP total da sessão (excluindo PRs já creditados)
  v_xp_earned := ROUND(v_base_xp * v_intensity_mult * v_consistency_mult) + v_bonus;
  v_total_xp_to_add := v_xp_earned;

  -- 13. Transação atômica: creditar XP + possível level up
  BEGIN
    -- Buscar nível e XP atuais
    SELECT level, current_xp, total_xp
    INTO v_old_level, v_new_current_xp, v_new_total_xp
    FROM characters WHERE user_id = v_user_id;

    v_new_current_xp := v_new_current_xp + v_total_xp_to_add;
    v_new_total_xp := v_new_total_xp + v_total_xp_to_add;
    v_new_level := v_old_level;

    -- Verificar level up (curva quadrática: 100 × N²)
    LOOP
      v_xp_for_next_level := 100 * POWER(v_new_level, 2);
      EXIT WHEN v_new_current_xp < v_xp_for_next_level;
      v_new_current_xp := v_new_current_xp - v_xp_for_next_level;
      v_new_level := v_new_level + 1;
      v_level_up := TRUE;
    END LOOP;

    -- Atualizar personagem
    UPDATE characters
    SET current_xp = v_new_current_xp,
        total_xp = v_new_total_xp,
        level = v_new_level,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Atualizar XP ganho na sessão
    UPDATE workout_sessions
    SET xp_earned = v_xp_earned,
        intensity_multiplier = v_intensity_mult,
        completed_at = COALESCE(completed_at, NOW())
    WHERE id = p_session_id;

    -- Inserir no audit trail
    INSERT INTO xp_transactions (character_id, amount, source_type, source_id, description)
    SELECT id, v_xp_earned, 'workout', p_session_id,
           FORMAT('Treino: %s XP base × %.2f intensidade × %.2f consistência + %s bônus',
                  v_base_xp, v_intensity_mult, v_consistency_mult, v_bonus)
    FROM characters WHERE user_id = v_user_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;

  -- 14. Atualizar view materializada de PRs de forma concorrente
  REFRESH MATERIALIZED VIEW CONCURRENTLY personal_records;

  RETURN jsonb_build_object(
    'xp_earned', v_xp_earned,
    'base_xp', v_base_xp,
    'intensity_multiplier', v_intensity_mult,
    'consistency_multiplier', v_consistency_mult,
    'bonus', v_bonus,
    'level_up', v_level_up,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'new_current_xp', v_new_current_xp,
    'new_total_xp', v_new_total_xp
  );
END;
$$;
