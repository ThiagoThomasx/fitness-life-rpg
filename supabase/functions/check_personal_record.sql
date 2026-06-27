-- Trigger: check_personal_record
-- Executado AFTER INSERT em exercise_sets.
-- Compara a nova série com o PR atual do usuário para aquele exercício.
-- Se for PR: marca is_pr = TRUE e insere xp_transactions de +50 XP.

CREATE OR REPLACE FUNCTION check_personal_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id       UUID;
  v_character_id  UUID;
  v_current_pr    DECIMAL;
  v_new_1rm       DECIMAL;
  v_current_1rm   DECIMAL;
BEGIN
  -- Só processa séries com peso registrado
  IF NEW.weight_kg IS NULL OR NEW.reps IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar user_id via sessão
  SELECT ws.user_id INTO v_user_id
  FROM workout_sessions ws
  WHERE ws.id = NEW.session_id;

  -- Buscar character_id
  SELECT id INTO v_character_id
  FROM characters WHERE user_id = v_user_id;

  -- 1RM estimado da nova série (fórmula Epley)
  v_new_1rm := NEW.weight_kg * (1 + NEW.reps / 30.0);

  -- PR atual (1RM estimado) via view materializada
  SELECT estimated_1rm INTO v_current_1rm
  FROM personal_records
  WHERE user_id = v_user_id AND exercise_id = NEW.exercise_id;

  -- Verificar se é novo PR (ou primeiro registro do exercício)
  IF v_current_1rm IS NULL OR v_new_1rm > v_current_1rm THEN
    -- Marcar a série como PR
    UPDATE exercise_sets SET is_pr = TRUE WHERE id = NEW.id;

    -- Creditar +50 XP no audit trail (a sessão principal recebe via award_xp)
    IF v_character_id IS NOT NULL THEN
      INSERT INTO xp_transactions (character_id, amount, source_type, source_id, description)
      VALUES (
        v_character_id,
        50,
        'pr',
        NEW.session_id,
        FORMAT('Novo PR: %.1fkg × %s reps (1RM estimado: %.1fkg)',
               NEW.weight_kg, NEW.reps, v_new_1rm)
      );

      -- Atualizar XP do personagem imediatamente (o award_xp não duplicará)
      UPDATE characters
      SET current_xp = current_xp + 50,
          total_xp = total_xp + 50,
          updated_at = NOW()
      WHERE id = v_character_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar o trigger na tabela exercise_sets
DROP TRIGGER IF EXISTS trg_check_personal_record ON exercise_sets;
CREATE TRIGGER trg_check_personal_record
  AFTER INSERT ON exercise_sets
  FOR EACH ROW
  EXECUTE FUNCTION check_personal_record();
