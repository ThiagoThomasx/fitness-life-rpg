# ADR — Plataforma para integrações de saúde nativas

- **Status**: Aceito
- **Data**: 2026-07-26 (Sprint 29 Parte 1)
- **Documento de apoio**: [`HEALTH-PLATFORM-FEASIBILITY.md`](../../HEALTH-PLATFORM-FEASIBILITY.md)

## Contexto

O Fitness Life RPG possui, desde a Sprint 28, uma camada local-first e agnóstica de fonte para dados de saúde (`src/lib/health-data/`), alimentada hoje por entrada manual e importação de arquivos JSON/CSV. O tipo `HealthDataSource` já reserva valores para `health_connect`, `samsung_health`, `apple_health` e `google_fit`, mas nenhuma integração real existe.

A Sprint 29 precisa responder, antes de qualquer código de integração nativa: o produto continua como web app, vira app Android empacotado, ou usa importação de arquivos como estratégia principal? Essa decisão não pode ser assumida implicitamente — teria custo alto de reverter.

## Opções consideradas

Ver matriz completa em `HEALTH-PLATFORM-FEASIBILITY.md`, seção 7. Resumo:

- **A — Web/PWA somente**: sem acesso a Health Connect/HealthKit, custo mínimo.
- **B — Web + importações de arquivo**: mesma limitação de acesso direto, mas cobre o caso de uso via exportação manual do usuário; já implementado desde a Sprint 28.
- **C — Next.js empacotado com Capacitor**: acesso real a Health Connect (Android) e HealthKit (iOS, com custo extra), exige rearquitetura de build/deploy e duas toolchains nativas.
- **D — Aplicativo nativo separado**: acesso nativo total, duplica a base de código do produto.
- **E — Backend de sincronização**: hipótese futura, só faz sentido depois de C ou D estarem decididos; não avaliada em profundidade nesta sprint.

## Critérios de decisão

1. Capacidade de manutenção por uma única pessoa.
2. Complexidade adicional real vs. valor entregue ao usuário hoje.
3. Compatibilidade com o deploy web atual (Next.js App Router, rotas dinâmicas, middleware).
4. Risco de quebrar a garantia local-first (dados nunca saem do dispositivo sem ação explícita do usuário).
5. Disponibilidade de dispositivos físicos para QA de integração nativa.
6. Necessidade de publicação em loja (Google Play / Apple Developer), com custo e tempo de aprovação.

## Decisão

**Manter o produto como web app (PWA já existente), com importação de arquivos como estratégia principal de entrada de dados de fontes externas de saúde — Opção B.**

Não adotar Capacitor nem qualquer wrapper nativo nesta fase. Não iniciar integração produtiva com Health Connect, Samsung Health ou Apple Health.

Justificativa:

- A opção B já entrega o valor central pedido pelo usuário (entender sono, FC de repouso, atividade, e a relação com treino) sem exigir nenhuma mudança de arquitetura, toolchain ou modelo de distribuição.
- O projeto é mantido por uma pessoa; Capacitor (Opção C) introduziria duas toolchains nativas (Android + iOS) e o processo de publicação em loja, que não têm demanda validada hoje.
- Capacitor não deve ser escolhido "porque torna a integração possível" — é uma mudança de plataforma de entrega, não apenas de fonte de dados, e deve ser motivada por necessidade real de produto, não por conveniência técnica.
- A arquitetura de domínio (`health-data/`) já foi desenhada para tornar essa decisão reversível: qualquer fonte futura (nativa ou não) entra pela mesma pipeline (`provider → validação → normalização → deduplicação → persistência local`), então adiar a integração nativa não gera dívida técnica — só adia o trabalho de escrever o adapter em si.

## Consequências

- A experiência de Recovery (Sprint 29 Partes 2-3) deve continuar útil e completa apenas com dados manuais/importados — sem qualquer dependência de integração nativa futura.
- `HealthDataProvider` (interface, ver `HEALTH-PROVIDER-INTERFACE.md`) é documentada e, opcionalmente, prototipada com um `MockHealthProvider` nesta sprint — mas nenhum provider real é implementado.
- Nenhum provider (real ou mock) pode alimentar diretamente Readiness, Recovery, Fatigue ou Coach — todos passam pela pipeline de validação/normalização/deduplicação/persistência local já existente, exatamente como entrada manual e importação de arquivo hoje.
- Se o produto futuramente decidir virar um app Android/iOS empacotado (mudança de posicionamento de produto, não só técnica), esta ADR deve ser revisitada e uma nova ADR deve substituí-la — não deve ser reaberta informalmente dentro desta fase.

## Plano incremental (fora de escopo nesta sprint, registrado para o futuro)

1. Validar demanda real de usuários por sincronização automática (não assumir).
2. Se validada: prototipar Capacitor isolado (branch separada), com `HealthDataProvider` real para Health Connect, sem tocar no domínio existente.
3. Avaliar custo de conta de desenvolvedor Google Play antes de qualquer publicação.
4. Apple Health/iOS só entraria em uma fase posterior, com decisão própria sobre custo de manter conta Apple Developer e toolchain Xcode.
5. Backend de sincronização (Opção E) só é avaliado se C ou D forem adotados e exigirem sync entre dispositivos.

## Condições para reavaliar esta decisão

- Usuários pedindo explicitamente sincronização automática, de forma recorrente e não pontual.
- Disponibilidade de tempo/recurso para manter duas toolchains nativas.
- Decisão consciente de mudar o posicionamento do produto de "web app local-first" para "app mobile instalável".

## Riscos aceitos

- Usuários de Health Connect/Apple Health precisam exportar e importar manualmente (fricção maior que sync automático) — aceito, mitigado pela UX de importação já construída na Sprint 28 (prévia obrigatória, deduplicação idempotente).
- Fontes de plataforma (`health_connect`, `samsung_health`, `apple_health`, `google_fit`) continuam como valores de tipo não utilizados por enquanto — aceito, sem custo de manutenção real (são apenas literais de union type).
