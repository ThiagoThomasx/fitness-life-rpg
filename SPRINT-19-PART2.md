# Sprint 19 (v2) — Private Progress Photos, IndexedDB & Local Data Safety (parte 2)

Data: 2026-07-18

## Escopo

A especificação original desta sprint tinha 41 fases (fotos + IndexedDB + galeria + comparação + exportação ZIP completa + UI de "espaço usado" + matriz completa de testes e QA visual em 20+ estados). Seguindo o mesmo padrão das Sprints 17/18/19 (parte 1) e a regra do `CLAUDE.md` de manter tarefas granulares, o escopo foi reduzido e as decisões de arquitetura confirmadas com o usuário (via `AskUserQuestion` em modo de planejamento) antes de implementar.

**Incluído:**
- Modelo de foto + IndexedDB (`body-progress-photo*.ts`)
- Validação e processamento de imagem (Canvas API nativa, sem dependência nova)
- Vínculo com `BodyProgressEntry` (`photoIds?: string[]`, opcional/aditivo)
- Upload/preview no formulário de registro corporal (modo edição)
- Aviso de privacidade único
- Galeria por registro, modal de detalhe, modal de comparação lado a lado
- Exclusão com confirmação + reset granular (só fotos)
- Backup com aviso de que blobs não estão incluídos
- Testes unitários + QA visual desktop/mobile

**Deixado fora deste corte** (candidato a Sprint 19.3):
- Exportação/importação ZIP completa com blobs
- UI de "espaço aproximado usado" (MB)
- Reconhecimento de pose, análise corporal, filtros, alinhamento automático — nunca farão parte de nenhuma sub-sprint desta feature (proibido pelo escopo original)

## Auditoria (Fase 1 da especificação original)

Executada via agente de exploração antes de qualquer código. Principais achados:

1. **Nenhum uso de IndexedDB no projeto** — zero ocorrências de `indexedDB`/`IDBDatabase` em `src`, confirmado também pelo `SPRINT-19-v2.md` da parte 1. Toda persistência é `localStorage`.
2. **Sem wrapper reutilizável de IndexedDB** — construído do zero.
3. **`BodyProgressEntry`** (`src/lib/body-progress.ts:33-44`) não tinha campo de fotos — adicionado `photoIds?: string[]` opcional/aditivo, sem migração (registros antigos continuam válidos).
4. **`backup.ts` é JSON-only** — `STORAGE_KEYS`/`ARRAY_KEYS`/`OBJECT_KEYS` orientam validação estrutural; `exportBackup`/`downloadBackup`/`resetAllData` eram síncronos.
5. **`resetAllData()` era tudo-ou-nada** — sem reset granular por domínio.
6. Padrões reutilizados sem modificação: `ModalShell`/`ConfirmDialog` (`src/components/ui/`), padrão de seção recolhível do `BodyProgressForm` ("Medidas (opcional)"), padrão de flag booleana persistida do `preferences.ts` (`favoriteMeasurements`), padrão de reset com confirmação por digitação do `DataResetSection.tsx`.
7. **Sem Playwright configurado** — QA visual usou o workaround já documentado no projeto (`npm i --no-save playwright` + `chromium.launch({ channel: "msedge" })`, já que o Chrome não está instalado nesta máquina, apenas o Edge).
8. **Vitest/jsdom não implementa IndexedDB nativamente** — exigiu `fake-indexeddb` como devDependency + `setupFiles` em `vitest.config.ts`.
9. **Sem CSP configurado** (`next.config.mjs` vazio) — URLs `blob:` funcionam sem ajuste de configuração.

## Decisões Arquiteturais

Confirmadas com o usuário via `AskUserQuestion`, no mesmo padrão da parte 1, antes de qualquer implementação:

### Escopo reduzido, ZIP adiado

