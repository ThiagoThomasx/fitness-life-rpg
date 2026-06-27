-- Testes de Validação — Sprint 1
-- Módulo Fit — Life RPG
--
-- Execute este script como superuser/service role no Supabase SQL Editor.
-- Cada bloco imprime PASSED ou FAILED com contexto.
-- Ao final, todos os dados de teste são removidos (ROLLBACK via DO block).

DO $$
DECLARE
  -- IDs de teste
  v_user_a_id   UUID := gen_random_uuid();
  v_user_b_id   UUID := gen_random_uuid();
  v_char_a_id   UUID;
  v_char_b_id   UUID;
  v_workout_type_id UUID;
  v_exercise_id UUID;
  v_workout_id  UUID;
  v_session_id  UUID;
  v_session2_id UUID;

  -- Resultados
  v_result      JSONB;
  v_xp_earned   INTEGER;
  v_level       INTEGER;
  v_is_pr       BOOLEAN;
  v_pr_count    INTEGER;
  v_char_b_xp   INTEGER;
  v_current_xp  INTEGER;

  v_passed      INTEGER := 0;
  v_failed      INTEGER := 0;

  PROCEDURE pass(label TEXT) AS $p$
  BEGIN
    RAISE NOTICE '[PASSED] %', label;
    v_passed := v_passed + 1;
  END; $p$ LANGUAGE plpgsql;

  PROCEDURE fail(label TEXT, detail TEXT DEFAULT '') AS $p$
  BEGIN
    RAISE WARNING '[FAILED] % — %', label, detail;
    v_failed := v_failed + 1;
  END; $p$ LANGUAGE plpgsql;

