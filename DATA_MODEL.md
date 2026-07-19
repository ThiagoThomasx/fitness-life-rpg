# Modelo de Dados — Fitness Life RPG

Estrutura de referência por domínio, suficiente para guiar implementação de UI sem redefinir a lógica existente. Não é o schema SQL original (esse existe no Supabase, mas está fora do fluxo ativo).

## Personagem (`characterStore`)

```ts
Character {
  name: string
  level: number
  xp: number
  xpToNextLevel: number
  attributes: {
    strength: number
    endurance: number
    consistency: number
    // demais atributos conforme regras de progressão existentes
  }
}
```

## Treino (`workoutStore`)

```ts
WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

Exercise {
  id: string
  name: string
  category: string
}

WorkoutSession {
  id: string
  templateId: string | null   // null = treino customizado/avulso
  startedAt: string
  finishedAt: string | null
  sets: SetEntry[]
  xpEarned: number
  prsDetected: PersonalRecord[]
}

SetEntry {
  exerciseId: string
  weight: number
  reps: number
}

PersonalRecord {
  exerciseId: string
  value: number
  achievedAt: string
}
```

## Diário (`journalStore`)

```ts
JournalEntry {
  id: string
  date: string
  content: string
  tags: string[]   // geradas automaticamente
}
```

## Nutrição (`nutritionStore`)

```ts
NutritionGoal {
  calories: number
  protein: number
  carbs: number
  fat: number
}

NutritionLog {
  id: string
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
}
```

## Progressão (`progressionStore`)

```ts
Badge {
  id: string
  name: string
  description: string
  unlockedAt: string | null
}

RewardEvent {
  type: 'xp' | 'level_up' | 'badge' | 'pr'
  payload: unknown
  timestamp: string
}
```

## Backup (`backupStore`)

```ts
BackupPayload {
  version: string
  exportedAt: string
  character: Character
  workouts: WorkoutSession[]
  templates: WorkoutTemplate[]
  journal: JournalEntry[]
  nutrition: { goal: NutritionGoal, logs: NutritionLog[] }
  badges: Badge[]
}
```

> **Nota (Sprint 19):** este documento descreve o modelo original em formato de "stores". Desde a Sprint 10+, a maior parte dos domínios novos (prontidão, ciclos, metas, progresso corporal, etc.) segue o padrão real do código: módulo funcional `src/lib/<domínio>.ts` + `localStorage` direto (não Zustand), documentado no cabeçalho de cada arquivo. `BackupPayload` real está em `src/lib/backup.ts` (`STORAGE_KEYS`), não neste formato. Ver `SPRINT-19-v2.md` para o modelo completo de progresso corporal introduzido nesta sprint.

## Progresso corporal e bem-estar (Sprint 19 — `src/lib/body-progress.ts` + extensão de `readiness-check-ins.ts`)

Domínio opcional e privado, local-first, sem XP/badges/recompensas. Ver `SPRINT-19-v2.md` para a decisão de não criar um domínio "wellness" separado.

```ts
// src/lib/body-progress.ts — storage: lrpg-fit:body-progress
BodyProgressEntry {
  id: string
  recordedAt: string           // YYYY-MM-DD
  weightKg?: number
  measurements?: BodyMeasurements
  notes?: string
  cycleId?: string              // vínculo informativo, não um novo tipo de meta
  createdAt: string
  updatedAt: string
}

BodyMeasurements {
  waistCm?: number; abdomenCm?: number; chestCm?: number; hipsCm?: number
  rightArmCm?: number; leftArmCm?: number
  rightThighCm?: number; leftThighCm?: number
  rightCalfCm?: number; leftCalfCm?: number; neckCm?: number
  custom?: { id: string; label: string; valueCm: number }[]
}

// src/lib/readiness-check-ins.ts — estendido, mesma storage (lrpg-fit:readiness-check-ins)
WorkoutReadinessCheckIn {
  // ...campos da Sprint 14 (energy, soreness, sleepQuality, motivation)
  stress?: 1 | 2 | 3 | 4 | 5    // Sprint 19
  mood?: 1 | 2 | 3 | 4 | 5      // Sprint 19
  sleepHours?: number           // Sprint 19
}
```

Tendências (`src/lib/trend-math.ts`, `body-progress-trends.ts`, `wellness-trends.ts`) são sempre derivadas em runtime — nunca persistidas.

## Fotos de progresso (Sprint 19 Parte 2 — `src/lib/body-progress-photo*.ts`)

Único uso de IndexedDB no app — blobs de imagem não cabem bem em `localStorage`. Ver `SPRINT-19-PART2.md` para a auditoria e decisões arquiteturais completas.

```ts
// IndexedDB — banco "lrpg-fit-photos", versão 1, store "photos" (keyPath: id)
// Índices: by-entryId, by-takenAt, by-category (todos não-únicos)
BodyProgressPhoto {                    // metadados (sem blobs)
  id: string
  entryId: string                      // dono único — uma foto pertence a exatamente um registro
  category: 'front' | 'side' | 'back' | 'other'
  takenAt: string                      // YYYY-MM-DD
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  width: number
  height: number
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

BodyProgressPhotoRecord extends BodyProgressPhoto {
  blob: Blob            // imagem principal, redimensionada (máx. 1600px) e comprimida
  thumbnailBlob: Blob   // miniatura (máx. 320px), usada em listas/galeria
}

// src/lib/body-progress.ts — campo novo, opcional (registros antigos continuam válidos)
BodyProgressEntry {
  // ...campos existentes...
  photoIds?: string[]   // IDs de BodyProgressPhoto vinculadas a este registro
}
```

Nunca enviadas a servidor, nunca analisadas, nunca incluídas no backup JSON (`BackupPayload.media.bodyPhotosIncluded` é sempre `false` — só a contagem é exportada). Referências quebradas (`photoId` sem registro correspondente no IndexedDB) não quebram a tela — `resolveEntryPhotos`/`getPhotoMetadata` retornam `null` e a UI mostra um placeholder neutro.

**Deixado fora desta sprint** (candidato a Sprint 19.3): exportação/importação ZIP com blobs, UI de "espaço aproximado usado".

**Chaves reais de `localStorage` (prefixo `lrpg-fit:*`, confirmadas contra o código na Sprint 1 da v2):**
```
lrpg-fit:character            lrpg-fit:active-session
lrpg-fit:workout-history      lrpg-fit:badges
lrpg-fit:daily-logs           lrpg-fit:reward-events
lrpg-fit:nutrition-goal       lrpg-fit:nutrition-logs
lrpg-fit:missions-completed   lrpg-fit:weekly-plan
lrpg-fit:campaigns            lrpg-fit:preferences
lrpg-fit:custom-workouts      lrpg-fit:custom-exercises
lrpg-fit:avatar               lrpg-fit:char-name
rpg_last_seen_level (auxiliar, detecção de level-up)
```

> Nota: este documento descreve a forma esperada dos dados para orientar a construção de UI. Os shapes acima são de referência — a fonte de verdade são os tipos em `src/types/` e os módulos em `src/lib/*`. Os domínios "workoutStore/journalStore/nutritionStore/progressionStore/backupStore" citados em versões antigas da documentação são, na implementação real, módulos `lib/*` + as stores Zustand listadas em `ARCHITECTURE.md`.