Fases 32-33 (exportação/importação ZIP completa com blobs) e Fase 34 (UI de espaço usado em MB) foram adiadas para uma Sprint 19.3, documentadas aqui em vez de implementadas — evita misturar uma dependência nova (`jszip`) e uma superfície de risco maior (parsing de manifesto, conflitos de importação) na mesma leva que a infraestrutura básica de fotos.

### Foto pertence a um único registro (Opção A)

Cada `BodyProgressPhoto` tem exatamente um `entryId` dono — sem contagem de referências, sem reuso entre registros. Mais simples de implementar e testar; não havia necessidade real de compartilhamento, já que fotos são uma feature nova. Ao excluir um registro, o usuário decide (via `deleteEntryAndPhotos(entryId, deletePhotos)`) se as fotos vinculadas também são excluídas ou ficam órfãs (limpáveis depois via `cleanupOrphanPhotos`).

### Compressão via Canvas API nativa, sem dependência nova

`body-progress-photo-processing.ts` usa `createImageBitmap`/`<canvas>`/`toBlob()` para decodificar, redimensionar (máx. 1600px na imagem principal, 320px na miniatura) e comprimir (JPEG qualidade 0.82 por padrão). PNG só é preservado como saída se o arquivo original já era PNG — todo o resto normaliza para JPEG, regra determinística e documentada em comentário, sem heurística de detecção de transparência (evita complexidade prematura).

### IndexedDB nunca lança, sempre retorna um resultado neutro

`body-progress-photo-db.ts` verifica `isIndexedDBAvailable()` no topo de toda função exportada; quando indisponível, mutadores retornam `{ ok: false, error: 'indexeddb-unavailable' }` e leituras retornam `[]`/`0`/`not-found` em vez de lançar. `QuotaExceededError` é tratado especificamente em `savePhoto`/`updatePhotoMetadata`. Toda conexão aberta é fechada em um `finally` (via helper `withTransaction`) — inclusive quando a transação falha, evitando handles pendurados que bloqueariam `deleteDatabase` em outra aba ou no próximo teste.

### Referência quebrada nunca quebra a tela

`resolveEntryPhotos`/`getPhotoMetadata` retornam `metadata: null` para um `photoId` presente em `entry.photoIds` mas ausente do IndexedDB (ex.: limpeza parcial, modo privado, backup restaurado em outro dispositivo). A UI (`PhotoDetailModal`) mostra um estado "Foto indisponível" com opção de remover a referência, nunca um crash.

### Backup nunca inclui blobs

`BackupPayload.media.bodyPhotosIncluded` é um literal `false` (não `boolean`) — comunica que este formato de backup **nunca** vai incluir imagens, não é uma opção configurável. Apenas a contagem (`bodyPhotoCount`, via `countPhotos()`) é exportada. `exportBackup`/`downloadBackup`/`resetAllData` tornaram-se assíncronos para compor com o IndexedDB — ripple mínimo, únicos consumidores eram `configuracoes/page.tsx` e `backup.test.ts`.

## Arquivos Criados

- `src/lib/body-progress-photo.ts` — modelo, config padrão, labels de categoria
- `src/lib/body-progress-photo-db.ts` — wrapper IndexedDB
- `src/lib/body-progress-photo-db.test.ts` — 18 testes
- `src/lib/body-progress-photo-validation.ts` — validação de arquivo
- `src/lib/body-progress-photo-validation.test.ts` — 10 testes
- `src/lib/body-progress-photo-processing.ts` — decodificação/redimensionamento/compressão via canvas
- `src/lib/body-progress-photo-processing.test.ts` — 10 testes
- `src/lib/body-progress-photo-link.ts` — vínculo entry↔foto, exclusão em cascata, reset granular
- `src/lib/body-progress-photo-link.test.ts` — 11 testes
- `src/lib/body-progress-photo-errors.ts` — mensagens de erro em pt-BR para a UI
- `src/test/setup-indexeddb.ts` — polyfill `fake-indexeddb/auto` para Vitest
- `src/hooks/useObjectUrl.ts` — cria/revoga URLs de objeto para blobs
- `src/components/profile/PhotoPrivacyNotice.tsx`
- `src/components/profile/PhotoThumbnailImg.tsx` — carrega blob (miniatura ou completo) com placeholder para referência quebrada
- `src/components/profile/BodyProgressPhotoSection.tsx` — upload/preview no formulário
- `src/components/profile/BodyProgressPhotoGallery.tsx`
- `src/components/profile/PhotoDetailModal.tsx`
- `src/components/profile/PhotoComparisonModal.tsx`
- `src/components/settings/PhotoResetSection.tsx`

