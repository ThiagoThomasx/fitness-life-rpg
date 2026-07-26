# Health Platform Feasibility — Sprint 29 Parte 1

Avaliação técnica de caminhos possíveis para integração futura com fontes nativas de saúde (Android Health Connect, Samsung Health, Apple Health/HealthKit). Nenhuma integração produtiva é implementada nesta sprint — este documento é a base factual para o ADR (`docs/adr/ADR-HEALTH-PLATFORM.md`).

## 1. Estado atual do projeto (auditoria)

- **Stack**: Next.js 14.2.35 (App Router), React 18, TypeScript, Zustand, Tailwind. Deploy web puro (sem `capacitor.config.*`, sem diretórios `android/`/`ios/`).
- **PWA**: já existe e está em produção — `public/manifest.webmanifest`, `public/sw.js` (service worker manual, cache-first para assets/network-first para navegação, página `/offline`). Não usa `next-pwa`/Workbox como dependência.
- **Supabase**: dependências presentes (`@supabase/ssr`, `@supabase/supabase-js`), cliente/middleware/rotas de auth existem em `src/lib/supabase/*` e `src/app/auth/*`, mas **desativado no fluxo ativo** por decisão do CLAUDE.md (schema existe no banco, sem chamadas de rede ativas na experiência do usuário).
- **Armazenamento**: 100% local-first via `localStorage` (Zustand + módulos `src/lib/*`). Health Data (Sprint 28) segue o mesmo padrão — nenhuma sincronização remota.
- **Health Data domain**: `src/lib/health-data/` já é agnóstico de fonte — `HealthDataSource` inclui `health_connect`, `samsung_health`, `apple_health`, `google_fit` apenas como valores de tipo preparados, sem nenhuma integração real (`ACTIVE_HEALTH_DATA_SOURCES` só lista fontes locais/importação).
- **Sem Capacitor, sem wrapper nativo, sem deep links, sem background tasks, sem push.**

## 2. Android Health Connect

- API oficial do Android para agregação de dados de saúde/fitness entre apps, substituindo o Google Fit API (suporte ao Google Fit termina no fim de 2026).
- SDK mínimo: Android 8 (API 26); o app Health Connect propriamente dito requer Android 9+ (API 28+); a partir do Android 14 (API 34), Health Connect passa a fazer parte do framework do sistema.
- Fluxo de permissão é granular por tipo de dado (passos, sono, FC, etc.), com número limitado de solicitações automáticas — depois disso o usuário precisa conceder manualmente pelo app Health Connect.
- Sincronização em segundo plano existe (toggle de "background sync" no próprio Health Connect), mas depende do app ser um app Android instalado (não um site/PWA).
- **Impossível de acessar diretamente do navegador.** Não existe API Web para Health Connect — é uma API nativa Android (Kotlin/Java), exposta via SDK nativo.
- Acesso via Capacitor é possível através de plugins de terceiros (ex.: `Cap-go/capacitor-health`, `mley/capacitor-health`) que fazem o bridge para o SDK nativo do Health Connect. Exige empacotar o app como projeto Android (Capacitor/Gradle) e publicá-lo (ou instalar como APK).
- Publicação na Play Store com acesso a Health Connect exige declaração do uso de dados de saúde e justificativa (política de dados sensíveis do Google Play).

## 3. Samsung Health

- Samsung vem consolidando a maior parte do acesso de terceiros através do próprio Health Connect (Samsung Health atua como uma das fontes que alimentam o Health Connect no Android, não como uma API paralela de uso geral).
- SDKs diretos do Samsung Health para terceiros existem mas são mais restritos, historicamente exigindo parceria/aprovação da Samsung para certos escopos, e não têm equivalente web.
- Para o caso de uso deste projeto (dados agregados de sono, passos, FC), o caminho prático é o mesmo do Health Connect — não há vantagem em perseguir uma integração Samsung Health separada.
- **Sem acesso via navegador.** Mesma limitação de exigir app nativo Android.

## 4. Apple Health / HealthKit

- HealthKit é um framework nativo iOS (Swift/Objective-C) — **não existe nenhuma forma de acessá-lo a partir de um navegador ou PWA**, em nenhuma circunstância. Não há API Web equivalente, nem atalho via Safari.
- Acesso via Capacitor exige plugin nativo (ex.: `perfood/capacitor-healthkit`, `Cap-go/capacitor-health`), entitlement `HealthKit` no app id, chaves `NSHealthShareUsageDescription`/`NSHealthUpdateUsageDescription` no `Info.plist`, fluxo de permissão nativo do iOS (tela de permissão do sistema, por tipo de dado).
- Implica manter uma segunda plataforma de build (Xcode, certificados de desenvolvedor, conta Apple Developer paga) além do Android — custo de manutenção substancialmente maior que Health Connect sozinho.
- **Conclusão prática**: qualquer estratégia que dependa de HealthKit implica abandonar "site único" e assumir dois builds nativos (Android + iOS) com todo o overhead de assinatura, revisão de loja e QA em dispositivo físico.

## 5. PWA (estado atual do projeto)

- Limitações confirmadas: nenhuma API Web padrão expõe dados de saúde do sistema operacional (não existe "Web Health API"). Um PWA instalado ganha ícone, tela cheia e cache offline — nunca acesso a Health Connect/HealthKit.
- Execução em background é limitada (sem long-running background sync garantido em iOS Safari; Android tem suporte parcial via `Periodic Background Sync`, ainda assim sem relação com dados de saúde).
- Armazenamento local (`localStorage`/IndexedDB) já é o que o projeto usa — sem mudança necessária.
- **Vantagem**: zero custo de manutenção adicional, um único deploy, sem loja de aplicativos, sem certificado de assinatura, mantém a filosofia local-first do produto.

