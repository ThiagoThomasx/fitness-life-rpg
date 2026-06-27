-- Seed: Tipos de Treino (5 categorias base)
-- Módulo Fit — Life RPG

INSERT INTO workout_types (id, name, category, theme_color, base_xp, attr_target) VALUES
  (gen_random_uuid(), 'Musculação - Pesado (>45min)', 'strength',     '#C0392B', 120, 'strength'),
  (gen_random_uuid(), 'Musculação - Moderado (30-45min)', 'strength', '#C0392B',  80, 'strength'),
  (gen_random_uuid(), 'HIIT / Cardio Intenso',           'hiit',      '#E67E22', 100, 'agility'),
  (gen_random_uuid(), 'Cardio Leve / Caminhada',         'cardio',    '#E67E22',  30, 'agility'),
  (gen_random_uuid(), 'Mobilidade / Yoga',               'mobility',  '#16A085',  50, 'dexterity'),
  (gen_random_uuid(), 'Calistenia',                      'calisthenics', '#8E44AD', 80, 'dexterity'),
  (gen_random_uuid(), 'Descanso Ativo',                  'active_rest', '#2980B9', 20, 'constitution')
ON CONFLICT DO NOTHING;