## Arquivos Alterados

- `src/lib/body-progress.ts` — `photoIds?: string[]` opcional em `BodyProgressEntry`, `isValidEntry` estendido, `updateBodyProgressEntry` aceita `photoIds` no patch
- `src/lib/body-progress.test.ts` — 4 testes novos (round-trip, rejeição de não-string, import legado/novo)
- `src/lib/preferences.ts` — `bodyPhotosPrivacyAcknowledged?: boolean` + getter/setter
- `src/lib/backup.ts` — `BackupPayload.media`, `exportBackup`/`downloadBackup`/`resetAllData` assíncronos, `resetAllData` também limpa fotos
- `src/lib/backup.test.ts` — todos os testes convertidos para `async`/`await`; 1 teste novo para `media`
- `src/components/profile/BodyProgressForm.tsx` — seção recolhível "Fotos de progresso (opcional)", só habilitada em modo edição
- `src/components/profile/BodyProgressSection.tsx` — galeria por registro, modal de detalhe, botão/modal de comparação; `handleCancelEdit` agora recarrega a lista (correção de bug, ver QA)
- `src/components/settings/BackupExportSection.tsx` — aviso de que fotos não entram no backup
- `src/app/(dashboard)/configuracoes/page.tsx` — `handleExport`/`handleResetConfirm` assíncronos, `PhotoResetSection` + `handlePhotoResetConfirm`
- `vitest.config.ts` — `test.setupFiles`
- `package.json`/`package-lock.json` — `fake-indexeddb` como devDependency

## Testes

53 testes novos, 564/564 no total do projeto (era 511/511 ao final da Parte 1). Cobertura inclui: abertura/upgrade do IndexedDB e criação dos 3 índices, round-trip de blob, listagem por índice, atualização de metadados, exclusão simples/múltipla sem lançar em id ausente, detecção e limpeza de fotos órfãs, simulação de `QuotaExceededError`, fallback de IndexedDB indisponível; validação de arquivo (MIME/tamanho/vazio/limite por registro/dimensões); processamento de imagem (redimensionamento proporcional sem upscale, preservação condicional de PNG, falha de decodificação); vínculo entry↔foto (referência quebrada, `photoIds` ausente/duplicado, exclusão em cascata vs. não-cascata); `photoIds` no modelo de registro corporal (round-trip, rejeição, compatibilidade com registros/backups legados); `media` no backup.

**Riscos técnicos resolvidos durante a implementação** (não assumidos como triviais):
- jsdom + `fake-indexeddb` usam o `structuredClone` nativo do Node para clonar valores gravados; o `Blob` do jsdom não é reconhecido por ele (perde os bytes silenciosamente) — testes de IndexedDB usam `Blob` de `node:buffer` em vez do `Blob` global do ambiente de teste. Não afeta produção (navegadores reais não têm esse gap).
- Vazamento de conexão IndexedDB quando uma transação falha (`put()` lançando `QuotaExceededError`) sem passar pelo `db.close()` — corrigido com um helper `withTransaction` que sempre fecha a conexão em `finally`, evitando que `deleteDatabase` trave em testes subsequentes.
- Mock de `<canvas>` em jsdom (que não renderiza de verdade) via `HTMLCanvasElement.prototype.getContext`/`toBlob` e `createImageBitmap` — necessário para testar `processPhotoFile` sem depender de um navegador real.

