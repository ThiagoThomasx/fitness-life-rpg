# Sprint 1 — Infraestrutura do Módulo Fit

## Auditoria do Repositório

O repositório estava vazio (apenas `.git`). Não havia stack pré-existente.
**Decisão:** Criar infraestrutura de backend isolada. Nenhuma migração de app existente necessária.
A Sprint 2 adicionará o app Next.js sobre esta base.

---

## O Que Foi Criado

### Estrutura de Arquivos

```
fitness-life-rpg/
├── .env.example
├── .gitignore
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_users_and_characters.sql
│   │   ├── 002_workout_types_and_exercises.sql
│   │   ├── 003_workouts_and_sessions.sql
│   │   ├── 004_logs_nutrition_badges.sql
│   │   └── 005_rls_policies.sql
│   ├── functions/
│   │   ├── award_xp.sql
│   │   ├── check_personal_record.sql
│   │   └── update_character_attributes.sql
│   ├── seeds/
│   │   ├── 001_workout_types.sql
│   │   ├── 002_exercises.sql
│   │   └── 003_badge_definitions.sql
│   └── tests/
│       └── sprint1_validation.sql
└── docs/
    └── sprint1-infraestrutura.md
```

---

## Schema de Dados

### Diagrama de Entidades

```
users ──────────────── characters
  │                       │
  │                       └── xp_transactions
  │
  ├── workouts ──────── workout_exercises ── exercises
  │       │
  │       └── workout_sessions ──── exercise_sets
  │                                      │
  │                              personal_records (VIEW)
  │
  ├── daily_logs
  ├── daily_nutrition
  └── user_badges ──── badge_definitions

workout_types ──── workouts
              └─── workout_sessions (via workouts)
```

---

## Lógica de XP

### Fórmula

```
XP_ganho = ROUND(base_xp × intensity_mult × consistency_mult) + bonus
```

### Multiplicador de Intensidade

```sql
1.0 + (volume_atual / baseline_4_sessoes × 0.3)
-- Teto: 1.5
-- volume = SUM(weight_kg × reps)
-- baseline = AVG das últimas 4 sessões do mesmo tipo
```

### Multiplicador de Consistência (dias ativos na semana)

| Dias | Multiplicador |
|------|--------------|
| 1–2  | 1.0×         |
| 3–4  | 1.15×        |
| 5–6  | 1.30×        |
| 7    | 1.50×        |

### Bônus Complementares

| Evento | XP |
|--------|----|
| Treino completo (todos os exercícios) | +15 |
| Diário do dia preenchido | +10 |
| Primeiro exercício novo | +25 |
| Novo PR (trigger automático) | +50 |

### Curva de Level Up

```
XP_necessário(N) = 100 × N²
```

| Level | XP necessário para subir |
|-------|--------------------------|
| 1→2   | 100 XP                   |
| 5→6   | 2.500 XP                 |
| 10→11 | 10.000 XP                |

---

## Funções SQL

### `award_xp(p_session_id UUID) → JSONB`

Função principal chamada ao completar uma sessão.
Executa em transação única:
1. Calcula multiplicadores de intensidade e consistência
2. Aplica bônus
3. `UPDATE characters SET current_xp, total_xp, level`
4. `INSERT xp_transactions`
5. `UPDATE workout_sessions SET xp_earned, intensity_multiplier, completed_at`
6. `REFRESH MATERIALIZED VIEW personal_records CONCURRENTLY`

**Retorno:**
```json
{
  "xp_earned": 148,
  "base_xp": 120,
  "intensity_multiplier": 1.06,
  "consistency_multiplier": 1.15,
  "bonus": 15,
  "level_up": false,
  "old_level": 3,
  "new_level": 3,
  "new_current_xp": 540,
  "new_total_xp": 1240
}
```

### `check_personal_record()` — Trigger AFTER INSERT em `exercise_sets`

1. Calcula 1RM estimado via fórmula Epley: `weight × (1 + reps/30)`
2. Compara com `personal_records` (view materializada)
3. Se novo PR: `UPDATE exercise_sets SET is_pr = TRUE`
4. Insere `xp_transactions` de +50 XP
5. Atualiza `characters.current_xp` imediatamente

### `update_character_attributes(p_session_id UUID)`

Recalcula atributos com base em XP acumulado por categoria:

| Atributo | Fonte | Threshold |
|----------|-------|-----------|
| Força | XP de treinos `strength` | +1 a cada 300 XP |
| Agilidade | XP de treinos `agility` | +1 a cada 200 XP |
| Destreza | XP de treinos `dexterity` | +1 a cada 150 XP |
| Constituição | Streak de dias ativos | +1 a cada 7 dias |
| Vitalidade | Dias com macros na meta | +1 a cada 5 dias |

Atributos nunca decrescem (`GREATEST(current, calculated)`).

---

## RLS (Row Level Security)

Todas as tabelas de usuário têm RLS ativo.

| Tabela | Política |
|--------|---------|
| `users` | Lê/atualiza apenas próprio registro |
| `characters` | Lê/atualiza apenas próprio personagem |
| `xp_transactions` | Leitura própria; INSERT apenas via `SECURITY DEFINER` |
| `workout_*` | Acesso apenas às próprias entidades |
| `exercise_sets` | Via JOIN com `workout_sessions.user_id` |
| `daily_*` | Acesso apenas aos próprios logs |
| `workout_types` / `exercises` / `badge_definitions` | Leitura para autenticados |

---

## Como Aplicar no Supabase

### 1. Criar projeto no Supabase

- Região: South America (São Paulo) — `sa-east-1`
- Copiar URL e chaves para `.env`

### 2. Aplicar migrations (em ordem)

No SQL Editor do Supabase, execute na ordem:
```
001 → 002 → 003 → 004 → 005
```

### 3. Criar funções

Execute os arquivos em `supabase/functions/`:
```
check_personal_record.sql  (trigger — criar antes do award_xp)
award_xp.sql
update_character_attributes.sql
```

### 4. Executar seeds

```
001_workout_types.sql
002_exercises.sql
003_badge_definitions.sql
```

### 5. Validar

Execute `supabase/tests/sprint1_validation.sql` como service role.
Todos os testes devem retornar `[PASSED]`.

---

## Decisões Técnicas

### Por que `SECURITY DEFINER` nas funções de XP?

XP é moeda do jogo. O usuário não pode incrementar diretamente `characters.current_xp` ou inserir em `xp_transactions`. Toda lógica de crédito de XP passa pelas funções SQL que validam a sessão antes de modificar o personagem.

### Por que Materialized View para `personal_records`?

Query de PR por usuário + exercício envolve JOIN de `exercise_sets` → `workout_sessions`. Com `DISTINCT ON` e `ORDER BY weight_kg DESC`, o índice único na view torna a consulta O(1) em vez de O(n_sessions).

O `REFRESH CONCURRENTLY` não bloqueia leituras durante a atualização.

### Por que atributos nunca decrescem?

O usuário não perde conquistas por períodos de inatividade. `GREATEST(current, calculated)` garante que o atributo só sobe, refletindo o histórico acumulado.

---

## Próximos Passos (Sprint 2)

- Setup Next.js 14 com App Router + TypeScript strict
- Integração Supabase Auth (Google OAuth + email/password)
- CSS Custom Properties do Spotify Dark Canvas
- Zustand stores: `useCharacterStore`, `useSessionStore`
- Layout base: topbar 56px + bottom nav 64px
