# Sprint 28 Part 4 — Health Data Integration: Readiness, Recovery, Fatigue, Coach, Backup & QA

## 1. Validação do commit da Part 3

Antes de qualquer alteração:

```text
git status                → working tree limpo
git branch --show-current → master
git log --oneline -15     → e3f341c no topo, mensagem conforme esperado
git show --stat e3f341c   → 26 arquivos, escopo 100% Parte 3, nenhum arquivo
                             sensível, nada da Parte 4 misturado
```

Remoto: `origin` correto, branch 13 commits à frente, nada pushado.

Gates reproduzidos: Lint ✅ · Typecheck ✅ · Tests ✅ 1359/1359 · Build ✅.
Nenhuma inconsistência encontrada.

## 2. Auditoria

Consumidores existentes mapeados antes de qualquer edição:

- **`workout-readiness.ts`** (`calculateReadiness`) — score híbrido:
  `subjetivo (check-in) * 0.5 + objetivo * 0.5` (ou só objetivo sem
  check-in), onde objetivo = `recoveryMuscular*0.4 + frequência*0.25 +
  tendência*0.25 + volume*0.1`. Já tinha um padrão de "evidência" reutilizável
  (`ReadinessFactor.explanation` + `impact`).
- **`workout-recovery.ts`** — recuperação por grupo muscular, sempre derivada
  ao vivo do histórico de treino (`hoursSinceTrained / RECOVERY_HOURS`). Sem
  qualquer noção de "hoje" sistêmico antes desta parte.
- **`analytics/fatigue.ts`** — `computeFatigueSignals` cruza prontidão x
  recuperação x tendência de carga em 3 detectores de padrão, todos gated por
  amostra mínima, nunca prescritivos (comentário de design já explícito no
  arquivo: "nunca linguagem médica").
- **`coach/`** — `CoachSignals` (composição única via `buildDashboardAnalytics`),
  `COACH_RULES` (array de `{ id, category, evaluate }`), `priority.ts`
  (`weight`/`sampleSize` → prioridade/confiança determinística), ids
  determinísticos (`ruleId:period:scopeKey`) para dedup automático.
- **`backup.ts`** — `STORAGE_KEYS` (30 chaves), validação estrutural por
  chave antes de qualquer escrita, snapshot + rollback atômico no restore.
  Health Data **não estava em nenhuma das 30 chaves** — ausente de
  export/import/reset até esta parte.
- **Reset granular** — não existe enum central; cada domínio expõe seu
  próprio `reset<Domínio>()`, wireado individualmente na página de
  Configurações. Nenhum `resetHealthData()` existia.

Nenhum destes motores usa Zustand — todos são funções puras sobre
`localStorage`, o mesmo padrão que `health-data/` já segue.

## 3. Estratégia de compatibilidade

Princípio único, testado em cada integração: **zero registros de saúde ⇒
comportamento idêntico ao pré-Sprint-28**. Nenhuma integração:

- altera fórmula de score existente (Readiness, Recovery);
- penaliza ausência de dado;
- substitui input subjetivo;
- persiste sinal derivado (tudo é recalculado sob demanda a partir de
  `health-data/analytics-queries.ts`).

Isso foi verificado com testes que comparam o resultado com e sem Health Data
(ex.: `workout-readiness.test.ts` — mesmo `score`/`level` com e sem contexto
de saúde presente).

## 4. Implementado

### 4.1 Health Context Adapter — `src/lib/health-data/consumer-context.ts`

Única porta de entrada que Readiness/Recovery/Fatigue/Coach usam para
consumir Health Data — nenhum desses motores acessa `aggregation.ts`,
`conflicts.ts`, `baseline.ts` ou `trends.ts` diretamente.

- `HealthMetricSignal` — `value`, `baselineValue`, `delta`, `trend`,
  `quality`, `sampleSize`, `reliable`, `reasons: string[]`.
- `buildHealthContext(date, period, now)` — monta `HealthContext` (sono,
  FC de repouso, passos, atividade) para um dia específico. Gating aplicado
  por sinal: qualidade não-baixa, sem conflito médio/grave naquele dia,
  baseline com amostra mínima, e não-obsoleto (>2 dias de defasagem em
  relação a `now` marca o sinal como não confiável).
- `buildTodayHealthContext(period, now)` — atalho para "hoje", usado por
  Readiness e Recovery; retorna `undefined` quando `hasSufficientData` é
  `false` — é isso que garante o comportamento idêntico sem dados.
- `getRecentConflicts(period, now)` — delega a `analytics-queries.getConflicts`.

Decisão consciente: em vez de inventar um tipo `ReadinessHealthContext`
dedicado (como o brief original sugeria), Readiness/Recovery reexpõem o
mesmo `HealthContext` genérico do adapter. Isso evita duplicar a lógica de
gating em cada consumidor — o `HealthContext` já é o shape estável e
documentado que qualquer um deles precisa.