## QA

QA visual (desktop 1280×900 + mobile 375×812) via Playwright com Microsoft Edge (`chromium.launch({ channel: "msedge" })`, seguindo o workaround já documentado no projeto — o Browser pane trava em `screenshot`/`zoom` neste ambiente). Fluxo real executado no dev server (`fitness-rpg` launch config):

- Estado vazio → criar 2 registros corporais (01/08 e 15/08) → editar o primeiro → expandir "Fotos de progresso" → selecionar arquivo → aviso de privacidade (primeira vez) → confirmar → foto processada e salva → aparece no formulário
- Editar o segundo registro → adicionar foto (sem aviso de privacidade, já confirmado) → cancelar edição
- Histórico mostra galeria de miniaturas em ambos os registros, botão "Comparar fotos" aparece (2+ registros com foto)
- Abrir modal de detalhe de uma foto → categoria editável → botão excluir → confirmação de exclusão → voltar → fechar
- Abrir comparação → seletores de data (foto inicial/atual) → duas fotos lado a lado com data abaixo de cada uma
- Repetido em viewport mobile (375×812): galeria, modal de detalhe, comparação (empilhada em vez de 2 colunas)
- Screenshots salvos em `docs/screenshots/sprint19-part2/` (11 arquivos: `01`–`11`, prefixo `desktop`/`mobile`)

**Bug real encontrado durante este QA e corrigido antes de finalizar**: `BodyProgressSection`'s `onCancel` (ao cancelar a edição de um registro) não chamava `load()` — como fotos são persistidas diretamente (`linkPhotoToEntry`) independente do botão "Salvar alterações", cancelar a edição deixava a lista de registros em memória desatualizada, e a galeria não aparecia até um reload manual da página. Corrigido chamando `load()` também no cancelamento (`handleCancelEdit`).

## Gates

- `npm run test` — 564/564 ✅
- `npm run lint` — limpo ✅ (1 warning de `@next/next/no-img-element` corrigido reposicionando o comentário `eslint-disable-next-line` para a linha correta)
- `npx tsc --noEmit` — limpo ✅
- `npm run build` — limpo ✅

## Não Regressão

Registros corporais, peso, medidas, tendências, bem-estar, ciclos, metas, Dashboard, Insights e Perfil da Parte 1 continuam funcionando sem alteração. Backup antigo (sem `media`) importa normalmente — `media` é um campo opcional só de exportação, `importBackup` nunca dependeu dele. Reset antigo ("Resetar todos os dados") continua limpando tudo, agora incluindo fotos também. Nenhuma foto é enviada a servidor, nenhuma é analisada, nenhuma fica em `localStorage`, nenhuma URL `blob:` permanece ativa após desmontagem (revogada via `useObjectUrl`), nenhuma exclusão remove dado não relacionado (confirmado nos testes de `deleteEntryAndPhotos` cascata vs. não-cascata).

## Limitações Conhecidas

- Exportação/importação ZIP completa com blobs não implementada — adiada para Sprint 19.3, junto com a UI de "espaço usado em MB".
- `capture="environment"` (câmera direta em mobile) não adicionado ao `<input type="file">` — fora do escopo reduzido confirmado com o usuário; o input de arquivo padrão já permite selecionar/tirar foto conforme o sistema operacional do usuário.
- Sem componente de teste para React neste projeto (convenção já existente, confirmada antes de implementar) — cobertura desta sprint é toda em módulos `lib/*`, QA visual cobre a camada de UI.
- Correção EXIF de orientação depende do comportamento nativo do navegador via `createImageBitmap`/`<img>` — não há normalização manual adicional; não testado com fotos reais de celular nesta sessão (sem dispositivo físico disponível no ambiente de QA).

## Status do Git

Nada commitado ao final desta sessão — aguardando aprovação do usuário, seguindo o mesmo padrão das Sprints 17/17.1/18/19 (parte 1). Nenhum push ao remoto foi realizado.
