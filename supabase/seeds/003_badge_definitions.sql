-- Seed: 12 Badges com gatilhos automáticos
-- Módulo Fit — Life RPG

INSERT INTO badge_definitions (slug, name, description, icon, theme_color, gradient_end, trigger_type, trigger_value) VALUES
  (
    'forca-bruta',
    'Força Bruta',
    'Primeiro recorde pessoal (PR) registrado em qualquer exercício composto.',
    '🔱',
    '#8B0000',
    '#DC143C',
    'pr',
    1
  ),
  (
    'semana-inabalavel',
    'Semana Inabalável',
    'Completar 7 treinos em 7 dias corridos.',
    '💎',
    '#1a3a6b',
    '#4FC3F7',
    'streak',
    7
  ),
  (
    'guerreiro-da-manha',
    'Guerreiro da Manhã',
    '10 treinos iniciados antes das 8h.',
    '🌅',
    '#B34700',
    '#FF8C00',
    'time',
    10
  ),
  (
    'raiz-profunda',
    'Raiz Profunda',
    '30 dias consecutivos com pelo menos 1 atividade registrada.',
    '🌿',
    '#004d2e',
    '#1DB954',
    'streak',
    30
  ),
  (
    'mente-afiada',
    'Mente Afiada',
    '20 entradas de diário completadas (com os 3 campos preenchidos).',
    '📖',
    '#2d004d',
    '#9C27B0',
    'diary',
    20
  ),
  (
    'arquiteto-do-corpo',
    'Arquiteto do Corpo',
    'Executar todos os 5 grupos musculares principais em uma única semana.',
    '🏗️',
    '#1c1c1c',
    '#78909C',
    'variety',
    5
  ),
  (
    'tonelada-de-aco',
    'Tonelada de Aço',
    'Acumular 100.000 kg de volume total levantado ao longo do histórico.',
    '⚖️',
    '#5C3A00',
    '#D4AF37',
    'volume',
    100000
  ),
  (
    'fluxo-perfeito',
    'Fluxo Perfeito',
    '5 sessões de mobilidade em uma semana.',
    '🌊',
    '#004055',
    '#00BCD4',
    'streak',
    5
  ),
  (
    'protocolo-nutricional',
    'Protocolo Nutricional',
    '14 dias consecutivos com macros registrados.',
    '🥗',
    '#1a3d00',
    '#8BC34A',
    'diary',
    14
  ),
  (
    'nivel-elite',
    'Nível Élite',
    'Atingir Level 10.',
    '👑',
    '#4d3000',
    '#FFD700',
    'level',
    10
  ),
  (
    'modo-besta',
    'Modo Besta',
    'Treinar 3 vezes em 24 horas.',
    '🐺',
    '#1a0033',
    '#7B1FA2',
    'streak',
    3
  ),
  (
    'eterno-estudante',
    'Eterno Estudante',
    'Executar 50 exercícios distintos ao longo do histórico.',
    '🔬',
    '#0d1b4d',
    '#3F51B5',
    'variety',
    50
  )
ON CONFLICT (slug) DO NOTHING;