Testes: `consumer-context.test.ts` (8 casos — vazio, confiável, amostra
insuficiente, conflito, qualidade baixa, obsolescência, delegação de
conflitos).

### 4.2 Readiness — `workout-readiness.ts`

- `WorkoutReadinessResult.healthContext?: HealthContext` — novo campo
  opcional, populado por `buildTodayHealthContext('30d', now)`. Nunca entra
  na fórmula de `computeRawScores`/`computeFinalScore`.
- Testes comprovam: `score`/`level` idênticos com e sem Health Data;
  `healthContext` ausente com amostra insuficiente; presente e `reliable`
  quando há ≥7 dias de sono registrados.

### 4.3 Recovery — `workout-recovery.ts`

- `getRecoveryHealthContext(now)` — contexto sistêmico de "hoje", chamado
  **uma vez por tela**, não por treino/item de lista (evita recomputar
  baseline/tendência N vezes ao rankear vários treinos — ver seção de
  performance abaixo). Não altera `getMuscleRecoveryStates`/
  `getWorkoutRecoveryInfo`.

### 4.4 Fatigue — `analytics/fatigue.ts`

Quatro novos detectores de padrão, mesma convenção dos três já existentes
(gated por amostra, nunca prescritivos, sempre citam número):

| Detector | Condição | Janela |
|---|---|---|
| `health_sleep_deficit` | 3 dias seguidos ≥60min abaixo da baseline de sono | recente: 3d · baseline: 30d |
| `health_resting_hr_elevated` | 3 dias seguidos ≥5bpm acima da baseline de FC repouso | recente: 3d · baseline: 30d |
| `health_high_external_activity` | 3 dias seguidos ≥30% (passos) ou ≥25% (atividade) acima da baseline | recente: 3d · baseline: 30d |
| `health_recovery_mismatch` | carga em alta **+** sono baixo **+** FC elevada simultâneos | combina os 3 acima |

Decisão de correção importante: a baseline de cada detector é calculada com
`now` deslocado `HEALTH_RECENT_WINDOW_DAYS` dias para trás
(`baselineReferenceDate`) — **excluindo** a própria janela recente da
baseline. Sem isso, os dias "recorrentes" inflacionariam a média e
diluiriam o próprio desvio que o padrão tenta detectar (bug real encontrado
e corrigido durante o TDD desta parte, com teste de regressão cobrindo o
caso).

Dias com qualidade baixa ou conflito médio/grave são excluídos da janela
recente inteira (`recentReliableDays`) — não apenas rebaixados. Um único dia
elevado isolado nunca dispara (testado explicitamente).

### 4.5 Coach — `coach/rules.ts` + `coach/explanations.ts`

Quatro novas regras, reaproveitando os padrões já detectados por
`analytics/fatigue.ts` (mesma convenção de `Coach.Recovery.HighLoadLowReadiness`):

- `Coach.Health.SleepDeficit`
- `Coach.Health.RestingHrElevated`
- `Coach.Health.HighExternalActivity`
- `Coach.Health.RecoveryMismatch`

Nenhuma regra acessa `health-data/` diretamente — todas leem
`signals.recovery.patterns` (já populado via `computeFatigueSignals` dentro
de `buildDashboardAnalytics`). Decisão consciente: não foi adicionado um
campo `CoachSignals.healthData` dedicado (sugerido no brief original) — os
padrões já chegam prontos em `signals.recovery.patterns`, e introduzir um
segundo canal para o mesmo dado duplicaria qualidade/amostra/conflito já
resolvidos na origem.