## 6. Capacitor

- Compatível com um projeto Next.js existente em modo `output: 'export'` (build estático) ou via `capacitor-community` adapters para SSR — mas o projeto atual não usa export estático (tem rotas dinâmicas `ƒ` como `/exercicios/[id]`, middleware de auth). Adotar Capacitor exigiria decidir entre:
  - migrar para exportação estática (perde middleware/SSR/rotas dinâmicas do App Router como estão hoje), ou
  - manter um backend Next.js remoto e Capacitor como apenas um "WebView" que aponta pra ele (nesse caso, Health Connect/HealthKit não têm como alimentar o app remoto sem um passo de sincronização, quebrando a promessa local-first).
- Plugins de saúde existem e são mantidos por terceiros/comunidade (não oficiais da Anthropic/Google/Apple) — risco de manutenção compartilhado com um pacote fora do controle do projeto.
- Build Android/iOS via Capacitor exige toolchain adicional (Android Studio/Gradle, Xcode), que precisa ser mantida por quem desenvolve o projeto (hoje, uma pessoa).
- Nenhum `capacitor.config.*` existe hoje — adoção começaria do zero.

## 7. Matriz comparativa

| Opção | Viabilidade | Complexidade | Custo de manutenção | Acesso a Health Connect | Acesso a Apple Health | Background sync | Impacto no web app | Risco | Recomendação |
|---|---|---|---|---|---|---|---|---|---|
| **A — Web/PWA somente** | Alta (já existe) | Baixa | Baixo | Não | Não | Não | Nenhum | Baixo | Manter como base |
| **B — Web + importações de arquivo** | Alta (já existe, Sprint 28) | Baixa | Baixo | Indireto (usuário exporta do app do fabricante e importa JSON/CSV) | Indireto (idem) | Não | Nenhum | Baixo | **Recomendada para agora** |
| **C — Next.js empacotado com Capacitor** | Média | Alta | Alto (2 toolchains nativas, loja, assinatura) | Sim, via plugin (Android) | Sim, via plugin (iOS, custo extra) | Parcial (Android) | Alto (rearquitetura de build/deploy) | Alto | Só se houver demanda validada |
| **D — Aplicativo nativo separado** | Média | Muito alta | Muito alto (2 bases de código) | Sim (nativo total) | Sim (nativo total) | Sim | Nenhum no web app, mas duplica produto | Muito alto | Não recomendada |
| **E — Backend de sincronização (hipótese futura)** | Baixa nesta fase | Alta | Alto (infra, custo recorrente, segurança) | Depende de C ou D primeiro | Depende de C ou D primeiro | Sim | Alto (quebra local-first) | Alto | Não avaliar antes de C/D estarem decididos |

## 8. Fatores de decisão além da matriz técnica

- **Mantenedor único**: o projeto é mantido por uma pessoa. Duas toolchains nativas (Android + iOS) multiplicam superfície de manutenção, sem receita ou demanda validada que justifique o custo.
- **Necessidade real do produto**: a experiência de Recovery já é útil com importação manual/arquivo (Sprint 28 + Parte 2/3 desta sprint) — usuários de Health Connect/Apple Health conseguem exportar dados e importar via JSON/CSV hoje.
- **Local-first**: qualquer integração nativa direta (Health Connect/HealthKit) não quebra local-first por si só (dados continuam no dispositivo) — mas Capacitor/app nativo por si só já é uma mudança de arquitetura de entrega, não só de dados.
- **QA em dispositivo**: não há inventário de dispositivos físicos Android/iOS para testes de integração nativa nesta fase.
- **Publicação em loja**: nenhuma conta de desenvolvedor (Google Play/Apple Developer) está configurada hoje — é um passo adicional, com custo e tempo de aprovação.

## 9. Conclusão

A opção **B (Web + importações de arquivo)** é a que já entrega valor real hoje, com o menor custo e risco, e é 100% compatível com a arquitetura atual. A opção **C (Capacitor)** é tecnicamente viável e é o caminho natural se um dia houver decisão de virar app instalável com sync nativo — mas não deve ser adotada "porque é possível": exige decisão explícita de virar produto mobile-primeiro, com toolchain e custo de manutenção que a fase atual do projeto (mantenedor único, foco em redesign visual) não comporta.

Ver decisão formal em [`docs/adr/ADR-HEALTH-PLATFORM.md`](docs/adr/ADR-HEALTH-PLATFORM.md).

## Fontes consultadas

- [Permissions and data access — Health Connect](https://developer.android.com/health-and-fitness/health-connect/ui/permissions)
- [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)
- [Review the platform architecture — Health Connect](https://developer.android.com/health-and-fitness/health-connect/architecture)
- [Get started with Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started)
- [Health Connect — Wikipedia](https://en.wikipedia.org/wiki/Health_Connect)
- [Cap-go/capacitor-health (GitHub)](https://github.com/Cap-go/capacitor-health)
- [mley/capacitor-health (GitHub)](https://github.com/mley/capacitor-health)
- [perfood/capacitor-healthkit (GitHub)](https://github.com/perfood/capacitor-healthkit)
- [dariosalvi78/cordova-plugin-health (GitHub)](https://github.com/dariosalvi78/cordova-plugin-health)
