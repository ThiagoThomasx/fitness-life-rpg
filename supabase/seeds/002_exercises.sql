-- Seed: 30 Exercícios Base (6 por grupo muscular)
-- Módulo Fit — Life RPG

INSERT INTO exercises (name, muscle_group, exercise_type, is_custom) VALUES
  -- PEITO (chest)
  ('Supino Reto com Barra',      'chest',     'compound',   FALSE),
  ('Supino Inclinado com Halteres', 'chest',  'compound',   FALSE),
  ('Crucifixo Inclinado',        'chest',     'isolation',  FALSE),
  ('Crossover no Cabo',          'chest',     'isolation',  FALSE),
  ('Flexão de Braço',            'chest',     'bodyweight', FALSE),
  ('Peck Deck (Voador)',         'chest',     'isolation',  FALSE),

  -- COSTAS (back)
  ('Remada Curvada com Barra',   'back',      'compound',   FALSE),
  ('Pull Down na Polia',         'back',      'compound',   FALSE),
  ('Barra Fixa (Pull-up)',       'back',      'bodyweight', FALSE),
  ('Remada Unilateral com Halter', 'back',    'compound',   FALSE),
  ('Serrote com Halter',         'back',      'isolation',  FALSE),
  ('Pullover com Halter',        'back',      'isolation',  FALSE),

  -- PERNAS (legs)
  ('Agachamento Livre',          'legs',      'compound',   FALSE),
  ('Leg Press 45°',              'legs',      'compound',   FALSE),
  ('Extensora',                  'legs',      'isolation',  FALSE),
  ('Flexora Deitada',            'legs',      'isolation',  FALSE),
  ('Agachamento Búlgaro',        'legs',      'compound',   FALSE),
  ('Panturrilha em Pé',          'legs',      'isolation',  FALSE),

  -- OMBROS (shoulders)
  ('Desenvolvimento com Barra',  'shoulders', 'compound',   FALSE),
  ('Elevação Lateral com Halteres', 'shoulders', 'isolation', FALSE),
  ('Desenvolvimento com Halteres', 'shoulders', 'compound', FALSE),
  ('Elevação Frontal',           'shoulders', 'isolation',  FALSE),
  ('Encolhimento de Ombros',     'shoulders', 'isolation',  FALSE),
  ('Face Pull',                  'shoulders', 'isolation',  FALSE),

  -- BRAÇOS (arms)
  ('Rosca Direta com Barra',     'arms',      'isolation',  FALSE),
  ('Rosca Alternada com Halter', 'arms',      'isolation',  FALSE),
  ('Tríceps Pulley',             'arms',      'isolation',  FALSE),
  ('Tríceps Testa com Barra',    'arms',      'isolation',  FALSE),
  ('Rosca Martelo',              'arms',      'isolation',  FALSE),
  ('Mergulho (Dip) no Banco',    'arms',      'bodyweight', FALSE),

  -- CORE
  ('Prancha Abdominal',          'core',      'bodyweight', FALSE),
  ('Abdominal Remador',          'core',      'bodyweight', FALSE),
  ('Elevação de Pernas',         'core',      'bodyweight', FALSE),
  ('Russian Twist',              'core',      'bodyweight', FALSE),
  ('Abdominal Infra',            'core',      'bodyweight', FALSE),
  ('Abdominal na Polia',         'core',      'isolation',  FALSE)
ON CONFLICT DO NOTHING;