Linguagem sempre factual, nunca diagnóstica ("frequência cardíaca de
repouso ficou acima da linha de base", nunca "seu coração está
sobrecarregado"). Disclaimer discreto ("informativo, não substitui avaliação
profissional") exibido ao expandir qualquer recomendação `Coach.Health.*`.

### 4.6 Backup, restore, reset

- `backup.ts`: `'lrpg-fit:health-data-records'` adicionada a `STORAGE_KEYS`
  e `ARRAY_KEYS`. `BACKUP_VERSION` **não foi incrementada** — a chave é
  tratada como qualquer chave ausente já era (backups antigos restauram
  normalmente, a chave nova fica `skippedKeys`, sem erro).
- `health-data/storage.ts`: `resetHealthData()` — remove só
  `HEALTH_DATA_RECORDS_KEY`. Nunca toca treinos, Readiness subjetivo ou
  Body Progress (peso nunca é duplicado em Health Data — sempre lido sob
  demanda de `lrpg-fit:body-progress`). Nenhum cache derivado existe para
  invalidar (summaries/baselines/tendências/conflitos são sempre recalculados).
- UI: `HealthDataResetSection.tsx` + wiring em
  `app/(dashboard)/configuracoes/page.tsx`, seguindo exatamente o padrão de
  confirmação por texto ("resetar") das seções de reset já existentes.

### 4.7 UI mínima

- `ReadinessCard.tsx` — seção "Dados objetivos" (sono, FC de repouso vs.
  baseline), só renderizada quando o sinal correspondente é `reliable`.
- `CoachRecommendationCard.tsx` — badge "Baseado em dados de saúde" e
  disclaimer quando `ruleId` começa com `Coach.Health.`.

## 5. Decisões arquiteturais

- **Sem dependência estrutural**: todo campo novo é opcional
  (`healthContext?`), toda função de contexto retorna `undefined` sob
  amostra insuficiente — nunca lança, nunca degrada o caminho sem dados.
- **Thresholds documentados** (não validados com dado real do produto, como
  o brief pediu para deixar explícito): sono 60min, FC repouso 5bpm, passos
  30%, atividade 25%, sempre sobre 3 dias consecutivos.
- **Quality/conflict gating**: aplicado na origem (adapter e detectores de
  fatigue), não em cada consumidor — um consumidor nunca decide sozinho se
  um dado é confiável.
- **Sample size**: reaproveita o `sampleSize`/`weight` → `priority.ts`
  existente do Coach (`sampleSize: 3` para os 4 novos achados, mesmo padrão
  de `computeConfidence`).
- **Dados persistidos vs. derivados**: só `HealthDataRecord[]` é persistido
  (já era assim desde a Parte 1). Nada novo desta parte é persistido —
  `HealthContext`, sinais de fadiga e achados do Coach são sempre
  recalculados.

## 6. Testes

| Arquivo | Casos novos |
|---|---|
| `health-data/consumer-context.test.ts` | 8 |
| `workout-readiness.test.ts` | 3 |
| `workout-recovery.test.ts` | 2 |
| `analytics/fatigue.test.ts` | 6 |
| `coach/rules.test.ts` | 8 |
| `backup.test.ts` | 5 |
| `health-data/storage.test.ts` | 2 |

Total: 34 testes novos. **1393/1393** no total (1359 + 34), zero regressões.

## 7. QA manual

Executado no navegador real (`npm run dev`, seed padrão do projeto):

- `/configuracoes` — seção "🩺 Apagar Dados de saúde" renderiza com a cópia
  correta; fluxo de confirmação (`digite "resetar"` → habilita botão →
  cancelar) testado por interação real; `lrpg-fit:health-data-records`
  aparece corretamente em "Armazenamento local".
- `/sessao` — check-in de prontidão completo, card de resultado renderiza
  `PRONTIDÃO ALTA` normalmente, **sem** a seção "Dados objetivos" (seed do
  projeto não tem 7+ dias de sono/FC) — confirma a degradação graciosa sem
  erro de console.

Não executado nesta parte (limitação de tempo, não de escopo): fluxo
completo de 14 dias de sono via UI real, teste em breakpoints móveis
(320-768px), leitor de tela. Ver seção 9.

## 8. Gates finais

```text
Lint:      ✅ sem warnings
Typecheck: ✅ sem erros
Tests:     ✅ 1393/1393 (108 arquivos)
Build:     ✅ 21 rotas geradas
```

## 9. Pendências conhecidas

- QA manual dos fluxos completos de 14 dias (sono/FC/atividade) via UI real
  não foi executado — coberto por testes automatizados equivalentes, mas não
  por interação manual no navegador.
- Sem cobertura de breakpoints móveis (320/375/768) nem leitor de tela para
  os componentes novos (`HealthDataResetSection`, seção "Dados objetivos" do
  `ReadinessCard`, badge do Coach) — os componentes reutilizam classes/padrões
  já testados em partes anteriores, mas não foram auditados de novo aqui.
- `CoachSignals.healthData` dedicado não foi criado (ver decisão na seção
  4.5) — se uma sprint futura precisar expor sinais de saúde a um consumidor
  fora do pipeline de fadiga, vale revisitar essa decisão.
- Performance: `getMetricBaseline`/`getMetricTrend` recomputam
  `getAllHealthRecords()` a cada chamada (eram assim desde a Parte 3); os
  4 novos detectores de fadiga fazem ~8 chamadas por execução de
  `computeFatigueSignals`. Aceitável no volume atual (uso pessoal, poucos
  registros/dia), mas não teria uma query única por período como o ideal —
  não foi otimizado nesta parte para não expandir escopo além do pedido.

## 10. Próximo passo recomendado

Duas opções levantadas no brief original:

- **Sprint 29 — Health Connect / Samsung Health Integration**: só faz
  sentido depois que os sinais locais (Parte 4) tiverem sido usados de
  verdade por um tempo — ainda não há evidência de que os thresholds atuais
  (60min sono, 5bpm FC, 30%/25% atividade) sejam os certos para o produto.
- **Sprint 29 — Health Analytics & Recovery Expansion**: expandir o que já
  existe (mais métricas no Coach, UI de análise mais rica) sem depender de
  integração externa nenhuma.

Recomendação: a segunda opção primeiro — validar se os 4 sinais objetivos
atuais geram valor percebido antes de investir em integração com
plataformas externas (Health Connect etc.), que é trabalho substancialmente
maior (permissões nativas, sync em background, mapeamento de unidades por
plataforma).