BEGIN
  -- ============================================================
  -- SETUP: Criar usuários, personagens, dados de treino
  -- ============================================================

  -- Usuário A
  INSERT INTO users (id, email, display_name)
  VALUES (v_user_a_id, 'test_a@fit.dev', 'Test User A');

  INSERT INTO characters (user_id) VALUES (v_user_a_id)
  RETURNING id INTO v_char_a_id;

  -- Usuário B (para teste de isolamento RLS)
  INSERT INTO users (id, email, display_name)
  VALUES (v_user_b_id, 'test_b@fit.dev', 'Test User B');

  INSERT INTO characters (user_id) VALUES (v_user_b_id)
  RETURNING id INTO v_char_b_id;

  -- Tipo de treino
  SELECT id INTO v_workout_type_id FROM workout_types LIMIT 1;
  IF v_workout_type_id IS NULL THEN
    RAISE EXCEPTION 'Seed de workout_types não encontrado. Execute seeds antes dos testes.';
  END IF;

  -- Exercício
  SELECT id INTO v_exercise_id FROM exercises WHERE muscle_group = 'chest' LIMIT 1;

  -- Treino planejado
  INSERT INTO workouts (user_id, workout_type_id, name)
  VALUES (v_user_a_id, v_workout_type_id, 'Treino Teste Sprint 1')
  RETURNING id INTO v_workout_id;

  INSERT INTO workout_exercises (workout_id, exercise_id, sets_target, reps_target, order_index)
  VALUES (v_workout_id, v_exercise_id, 3, 10, 1);

  -- ============================================================
  -- TESTE 1: Fluxo completo de sessão → XP → level up check
  -- ============================================================

  -- Criar sessão
  INSERT INTO workout_sessions (user_id, workout_id, started_at)
  VALUES (v_user_a_id, v_workout_id, NOW())
  RETURNING id INTO v_session_id;

  -- Registrar 3 séries (sem peso suficiente para PR inicialmente)
  INSERT INTO exercise_sets (session_id, exercise_id, set_number, weight_kg, reps)
  VALUES
    (v_session_id, v_exercise_id, 1, 80.0, 10),
    (v_session_id, v_exercise_id, 2, 82.0, 10),
    (v_session_id, v_exercise_id, 3, 85.0,  8);

  -- Chamar award_xp
  v_result := award_xp(v_session_id);

  -- Verificar XP ganho
  v_xp_earned := (v_result->>'xp_earned')::INTEGER;
  IF v_xp_earned > 0 THEN
    CALL pass('TESTE 1a: award_xp retornou XP > 0 (' || v_xp_earned || ' XP)');
  ELSE
    CALL fail('TESTE 1a: award_xp retornou XP = 0', v_result::TEXT);
  END IF;

  -- Verificar characters.current_xp atualizado
  SELECT current_xp INTO v_current_xp FROM characters WHERE user_id = v_user_a_id;
  IF v_current_xp > 0 THEN
    CALL pass('TESTE 1b: characters.current_xp atualizado (' || v_current_xp || ')');
  ELSE
    CALL fail('TESTE 1b: characters.current_xp não foi atualizado');
  END IF;

  -- Verificar xp_transactions inserido
  IF EXISTS (
    SELECT 1 FROM xp_transactions
    WHERE character_id = v_char_a_id AND source_id = v_session_id AND source_type = 'workout'
  ) THEN
    CALL pass('TESTE 1c: xp_transactions registrado para a sessão');
  ELSE
    CALL fail('TESTE 1c: xp_transactions não encontrado');
  END IF;

  -- ============================================================
  -- TESTE 2: Trigger de PR
  -- ============================================================

  -- Segunda sessão com recorde pessoal (peso maior que nas séries anteriores)
  INSERT INTO workout_sessions (user_id, workout_id, started_at)
  VALUES (v_user_a_id, v_workout_id, NOW())
  RETURNING id INTO v_session2_id;

  -- Série com 1RM estimado maior que as anteriores (100kg × 8 reps = 1RM ~126.7)
  INSERT INTO exercise_sets (session_id, exercise_id, set_number, weight_kg, reps)
  VALUES (v_session2_id, v_exercise_id, 1, 100.0, 8);

  -- Verificar is_pr marcado pelo trigger
  SELECT is_pr INTO v_is_pr
  FROM exercise_sets
  WHERE session_id = v_session2_id AND exercise_id = v_exercise_id AND set_number = 1;

  IF v_is_pr = TRUE THEN
    CALL pass('TESTE 2a: Trigger marcou is_pr = TRUE para novo PR');
  ELSE
    CALL fail('TESTE 2a: Trigger não marcou is_pr = TRUE');
  END IF;

  -- Verificar xp_transaction de PR inserida
  SELECT COUNT(*) INTO v_pr_count
  FROM xp_transactions
  WHERE character_id = v_char_a_id AND source_type = 'pr' AND amount = 50;

  IF v_pr_count >= 1 THEN
    CALL pass('TESTE 2b: xp_transaction de PR (+50 XP) inserida pelo trigger');
  ELSE
    CALL fail('TESTE 2b: xp_transaction de PR não encontrada');
  END IF;

  -- ============================================================
  -- TESTE 3: Level up com XP suficiente
  -- ============================================================
  -- Para garantir level up, inserimos XP diretamente e chamamos award_xp em uma sessão adicional
  UPDATE characters
  SET current_xp = 90  -- falta 10 para level 2 (100 XP)
  WHERE user_id = v_user_a_id;

  -- Completar sessão2 com award_xp (vai somar pelo menos 20+ XP e causar level up)
  v_result := award_xp(v_session2_id);

  SELECT level INTO v_level FROM characters WHERE user_id = v_user_a_id;
  IF v_level >= 2 THEN
    CALL pass('TESTE 3: Level up funcionou. Nível atual: ' || v_level);
  ELSE
    CALL fail('TESTE 3: Level up não ocorreu. Nível atual: ' || v_level || ', XP result: ' || v_result::TEXT);
  END IF;

  -- ============================================================
  -- TESTE 4: Transação atômica (rollback em erro mid-transaction)
  -- ============================================================
  -- Simulamos erro tentando inserir session_id inválido
  DECLARE
    v_before_xp INTEGER;
    v_after_xp  INTEGER;
    v_error_caught BOOLEAN := FALSE;
  BEGIN
    SELECT total_xp INTO v_before_xp FROM characters WHERE user_id = v_user_a_id;

    BEGIN
      PERFORM award_xp('00000000-0000-0000-0000-000000000000'::UUID);
    EXCEPTION WHEN OTHERS THEN
      v_error_caught := TRUE;
    END;

    SELECT total_xp INTO v_after_xp FROM characters WHERE user_id = v_user_a_id;

    IF v_error_caught AND v_before_xp = v_after_xp THEN
      CALL pass('TESTE 4: Rollback correto — XP não foi creditado parcialmente');
    ELSIF NOT v_error_caught THEN
      CALL fail('TESTE 4: award_xp com session_id inválido não lançou exceção');
    ELSE
      CALL fail('TESTE 4: XP foi alterado mesmo com erro (' || v_before_xp || ' → ' || v_after_xp || ')');
    END IF;
  END;

  -- ============================================================
  -- TESTE 5: Isolamento entre usuários (user_b não acessa dados de user_a)
  -- ============================================================
  -- Como teste de isolamento lógico (RLS é testado via roles autenticadas),
  -- verificamos que dados de user_b estão separados dos de user_a
  SELECT current_xp INTO v_char_b_xp FROM characters WHERE user_id = v_user_b_id;

  IF v_char_b_xp = 0 THEN
    CALL pass('TESTE 5: Personagem de user_b não foi afetado pelas operações de user_a (XP = 0)');
  ELSE
    CALL fail('TESTE 5: Personagem de user_b tem XP inesperado: ' || v_char_b_xp);
  END IF;

  -- ============================================================
  -- RELATÓRIO FINAL
  -- ============================================================
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'RESULTADO SPRINT 1: % PASSED / % FAILED', v_passed, v_failed;
  RAISE NOTICE '==========================================';

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'Sprint 1 validation FAILED: % test(s) failed', v_failed;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro durante validação: %', SQLERRM;
  RAISE;

END $$;

-- Limpar dados de teste
DO $$
BEGIN
  DELETE FROM users WHERE email IN ('test_a@fit.dev', 'test_b@fit.dev');
  RAISE NOTICE 'Dados de teste removidos.';
END $$;
