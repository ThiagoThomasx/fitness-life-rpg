# Roadmap de Sprints — Redesign Visual & Navegação

Abordagem: **híbrida**. Mantém toda a lógica e dados da v1 (treinos, XP, atributos, badges, diário, nutrição, backup). Reconstrói apenas navegação e sistema visual, usando paleta do `DESIGN.md` adaptada para fundo escuro.

**Regra de ouro:** nenhuma feature do backlog congelado (seção final deste arquivo) entra em código antes da Sprint 6 ser aceita.

---

## Sprint 1 — Consolidação da Fundação Visual + Navigation Shell ✅
**Objetivo:** consolidar a fundação já existente (tokens, navegação via `AppSidebar`) em um design system aplicável, com Style Guide e Dashboard piloto.
**Critério de aceite:** style guide navegável; navegação tokenizada e acessível; Dashboard piloto usando 100% dos tokens novos; build/lint/typecheck limpos; QA desktop + mobile com screenshots.

> Decisão de navegação **encerrada**: sidebar fixa (desktop) + drawer com overlay (mobile), base `AppSidebar.tsx`. Não reabrir; não recriar BottomNav; não substituir por tab bar.

- [x] Consolidar `src/styles/tokens.css` (paleta chartreuse/deep-forest, tipografia, spacing, radius, sombras, layout, motion) — ver `DESIGN.md`
- [x] Adicionar Fraunces (display) via `next/font`; manter Inter (UI)
- [x] Expandir integração Tailwind com os tokens (`tailwind.config.ts`, via variáveis CSS)
- [x] Criar página `/style-guide` isolada com foundations, componentes e padrões de Dashboard
- [x] Tokenizar navigation shell (`AppSidebar` + `shell.css`): remover inline styles, melhorar acessibilidade (Escape, scroll lock, retorno de foco, aria)
- [x] Reconstruir Dashboard como piloto: componentes extraídos para `src/components/dashboard/`, rota reduzida a dados + composição
- [x] Remover código morto (`BottomNav.tsx`, `TopBar.tsx`)
- [x] Alinhar documentação com o código real (stores, chaves `lrpg-fit:*`, navegação)
- [x] Build, lint e typecheck limpos; QA desktop + mobile com screenshots

## Sprint 2 — Treinos e Sessão Ativa ✅
**Objetivo:** migrar a tela mais usada do app para o novo sistema visual.
**Duração estimada:** 3–4 dias
**Critério de aceite:** fluxo completo (iniciar → série → finalizar) visualmente consistente com o Dashboard.

- [x] Lista de treinos e templates no novo padrão (seções Meus treinos × Templates, filtros tokenizados, banner de sessão ativa, início rápido com recomendação)
- [x] Sessão ativa (timer, séries) redesenhada (header compacto com progresso, cards de exercício, inputs touch-friendly, ✓ em séries)
- [x] Modal de resultado/XP alinhado ao design system (stats reais, XP em Fraunces, callouts de level-up/PR)
- [x] Histórico de treino e detecção de PR mantidos, só reestilizados (lógica de XP/PR/atributos/badges intocada; guards de idempotência adicionados contra duplo clique)

## Sprint 3 — Perfil (Atributos, Badges) ✅
**Objetivo:** Perfil consistente com Dashboard e Treinos.
**Duração estimada:** 2–3 dias
**Critério de aceite:** Perfil aprovado lado a lado com as duas telas anteriores.

- [x] Header de personagem, atributos e badges no novo padrão (componentes em `src/components/profile/`, estilos em `profile.css`/`progression.css`)
- [x] Remoção de qualquer resquício de estilo antigo (bloco "Legado v1" removido de `components.css`; LevelUpModal/RewardToast tokenizados; verde Spotify zerado no escopo)

## Sprint 4 — Insights
**Objetivo:** corrigir a tela que ficou genérica em dois redesigns anteriores da v1.
**Duração estimada:** 3–4 dias
**Critério de aceite:** gráficos usando os tokens de cor; qualidade de layout equivalente ao Dashboard.

- [ ] Padronizar cores/tipografia nos gráficos Recharts (usar `--color-accent`, `--color-chart-secondary`)
- [ ] Reorganizar cards de insight (volume semanal, evolução de carga, distribuição por categoria, PRs recentes, tags do diário)

## Sprint 5 — Diário e Nutrição
**Objetivo:** últimas duas telas migradas para o novo sistema.
**Duração estimada:** 2–3 dias
**Critério de aceite:** ambas revisadas visualmente, sem CSS legado.

- [ ] Diário no novo padrão (tags automáticas mantidas)
- [ ] Nutrição no novo padrão (metas de macros, logs)

## Sprint 6 — QA Visual Completo + Configurações/Backup + Deploy
**Objetivo:** consolidar tudo, validar cada rota e publicar.
**Duração estimada:** 2–3 dias
**Critério de aceite:** screenshot de cada rota aprovado; build/lint limpos; backup/reset testados e confirmados acessíveis.

- [ ] Página de Configurações/Backup revisada visualmente
- [ ] Checklist de screenshot por rota (ver `QA_CHECKLIST.md`)
- [ ] Deploy na Vercel com release notes

---

## Feature Freeze (vigente até a Sprint 6 aceita)

**Importante:** as features abaixo **já estão implementadas e permanecem no app** — o freeze significa que não recebem expansão funcional nem features novas durante o redesign, apenas ajustes mínimos de compatibilidade visual/estrutural:

- Plano semanal e Campanhas (`/plano`)
- Onboarding / Personalização local (`OnboardingModal`, `/preferencias`)
- PWA / Offline (manifest, service worker)
- Workout Builder (treinos e exercícios customizados, em `/treinos`)
- Recompensas, badges e backup

Nenhuma feature **nova** entra em código antes da Sprint 6 ser aceita. Redesign não implica remoção funcional. Qualquer expansão futura deve virar sua própria sequência de sprints pequenas — não uma sprint única "ampla" (erro recorrente na v1).
