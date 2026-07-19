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

Tendências (`src/lib/trend-math.ts`, `body-progress-trends.ts`, `wellness-trends.ts`) são sempre derivadas em runtime — nunca persistidas. Fotos de progresso (IndexedDB) ficam fora deste modelo até a Sprint 19.1.

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
