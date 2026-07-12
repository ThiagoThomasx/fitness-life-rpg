# Sprint 12 — Progressive Overload & Personal Records

## Objetivo

Transformar o Fitness Life RPG de um registrador de treinos concluídos em uma ferramenta que
acompanha a evolução física do jogador em cada exercício: detecção automática de recordes
pessoais (peso, repetições, volume, primeira execução), sugestão de progressão, e visibilidade
em Insights, Dashboard e Perfil. Toda a lógica é local e determinística (sem IA) — camada
aditiva, sem alterar as regras atuais de XP ou de badges.

## 1. Auditoria

### Estado existente

- Detector de PR já existia em `sessao/page.tsx` (`finishWorkout()`), mas era **estreito**:
  comparava apenas o maior peso da sessão contra `getExercisePersonalBest()` (peso máximo já
  registrado). Nunca disparava na primeira execução de um exercício (`personalBest > 0` era
  condição obrigatória). Não existia detecção por repetições, volume ou 1RM estimado.
- Esse `prsCount` estreito alimentava diretamente `calculateXpGain()` (`lib/workout.ts`, bônus de
  50 XP por PR, capado em 150) e `checkAndEarnBadges()` (via `totalPrs` calculado em
  `handleConfirmResult()`).
- `lib/progression.ts` já existia (`suggestProgression`) — sugestão de próxima carga/reps, sem
  detecção de PR. Reutilizado sem modificação.
- `src/types/database.ts` já tinha um tipo `PersonalRecord` e `XpTransaction.source:
  'personal_record'` — ambos órfãos, nunca lidos/escritos em nenhum lugar do código. Decisão:
  **deixados como estão** (moldados para um schema Supabase que não se aplica à arquitetura
  local-first deste projeto; adotá-los criaria um segundo modelo de dados paralelo).
- `ExerciseHistoryModal.tsx` já existia (aberto a partir da biblioteca de exercícios em
  `/treinos`) e já mostrava recorde pessoal, sugestão e histórico de séries — identificado como
  o lugar certo para atender ao pedido de "Tela de Exercícios" do escopo original, sem abrir a
  decisão de navegação travada (`CLAUDE.md` regra 6).

### Decisão de design confirmada com o usuário

Duas decisões foram levadas ao usuário antes da implementação (ver plano da sessão):

1. **Tela de Exercícios** → enriquecer o `ExerciseHistoryModal.tsx` existente em vez de criar
   uma rota/nav nova.
2. **Escopo de XP/badges** → manter `prsCount`/`calculateXpGain`/`checkAndEarnBadges` **idênticos
   byte-a-byte**; os novos tipos de recorde (reps/volume/primeira-vez) são puramente aditivos —
   aparecem em toast, Insights, Dashboard e Perfil, mas nunca contam para o bônus de XP nem para
   o desbloqueio de badges.

## 2. Modelo de dados

Nenhuma nova chave de `localStorage`, nenhum bump de `BACKUP_VERSION`. Os novos dados vivem como
campos opcionais em `ExerciseRecord` (dentro de `CompletedWorkout`, já coberto por
`STORAGE_KEYS`/`ARRAY_KEYS` em `lib/backup.ts`):

```ts
export interface ExerciseRecord {
  exerciseId: string
  exerciseName: string
  sets: SetRecord[]
  isWeightPr?: boolean
  isRepsPr?: boolean
  isVolumePr?: boolean
  isFirstTime?: boolean
  estimated1RMKg?: number | null
}
```

Todos os campos são opcionais — histórico gravado antes desta sprint continua válido sem
migração, e é tratado graciosamente ("Ainda sem histórico suficiente.") pelas novas seções.

## 3. Lógica de detecção — `src/lib/exercise-records.ts`

- `calculateVolumeKg(sets)` — Σ peso × reps.
- `calculateEstimated1RM(weightKg, reps)` — fórmula de Epley (`peso × (1 + reps/30)`), `0` para
  exercícios de peso corporal ou entradas inválidas.
- `detectExercisePrs(exerciseId, sets)` — compara a sessão atual contra o histórico **anterior**
  (`getExerciseHistory`, chamado antes de `saveCompletedWorkout`, então nunca se compara consigo
  mesma). Empates não contam como recorde (`>`, não `>=`), espelhando o detector estreito
  existente. Primeira execução é seu próprio tipo, exclusivo dos demais.
- `getExerciseSummary(exerciseId)` / `getLastExecutionSummary(exerciseId)` — melhores marcas,
  1RM, tendência (`up`/`down`/`flat`/`insufficient_data`), última execução para o card de sessão.
- `getRecentRecords`, `getTopGrowthExercises`, `getStagnantExercises`, `getProfileRecordStats` —
  agregados entre exercícios para Insights, Dashboard e Perfil.

## 4. Integração (sem tocar XP/badges)

- `finishWorkout()`: roda `detectExercisePrs()` por exercício **depois** do detector estreito
  existente e **antes** de `calculateXpGain(...)` — mas apenas para popular os novos campos do
  `ExerciseRecord` e uma lista `recordEvents` (para o toast). `prsCount` e a chamada de
  `calculateXpGain` permanecem exatamente como antes.
- `handleConfirmResult()`: novo bloco, depois do loop de badges existente, que enfileira um
  evento `'pr'` por `recordEvents` — mesmo padrão de `addRewardEvent` + `pushReward` já usado
  para `level_up`/`badge`/`attribute_up`, protegido pelo mesmo guard `confirmedRef`.
- `RewardEventType` ganhou o membro `'pr'`; `theme-colors.ts` ganhou a cor correspondente.
  `RewardToast.tsx` não precisou de nenhuma alteração (renderiza a fila de forma genérica).
