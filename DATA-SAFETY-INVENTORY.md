# Data Safety Inventory — Sprint 23

Inventário de todas as chaves de `localStorage` (`STORAGE_KEYS`, `src/lib/backup.ts`) + IndexedDB (fotos), e sua cobertura por backup/restore/reset. Auditoria confirmou que a cobertura já era completa antes desta sprint — o único gap real era a ausência de reset granular para histórico de treinos (corrigido, ver abaixo).

## Chaves localStorage

| Chave | Store/módulo | Dados | Backup | Restore | Reset completo | Reset granular |
|---|---|---|---|---|---|---|
| `lrpg-fit:character` | `useCharacterStore` (Zustand persist) | Personagem, XP, nível, atributos | ✅ | ✅ | ✅ | — |
| `lrpg-fit:active-session` | `useSessionStore` (Zustand persist) | Sessão de treino em andamento | ✅ | ✅ | ✅ | — |
| `lrpg-fit:workout-history` | `workout-history.ts` | Treinos concluídos (`CompletedWorkout[]`) | ✅ | ✅ | ✅ | ✅ **novo** (`resetWorkoutHistory`, Sprint 23) |
| `lrpg-fit:badges` | `badges.ts` | Badges conquistados | ✅ | ✅ | ✅ | — |
| `lrpg-fit:daily-logs` | Diário | Registros diários | ✅ | ✅ | ✅ | — |
| `lrpg-fit:reward-events` | `reward-events.ts` | Eventos de recompensa (toast) | ✅ | ✅ | ✅ | — |
| `lrpg-fit:nutrition-goal` | Nutrição | Meta calórica | ✅ | ✅ | ✅ | — |
| `lrpg-fit:nutrition-logs` | Nutrição | Registros de refeição | ✅ | ✅ | ✅ | — |
| `lrpg-fit:missions-completed` | Missões diárias | IDs de missão completada | ✅ | ✅ | ✅ | — |
| `lrpg-fit:custom-workouts` | Workout Builder | Treinos customizados | ✅ | ✅ | ✅ | — |
| `lrpg-fit:custom-exercises` | Workout Builder | Exercícios customizados | ✅ | ✅ | ✅ | — |
| `lrpg-fit:weekly-plan` | Plano/Campanhas | Plano semanal | ✅ | ✅ | ✅ | — |
| `lrpg-fit:campaigns` | Plano/Campanhas | Campanhas | ✅ | ✅ | ✅ | — |
| `lrpg-fit:preferences` | Onboarding/Preferências | Objetivo, equipamento, dias, estilo | ✅ | ✅ | ✅ | — |
| `lrpg-fit:avatar` | Perfil | Avatar selecionado | ✅ | ✅ | ✅ | — |
| `lrpg-fit:char-name` | Perfil | Nome do personagem | ✅ | ✅ | ✅ | — |
| `rpg_last_seen_level` | Gamificação | Último nível visto (evita repetir animação de level-up) | ✅ | ✅ | ✅ | — |
| `lrpg-fit:readiness-check-ins` | Prontidão/Recovery | Check-ins de prontidão | ✅ | ✅ | ✅ | — |
| `lrpg-fit:session-plan-changes` | Sessão adaptativa | Ajustes aplicados durante a sessão | ✅ | ✅ | ✅ | — |
| `lrpg-fit:training-cycles` | Ciclos de treino | Ciclos | ✅ | ✅ | ✅ | — |
| `lrpg-fit:cycle-reviews` | Ciclos de treino | Revisões de ciclo | ✅ | ✅ | ✅ | — |
| `lrpg-fit:cycle-week-annotations` | Ciclos de treino | Anotações por semana | ✅ | ✅ | ✅ | — |
| `lrpg-fit:training-goals` | Goals | Metas de treino | ✅ | ✅ | ✅ | — |
| `lrpg-fit:goal-milestones` | Goals | Marcos de meta | ✅ | ✅ | ✅ | — |
| `lrpg-fit:body-progress` | Body Progress | Peso, medidas, observações | ✅ | ✅ | ✅ | ✅ (`resetAllBodyProgress`, Sprint 19) |
| `lrpg-fit:workout-templates` | Templates | Templates de treino | ✅ | ✅ | ✅ | ✅ (`resetWorkoutTemplates`, Sprint 20) |
| `lrpg-fit:training-programs` | Programas | Programas semanais | ✅ | ✅ | ✅ | ✅ (`resetTrainingPrograms`, Sprint 20) |
| `lrpg-fit:planned-workouts` | Planner | Sessões planejadas | ✅ | ✅ | ✅ | `resetPlannedWorkouts` existe em `planned-workouts.ts`, mas não está exposto na UI de Configurações |
| `lrpg-fit:adaptive-recommendation-decisions` | Recomendações adaptativas | Decisões (aceitar/dispensar) | ✅ | ✅ | ✅ | `resetRecommendationDecisions` existe em `adaptive-recommendation-decisions.ts`, mas não está exposto na UI |
| `lrpg-fit:personal-record-events` | Recordes | Eventos de recorde estruturados (Sprint 22 pt3) | ✅ | ✅ | ✅ | ✅ **novo** (`resetPersonalRecordEvents`, Sprint 23 — sempre em conjunto com `resetWorkoutHistory`) |

## IndexedDB

| Dado | Módulo | Backup | Restore | Reset completo | Reset granular |
|---|---|---|---|---|---|
| Fotos de progresso | `body-progress-photo-db.ts` | ❌ (decisão consciente — fotos não entram no `.json` de backup, permanecem só no navegador) | N/A | ✅ (`clearAllPhotos()` chamado em `resetAllData`) | ✅ (`PhotoResetSection`, remove fotos + `stripAllPhotoLinks`) |

## Restore — comportamento

`importBackup()` (`backup.ts`): valida forma do payload → valida versão → valida estrutura de **cada chave** (array/objeto, XP/nível não-negativos) → só então grava. Snapshot do estado atual é tirado antes de escrever, com rollback automático se `localStorage.setItem` falhar (quota excedida). Chaves ausentes/`null` no backup são puladas (`skippedKeys`), sem sobrescrever com `null` — compatível com backups antigos que não tinham uma chave nova.

## Reset — comportamento

- **Completo** (`resetAllData`): limpa todas as `STORAGE_KEYS` + `clearAllPhotos()` (IndexedDB).
- **Granular existente antes desta sprint**: fotos (com `stripAllPhotoLinks`), progresso corporal (com opção de apagar fotos vinculadas — nunca deixa fotos órfãs), templates/programas (independentes — apagar templates não afeta sessões planejadas/concluídas nem os snapshots dentro de programas; apagar programas não afeta Planner nem ciclos).
- **Granular novo (Sprint 23)**: histórico de treinos. Sempre remove `lrpg-fit:workout-history` **e** `lrpg-fit:personal-record-events` juntos — sem isso, os eventos de recorde ficariam órfãos, apontando para `workoutId`s que deixaram de existir.

## Pendências reais

- `resetPlannedWorkouts()` e `resetRecommendationDecisions()` existem como funções na camada de lib mas não têm seção própria em Configurações — não é um risco de dado órfão (não são exibidos sem essa UI), só uma funcionalidade não exposta. Fora do escopo desta sprint (não fazia parte do gap identificado na auditoria).
