# Ações Humanas Necessárias

Este arquivo documenta ações que precisam ser feitas por um humano para habilitar funcionalidades reais (Supabase, OAuth, etc.).

O app funciona em **modo local/mock** enquanto estas ações não forem realizadas.

---

## 1. Criar projeto no Supabase

1. Acesse https://app.supabase.com
2. Clique em "New project"
3. Preencha nome, senha e região
4. Aguarde o projeto ser provisionado (~1 min)

## 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

Obtenha os valores em: Supabase → Project Settings → API

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Aplicar migrations

No painel do Supabase → SQL Editor, execute em ordem:

1. `supabase/migrations/001_users_and_characters.sql`
2. `supabase/migrations/002_workout_types_and_exercises.sql`
3. `supabase/migrations/003_workouts_and_sessions.sql`
4. `supabase/migrations/004_logs_nutrition_badges.sql`
5. `supabase/migrations/005_rls_policies.sql`

## 4. Aplicar functions

Execute no SQL Editor:

1. `supabase/functions/award_xp.sql`
2. `supabase/functions/check_personal_record.sql`
3. `supabase/functions/update_character_attributes.sql`

## 5. Executar seeds

Execute no SQL Editor:

1. `supabase/seeds/001_workout_types.sql`
2. `supabase/seeds/002_exercises.sql`
3. `supabase/seeds/003_badge_definitions.sql`

## 6. Configurar Google OAuth (opcional)

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth Client
2. Authorized redirect URI: `https://[seu-projeto].supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google → habilitar e colar Client ID + Secret

---

## Status de detecção automática

O app detecta automaticamente se o Supabase está configurado via `src/lib/env.ts`.

- **Sem `.env.local`** → modo mock, dados fictícios, sem persistência
- **Com `.env.local` preenchido** → Supabase real, dados persistidos, OAuth disponível
