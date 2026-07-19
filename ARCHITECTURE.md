# Arquitetura — Fitness Life RPG

## Visão geral

```
[localStorage] ←→ [Zustand stores + módulos lib/*] ←→ [Componentes de UI]
```

O app é **local-first**: não há chamada de rede no fluxo ativo. Todo estado persistente vive em `localStorage` sob o prefixo **`lrpg-fit:*`**, acessado por duas vias complementares:

1. **Stores Zustand** (estado reativo com `persist`) — para dados que a UI observa continuamente.
2. **Módulos `lib/*`** (leitura/escrita direta sob demanda) — para dados consultados pontualmente (histórico, missões, plano, preferências, nutrição, diário).

A fase atual de redesign toca **apenas** na camada de componentes de UI — stores e módulos `lib/*` não são alterados.

## Stores Zustand reais (não alterar nesta fase)

| Store | Arquivo | Chave de persistência | Domínio |
|---|---|---|---|
| `useCharacterStore` | `src/stores/useCharacterStore.ts` | `lrpg-fit:character` | Personagem: nível, XP, atributos |
| `useSessionStore` | `src/stores/useSessionStore.ts` | `lrpg-fit:active-session` | Sessão de treino ativa (timer, séries) |
| `useBadgeStore` | `src/stores/useBadgeStore.ts` | `lrpg-fit:badges` | Badges conquistadas |
| `useRewardStore` | `src/stores/useRewardStore.ts` | — (fila em memória) | Fila de toasts de recompensa |

> Nota: versões anteriores desta documentação mencionavam stores (`workoutStore`, `journalStore`, `nutritionStore`, `progressionStore`, `backupStore`) que **não existem como stores Zustand**. Esses domínios são implementados como módulos `lib/*` (abaixo).

## Módulos `lib/*` com persistência direta

| Módulo | Chaves | Domínio |
|---|---|---|
| `lib/workout-history.ts` | `lrpg-fit:workout-history` | Treinos completados, PRs |
| `lib/daily-log.ts` | `lrpg-fit:daily-logs` | Diário (entradas + tags automáticas) |
| `lib/nutrition.ts` | `lrpg-fit:nutrition-goal`, `lrpg-fit:nutrition-logs` | Metas de macros e registros |
| `lib/daily-missions.ts` | `lrpg-fit:missions-completed` | Missões do dia |
| `lib/weekly-plan.ts` | `lrpg-fit:weekly-plan` | Plano semanal |
| `lib/campaigns.ts` | `lrpg-fit:campaigns` | Campanhas de longo prazo |
| `lib/preferences.ts` | `lrpg-fit:preferences` | Preferências + onboarding |
| `lib/custom-workouts.ts` | `lrpg-fit:custom-workouts`, `lrpg-fit:custom-exercises` | Workout builder |
| `lib/reward-events.ts` | `lrpg-fit:reward-events` | Histórico de recompensas |
| `lib/backup.ts` | (agrega todas) | Export/import/validação/reset |

Chaves auxiliares: `lrpg-fit:avatar`, `lrpg-fit:char-name`, `rpg_last_seen_level` (detecção de level-up no Dashboard).

## IndexedDB (Sprint 19 Parte 2 — único uso no app)

Fotos privadas de progresso (`src/lib/body-progress-photo-db.ts`) usam IndexedDB (`lrpg-fit-photos`, versão 1, store `photos`) em vez de `localStorage` — blobs de imagem não cabem bem nesse mecanismo (limite de armazenamento menor, custo de serialização, e o requisito explícito de nunca incluir imagens no backup JSON). É o único domínio do app que não segue o padrão `localStorage` acima. `BodyProgressEntry.photoIds` (em `lrpg-fit:body-progress`) guarda apenas os IDs — a resolução para metadados/blob acontece em runtime via `body-progress-photo-link.ts`, nunca persistida cruzada. Ver `DATA_MODEL.md` e `SPRINT-19-PART2.md`.

## Camada visual (Sprint 1 — consolidada)

### Design tokens — `src/styles/tokens.css`
Fonte única de verdade para cor, tipografia, espaçamento, radius, sombras, layout e motion. Nenhum componente deve declarar valores soltos. Paleta: canvas escuro `#121212`, superfície `#1c1c1c`, acento chartreuse `#c8f169`, deep forest `#043f2e`. Ver `DESIGN.md`.

Aliases legados (ex.: `--color-bg-elevated`, `--color-surface-1`) são mantidos no fim do arquivo até as rotas das Sprints 2–6 serem migradas.

### Fontes
- **Inter** (`--font-ui`) — interface, corpo, labels.
- **Fraunces** (`--font-display`) — headlines editoriais e números especiais. Ambas via `next/font/google` em `src/app/layout.tsx`.

### Componentes compartilhados — `src/styles/components.css`
Cards, botões, forms, feedback, métricas, skeletons, empty states. Classes utilitárias Tailwind expostas via `tailwind.config.ts` referenciam as mesmas variáveis CSS.

### Navigation shell — decisão travada
- **Desktop:** sidebar fixa (`AppSidebar.tsx` + `src/styles/shell.css`)
- **Mobile:** drawer com overlay, botão hamburger, Escape para fechar, scroll lock e retorno de foco

`AppSidebar` é a navegação **oficial e definitiva** (decisão encerrada no Sprint 1 da v2 — não reabrir). `BottomNav` e `TopBar` (legado v1) foram removidos do código.

### Componentes por tela
Cada tela consome sua fonte de dados (store ou `lib/*`) e é composta por componentes visuais construídos sobre os tokens. O Dashboard é o piloto do padrão: rota em `src/app/(dashboard)/dashboard/page.tsx` (dados + composição) e componentes em `src/components/dashboard/`.

## Autenticação / Supabase

Schema e RLS existem no banco (criados na v1), mas **não fazem parte do fluxo ativo**. O app roda em modo mock permanente:
- Sem `.env.local` → mock user + mock character carregados automaticamente
- Middleware de rotas bypassado
- Nenhuma chamada de rede necessária para uso completo do app

Reativar Supabase não faz parte do escopo atual.

## Fluxo de dados típico (exemplo: finalizar um treino)

```
Sessão ativa (UI)
  → useSessionStore finaliza a sessão
    → calcula XP e detecta PR (lógica existente, não tocar)
    → persiste em lib/workout-history (localStorage)
    → atualiza useCharacterStore (XP/level)
    → checagem de badges (lib/badges + useBadgeStore)
  → UI reage ao novo estado (React re-render via Zustand)
  → RewardToast exibido se houver badge/level up
```

## Backup e reset

`lib/backup.ts` expõe export/import/validação de schema/reset, consumido pela rota `/configuracoes`. Esses fluxos já existem e devem apenas ser **revisados visualmente** na Sprint 6 — não recriados.
