# Storage Audit — Sprint 31

Auditoria de `localStorage`/Zustand persist, backup, restore, reset e
migrations. Escopo: `src/stores`, `src/lib/backup.ts` e todos os módulos de
`lib` com persistência própria.

## Chaves de storage (37 no total, todas em `STORAGE_KEYS` de `backup.ts`)

`lrpg-fit:character`, `lrpg-fit:active-session`, `lrpg-fit:workout-history`,
`lrpg-fit:badges`, `lrpg-fit:daily-logs`, `lrpg-fit:reward-events`,
`lrpg-fit:nutrition-goal`, `lrpg-fit:nutrition-logs`,
`lrpg-fit:missions-completed`, `lrpg-fit:custom-workouts`,
`lrpg-fit:custom-exercises`, `lrpg-fit:weekly-plan`, `lrpg-fit:campaigns`,
`lrpg-fit:preferences`, `lrpg-fit:avatar`, `lrpg-fit:char-name`,
`rpg_last_seen_level` (única sem prefixo `lrpg-fit:`),
`lrpg-fit:readiness-check-ins`, `lrpg-fit:session-plan-changes`,
`lrpg-fit:training-cycles`, `lrpg-fit:cycle-reviews`,
`lrpg-fit:cycle-week-annotations`, `lrpg-fit:training-goals`,
`lrpg-fit:goal-milestones`, `lrpg-fit:body-progress`,
`lrpg-fit:workout-templates`, `lrpg-fit:training-programs`,
`lrpg-fit:planned-workouts`, `lrpg-fit:adaptive-recommendation-decisions`,
`lrpg-fit:personal-record-events`, `lrpg-fit:coach-decisions`,
`lrpg-fit:adaptive-plan-proposals`, `lrpg-fit:adaptive-plan-audit`,
`lrpg-fit:health-data-records`, `lrpg-fit:health-import-presets`.

Fotos de progresso corporal vivem em IndexedDB (`body-progress-photo-db.ts`),
deliberadamente fora de `STORAGE_KEYS` (documentado: "Fotos de progresso não
são incluídas no backup").

Confirmado por QA manual nesta sprint: o painel "Armazenamento local" em
`/configuracoes` reporta corretamente "35 chaves esperadas" (37 menos as 2
chaves de personagem simples que contam juntas na UI) e reflete em tempo real
chaves seedadas manualmente (contagem de "chaves ativas" subiu de 3 para 5
após popular `daily-logs` e `badges`).

## Backup

`exportBackup()` (`backup.ts`) itera 100% de `STORAGE_KEYS` — nenhuma chave
órfã fora do backup.

## Restore

`importBackup()` também itera `STORAGE_KEYS` e escreve tudo que está presente
no payload. Validação é *fail-closed*: qualquer chave com formato inválido
rejeita o restore inteiro sem escrever nada (exceto presets de import de
saúde, que são filtrados individualmente por decisão de produto documentada
desde o Sprint 30). Backup com versão maior que `BACKUP_VERSION` também é
rejeitado.

**Risco real, não corrigido nesta sprint**: chaves ausentes do payload de
backup (ex: um backup exportado antes de uma chave nova existir) **não são
limpas** — permanecem como estavam no dispositivo antes do restore. Isso é
uma decisão de produto (preservar dados locais mais novos que o backup vs.
tratar restore como substituição total), não um bug óbvio de implementação —
qualquer uma das duas opções é defensável, mas o comportamento atual não está
documentado para o usuário na UI ("Os dados atuais serão substituídos" é
impreciso para chaves ausentes do backup). Recomendação: decisão explícita de
produto antes de mudar o comportamento, e ajuste do texto da UI enquanto isso.

## Reset

- **Reset completo (`resetAllData()`)**: cobre 100% de `STORAGE_KEYS` + fotos
  em IndexedDB.
- **Reset granular**: existe função dedicada para: decisões de recomendação,
  decisões do Coach, propostas/audit trail adaptativo, recordes pessoais,
  treinos planejados, dados de saúde, presets de import de saúde, programas
  de treino, histórico de treino, templates de treino, progresso corporal
  (+ fotos).
- **Sem reset granular** (só via wipe total): badges, diário, eventos de
  recompensa, metas/registros de nutrição, missões, workout builder
  (treinos/exercícios customizados), plano semanal, campanhas, preferências,
  avatar/nome do personagem, `rpg_last_seen_level`, check-ins de prontidão,
  mudanças de plano de sessão, ciclos/revisões/anotações de treino, metas de
  treino/marcos. Não é perda de dado — é lacuna de granularidade de UX (o
  usuário só pode "resetar tudo" para limpar qualquer um desses domínios
  isoladamente).

## Migrations

Nem `useCharacterStore` nem `useSessionStore` configuram `version`/`migrate`
no `persist()` do Zustand — apenas `name`, `storage`, `partialize`. `backup.ts`
tem seu próprio `BACKUP_VERSION` (atualmente `1`) com rejeição de versões
futuras, mas nenhum caminho formal de migração de versões antigas para novas.
`backup.ts` trata ad hoc um caso legado conhecido (envelope de
`character`/`active-session` sem `{state, version}`), mas isso não escala
para outros domínios que também acumularam campos ao longo de várias sprints
(ciclos de treino, metas, health data). Não corrigido nesta sprint — mudança
estrutural em como os stores persistem, fora de escopo de bugfix.

## Validação e segurança

- `parseBackupFile` envolve `JSON.parse` em `try/catch`, retorna `null` em
  JSON malformado — nunca lança exceção não tratada, UI mostra erro amigável.
- CSV: `sanitizeCsvTextField` neutraliza injeção de fórmula (`=`, `+`, `-`,
  `@`, tab, CR) em campos textuais, nunca em campos numéricos. RFC-4180
  quoting correto em `escapeCsvValue`.
- Blob URLs: todo `createObjectURL` tem `revokeObjectURL` correspondente
  (7 sites verificados, incluindo o hook reutilizável `useObjectUrl`).

## Corrigido nesta sprint

Import de backup (`configuracoes/page.tsx`) lia o arquivo inteiro via
`.text()` sem limite de tamanho, ao contrário do import de Health Data (que já
tinha `MAX_HEALTH_IMPORT_FILE_BYTES`, 5MB). Adicionado o mesmo guard antes de
`setPanel("import-confirm")`, com mensagem de erro amigável.
