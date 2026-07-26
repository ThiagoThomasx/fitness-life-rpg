# Health Provider Interface — Sprint 29 Parte 1

Documenta a interface `HealthDataProvider` (`src/lib/health-data/provider.ts`) e a ponte `importFromProvider` (`src/lib/health-data/provider-import.ts`) — o contrato que qualquer fonte externa futura (Health Connect, Samsung Health, Apple Health, Google Fit) deveria implementar, **caso** a decisão registrada em `docs/adr/ADR-HEALTH-PLATFORM.md` seja revisitada no futuro.

Nenhum provider real é implementado nesta sprint. Só existe `MockHealthProvider`, usado exclusivamente para provar a arquitetura.

## Por que existe agora, se não vai ser usado

O objetivo não é adiantar a integração — é garantir que, se ela um dia for necessária, o domínio `health-data` já sabe como recebê-la sem exigir uma reforma estrutural. A regra inegociável (repetida no ADR e no `CLAUDE.md` desta sprint):

> Nenhum provider externo pode se tornar fonte direta de Readiness, Recovery, Fatigue ou Coach.

## A interface

```ts
export interface HealthDataProvider {
  id: string
  name: string
  isAvailable(): Promise<boolean>
  requestPermissions(metrics: HealthMetricType[]): Promise<HealthPermissionResult>
  readRecords(query: HealthProviderQuery): Promise<HealthProviderReadResult>
  revokePermissions?(): Promise<void>
}
```

- **`isAvailable()`** — verifica se o ambiente atual suporta este provider (ex.: um provider Health Connect real retornaria `false` em qualquer navegador puro, só `true` dentro de um wrapper Android nativo).
- **`requestPermissions(metrics)`** — solicita permissão por tipo de dado, retorna o que foi concedido vs. negado. Nunca assume concessão total.
- **`readRecords(query)`** — lê registros de um intervalo (`since`/`until`) para as métricas concedidas. Retorna `NewHealthDataRecordInput[]` — o mesmo formato de entrada usado por entrada manual e importação de arquivo, nunca um formato próprio.
- **`revokePermissions()`** (opcional) — limpa permissões concedidas localmente (não afeta a fonte nativa em si).

## Fluxo — como um provider (real ou mock) alimenta o app

```text
Provider.readRecords()
  → NewHealthDataRecordInput[]
  → buildHealthImportPreview()      (validação, normalização, qualidade, deduplicação — mesma função da importação de arquivo)
  → HealthImportPreview
  → applyHealthImportRecords()      (persistência atômica — mesma função da importação de arquivo)
  → lrpg-fit:health-data-records / lrpg-fit:body-progress
```

`importFromProvider(provider, query)` (`provider-import.ts`) encapsula esse fluxo inteiro. Não existe nenhum caminho alternativo que escreva direto em storage a partir de um provider.

## `MockHealthProvider`

`src/lib/health-data/mock-provider.ts`. Implementa a interface completa com dados sintéticos configuráveis:

- `available` — simula indisponibilidade de plataforma.
- `metricsToGrant` — simula concessão parcial/total de permissão.
- `simulateReadError` — simula falha de leitura do SDK nativo.
- `simulateDuplicateReads` — simula o mesmo dado sendo lido duas vezes (prova que a deduplicação da pipeline existente funciona sem mudança).
- `syntheticValue` — gerador de valor por métrica, para cenários de teste específicos.

Nunca é exposto na UI como uma opção real de importação — existe apenas em `src/lib/health-data/` e é coberto por testes (`mock-provider.test.ts`, `provider-import.test.ts`).

## O que um provider real precisaria (fora de escopo nesta sprint)

- Um wrapper nativo (Capacitor ou app nativo — ver ADR) que exponha o SDK do Health Connect/HealthKit via uma ponte JS.
- Tratamento de erros específicos de plataforma (permissão revogada pelo usuário no meio da sessão, SDK indisponível por versão de OS antiga, etc.) — a interface já modela isso via `ok: false` + `error`.
- Nenhuma mudança em `buildHealthImportPreview`/`applyHealthImportRecords` — a pipeline já está pronta.
