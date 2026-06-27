interface TagRule {
  tag: string
  keywords: string[]
}

const TAG_RULES: TagRule[] = [
  { tag: 'sono-bom', keywords: ['dormi bem', 'boa noite de sono', 'descansei', 'sono ótimo', 'dormindo bem'] },
  { tag: 'sono-ruim', keywords: ['dormi mal', 'insônia', 'não dormi', 'pouco sono', 'acordei cedo demais'] },
  { tag: 'motivado', keywords: ['motivado', 'animado', 'empolgado', 'disposição', 'com energia', 'disposto'] },
  { tag: 'cansado', keywords: ['cansado', 'fatigado', 'exausto', 'sem energia', 'esgotado', 'sonolento'] },
  { tag: 'estressado', keywords: ['estressado', 'ansioso', 'nervoso', 'tenso', 'preocupado', 'sobrecarga'] },
  { tag: 'tranquilo', keywords: ['tranquilo', 'calmo', 'relaxado', 'sereno', 'paz'] },
  { tag: 'dor', keywords: ['dor', 'doendo', 'machucado', 'lesão', 'dói', 'desconforto', 'inflamado'] },
  { tag: 'hidrataçao-ok', keywords: ['bebi água', 'hidratado', 'água', 'muita água'] },
  { tag: 'treino-pesado', keywords: ['treino pesado', 'puxado', 'intenso', 'difícil', 'forçou'] },
  { tag: 'treino-leve', keywords: ['treino leve', 'fácil', 'tranquilo', 'recuperação', 'moderado'] },
  { tag: 'nutrição-boa', keywords: ['comi bem', 'alimentação boa', 'nutrido', 'proteína', 'dieta ok'] },
  { tag: 'nutrição-ruim', keywords: ['comi mal', 'besteira', 'junk', 'frango escapou', 'não segui a dieta'] },
  { tag: 'foco', keywords: ['focado', 'concentrado', 'no flow', 'produtivo'] },
  { tag: 'progresso', keywords: ['progresso', 'evoluindo', 'melhorando', 'avançando', 'crescendo'] },
]

export function extractTags(text: string): string[] {
  if (!text.trim()) return []
  const lower = text.toLowerCase()
  const found = new Set<string>()

  for (const rule of TAG_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        found.add(rule.tag)
        break
      }
    }
  }

  return Array.from(found)
}
