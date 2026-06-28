# Release v1.0.0 — Life RPG: Módulo Fit

**Data:** 2026-06-27  
**Branch:** master  
**Build:** limpo (0 erros, 0 warnings)

---

## O que está incluído nesta versão

### Módulos completos

| Módulo | Rota | Status |
|--------|------|--------|
| Login local/mock | `/auth/login` | ✅ |
| Dashboard hub | `/dashboard` | ✅ |
| Treinos | `/treinos` | ✅ |
| Sessão ativa | `/sessao` | ✅ |
| Diário | `/diario` | ✅ |
| Nutrição | `/nutricao` | ✅ |
| Insights (gráficos) | `/insights` | ✅ |
| Perfil + Badges | `/perfil` | ✅ |
| Configurações + Backup | `/configuracoes` | ✅ |

### Features principais

- Modo local/mock: funciona sem Supabase, sem `.env.local`
- XP e sistema de níveis com modal de Level Up
- Sistema de badges e conquistas
- PR detection automático (personal records)
- Exportar/Importar backup JSON
- Reset seguro com confirmação textual
- Gráficos de insights (Recharts): evolução de carga, frequência, PRs
- Streak de nutrição e diário
- Bottom nav responsivo para mobile
- Dark mode com cores dinâmicas por atributo

### Stack técnica

- Next.js 14.2.35 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS 3
- Zustand 5 (state management)
- Recharts 3 (gráficos)
- localStorage (persistência)

---

## Build stats

```
Route (app)                              Size     First Load JS
┌ ○ /                                    175 B          96.2 kB
├ ○ /auth/login                          4.79 kB        160 kB
├ ○ /configuracoes                       3.36 kB        90.7 kB
├ ○ /dashboard                           5.99 kB        100 kB
├ ○ /diario                              6.12 kB        96.9 kB
├ ○ /insights                            123 kB         214 kB
├ ○ /nutricao                            6.78 kB        97.5 kB
├ ○ /perfil                              2.06 kB        105 kB
├ ○ /sessao                              7.69 kB        98.5 kB
└ ○ /treinos                             3.22 kB        93.7 kB
```

---

## Deploy

Repositório: https://github.com/ThiagoThomasx/fitness-life-rpg

### Deploy na Vercel (passo humano)

1. Acesse https://vercel.com/new
2. Importe o repositório `ThiagoThomasx/fitness-life-rpg`
3. Framework: Next.js (detectado automaticamente)
4. Nenhuma variável de ambiente necessária para modo local
5. Clique em Deploy

### Variáveis para habilitar Supabase (opcional, futuro)

```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

---

## QA pós-deploy

Após o deploy, valide no URL de produção:

- [ ] Login local funciona
- [ ] Dashboard carrega com dados mock
- [ ] Treino pode ser iniciado e finalizado
- [ ] Gráficos de insights renderizam
- [ ] Backup exporta arquivo JSON válido
- [ ] Mobile (375px): bottom nav visível e funcional
- [ ] Nenhum erro de console em produção

---

## Sprints concluídas

| Sprint | Entrega |
|--------|---------|
| 1 | Infraestrutura: Next.js, Supabase, auth |
| 2 | Personagem, XP, níveis |
| 3 | Treinos e exercícios |
| 4 | Sessão ativa, séries, PR detection |
| 5 | Diário com tags e XP |
| 6 | Insights com gráficos |
| 7 | Nutrição com metas e streak |
| 8 | Polish premium: cores dinâmicas, skeletons, LevelUpModal |
| 9 | Backup, importação, reset seguro, configurações |
| 10 | QA final, correções de produção, deploy readiness |
| 11 | Release v1.0: package.json, docs, tag, push |
