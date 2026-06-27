# Life RPG — Módulo Fit: Checklist de QA

Use esta lista antes de cada deploy ou release. Marque cada item manualmente.

---

## 1. Autenticação / Onboarding

- [ ] Acessar `/` redireciona para `/auth/login`
- [ ] Login local cria personagem e redireciona para `/dashboard`
- [ ] Dados do personagem persistem após recarregar a página

## 2. Dashboard

- [ ] Cards de atributos exibem valores corretos
- [ ] XP bar mostra progresso do nível atual
- [ ] Último treino aparece no card "Último Treino"
- [ ] Missões diárias exibem corretamente
- [ ] Nenhum erro de console visível

## 3. Treinos

- [ ] Lista de treinos carrega
- [ ] Iniciar treino redireciona para `/sessao`
- [ ] Sessão ativa persiste se fechar e reabrir a aba
- [ ] Adicionar exercício funciona
- [ ] Registrar série funciona (peso, reps)
- [ ] Finalizar treino: XP é concedido, histórico salvo
- [ ] PR detection funciona (nova série mais pesada que o histórico)

## 4. Histórico

- [ ] Treinos completados aparecem no histórico
- [ ] Filtros de histórico funcionam
- [ ] Detalhes do treino abrem corretamente

## 5. Diário

- [ ] Criar entrada do diário salva localmente
- [ ] Tags automáticas são geradas
- [ ] XP de diário é concedido uma vez por dia
- [ ] Editar entrada existente funciona

## 6. Nutrição

- [ ] Salvar metas de macros persiste
- [ ] Registrar refeição do dia funciona
- [ ] XP de nutrição é concedido uma vez por dia
- [ ] Streak de dias consecutivos calcula corretamente

## 7. Insights

- [ ] Gráficos renderizam sem erro
- [ ] Evolução de carga por exercício exibe dados do histórico
- [ ] Frequência semanal reflete treinos salvos

## 8. Perfil

- [ ] Atributos exibem valores com barra de progresso
- [ ] Badges ganhas aparecem destacadas
- [ ] Badges não ganhas aparecem esmaecidas
- [ ] Contadores (treinos, diários, PRs) corretos
- [ ] Link "Dados & Backup" navega para `/configuracoes`

## 9. Dados & Backup (`/configuracoes`)

- [ ] Status de armazenamento exibe tamanho e chaves ativas
- [ ] Exportar backup baixa arquivo `.json` válido
- [ ] Importar backup válido restaura dados e exibe mensagem de sucesso
- [ ] Importar arquivo inválido exibe mensagem de erro (sem crashar)
- [ ] Reset: digitando texto errado, o botão "Apagar tudo" fica desabilitado
- [ ] Reset: digitando "resetar" e confirmando, dados são apagados
- [ ] Reset: ao cancelar, nenhum dado é perdido

## 10. Level Up

- [ ] Ao ganhar XP suficiente, modal de Level Up abre
- [ ] Modal exibe o novo nível e atributos ganhos
- [ ] Modal fecha ao clicar em confirmar

## 11. Rewards & Toasts

- [ ] Toast de recompensa aparece ao completar treino
- [ ] Toast de badge aparece ao ganhar nova conquista
- [ ] Toasts desaparecem automaticamente

## 12. Persistência

- [ ] Recarregar página preserva: personagem, sessão ativa, histórico, badges, diário, nutrição
- [ ] Abrir nova aba carrega os mesmos dados

## 13. Mobile / Responsivo

- [ ] BottomNav visível e funcional em telas < 430px
- [ ] Todos os cards e botões acessíveis em mobile
- [ ] Nenhum overflow horizontal
- [ ] Inputs de teclado numérico funcionam em mobile

## 14. Build / Lint / Types

- [ ] `npm run build` completa sem erros
- [ ] `npm run lint` completa sem erros
- [ ] Nenhum `any` não intencional em código novo

## 15. Modo local / mock

- [ ] App funciona sem arquivo `.env.local`
- [ ] App funciona sem conexão com Supabase
- [ ] Dados mock são exibidos quando não há dados reais