- `SessionExerciseCard.tsx`: nova prop opcional `lastExecution`, renderizada como linha discreta
  ("Última vez: 40kg × 10 reps") apenas antes do usuário registrar séries nesta sessão.

## 5. Insights, Dashboard, Perfil, Modal de exercício

- `InsightsData`/`computeInsights()`: novos campos `recentRecords`, `topGrowthExercises`,
  `stagnantExercises`, e `volumeKg` por ponto em `topExerciseLoads` (prepara gráficos futuros,
  sem novo gráfico nesta sprint). `totalPrs`/`recentPrs` (cálculo estreito existente)
  **intocados**.
- `PrsSection.tsx` enriquecido in-place: lista `recentRecords` com ícone e rótulo por tipo (🆕
  Estreia, 🥇 Peso, 📦 Volume, 🔁 Reps).
- Novo `ExerciseGrowthSection.tsx`: duas listas ("Em alta" / "Estagnados"), cada uma com seu
  próprio empty state.
- Novo `RecentRecordsCard.tsx` no Dashboard, entre `RecentBadges` e `NextMilestone`.
- Novo `RecordsSection.tsx` no Perfil, entre "Conquistas" e "Recompensas recentes" — total de
  recordes, maior carga (+ exercício), exercício mais evoluído (+ delta), maior sequência de
  melhorias.
- `ExerciseHistoryModal.tsx` enriquecido: melhor volume, 1RM estimado, tendência, e selos de tipo
  de recorde por sessão histórica.

## 6. Arquivos criados / alterados

**Criados:**
`src/lib/exercise-records.ts`, `src/lib/exercise-records.test.ts`,
`src/components/insights/ExerciseGrowthSection.tsx`,
`src/components/dashboard/RecentRecordsCard.tsx`, `src/components/profile/RecordsSection.tsx`.

**Alterados:**
`src/lib/workout-history.ts` (campos opcionais em `ExerciseRecord`), `src/lib/insights.ts`,
`src/lib/reward-events.ts`, `src/lib/theme-colors.ts`,
`src/app/(dashboard)/sessao/page.tsx`, `src/components/session/SessionExerciseCard.tsx`,
`src/components/insights/PrsSection.tsx`, `src/app/(dashboard)/insights/page.tsx`,
`src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/perfil/page.tsx`,
`src/components/workouts/ExerciseHistoryModal.tsx`, `src/lib/backup.test.ts`.

Nenhuma alteração em `lib/workout.ts` (fórmula de XP), `lib/badges.ts`, ou na lógica de
`prsCount`/`isPr` já existente.

## 7. Testes

32 testes novos em `exercise-records.test.ts` + 2 em `backup.test.ts`, 95/95 no total do
projeto:
- Matemática de volume e 1RM (casos-limite: vazio, peso corporal).
- `detectExercisePrs`: primeira execução, novo PR de peso, empate (não é PR), carga menor (não é
  PR), PR de reps independente de peso, PR de volume mesmo sem bater peso/reps individualmente,
  PRs combinados na mesma sessão, 1RM nulo para peso corporal.
- `getExerciseSummary`/`getLastExecutionSummary`: histórico ausente, dados insuficientes,
  tendências up/flat.
- `getRecentRecords`: prioridade de tipo (primeira-vez > peso > volume > reps), limite.
- `getTopGrowthExercises`/`getStagnantExercises`: exigência de sessões mínimas, ordenação.
- `getProfileRecordStats`: contagem total, maior carga global, sequência de melhorias (com
  reset), histórico vazio graciosamente zerado.
- `backup.test.ts`: round-trip export→reset→import preservando os novos campos opcionais, e
  compatibilidade com uma entrada de histórico no formato antigo (sem os novos campos).

## 8. QA

Sessão real no dev server (Playwright + msedge para screenshots, `docs/screenshots/sprint12/`):
- Treino "Peito & Tríceps": Crucifixo com carga acima do recorde anterior (PR de peso) e Supino
  Reto sem histórico prévio (primeira execução) — ambos detectados corretamente.
- Resumo do treino: "🎯 1 recorde pessoal!" e XP (+110, breakdown 50 base + 10 séries + 50 PR)
  **idênticos** ao formato/valores que o detector estreito já produzia antes desta sprint.
- Ao confirmar: level-up disparado, badge "Recorde Pessoal" desbloqueada (lógica existente,
  intocada), e dois novos toasts "🏆 Novo Recorde!" (Crucifixo — Novo peso máximo; Supino Reto —
  Primeira vez!) registrados em `Recompensas recentes` no Perfil.
- Dashboard: card "Últimos Recordes" populado corretamente entre badges recentes e próximo
  marco.
- Perfil: nova seção "Recordes" — 2 total, 50kg maior carga (Crucifixo), sequência de 1.
- Insights: "Evolução por exercício" (Em alta / Estagnados) e "Recordes pessoais" enriquecido com
  rótulo de tipo, ambos corretos.
- Histórico anterior à sprint (sem os novos campos) mostrou corretamente "Ainda sem histórico
  suficiente." nas novas seções — confirma compatibilidade sem migração.
- Screenshots desktop (1440px) + mobile (390px) de Dashboard, Perfil e Insights em
  `docs/screenshots/sprint12/`.

## 9. Gates

`npm run lint`, `npx tsc --noEmit`, `npm run test` (95/95), `npm run build` — todos limpos.

## 10. Pendências / próximos passos

- Commit, deploy e validação em produção **não foram feitos** — aguardando confirmação explícita
  do usuário antes de `git push`/deploy na Vercel.
- Gráficos de volume/1RM ao longo do tempo ficaram preparados nos dados (`volumeKg` por ponto em
  `topExerciseLoads`) mas não implementados nesta sprint, por estarem fora do escopo pedido
  ("não é necessário criar gráficos nesta sprint").
