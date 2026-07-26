# Health Data — Manual Entry (Sprint 28 Parte 2)

## Onde fica

`Configurações → Dados de saúde` (`src/components/settings/HealthDataSection.tsx`).
Não é uma rota nova nem uma área de navegação principal — segue o padrão de
seção dentro de Configurações já usado por Backup/Progresso Corporal.

## Métricas suportadas no formulário

`steps`, `sleep_duration`, `sleep_quality`, `resting_heart_rate`, `weight`,
`active_calories`, `activity_duration`, `distance`.

`wellness_energy`/`wellness_soreness`/`wellness_motivation` **não aparecem**
aqui — já são coletadas pelo check-in de Readiness
(`readiness-check-ins.ts`); duplicar o formulário criaria duas entradas
diárias parecidas para o mesmo conceito.

## Formulário dinâmico

`HealthDataManualEntryForm.tsx` muda os campos visíveis conforme a métrica
selecionada:

- **Sono (`sleep_duration`)**: início + fim (`datetime-local`) — a duração é
  calculada automaticamente a partir do intervalo, o usuário nunca soma
  horas manualmente. `recordedAt` = fim do sono.
- **Peso**: campo de unidade (kg/lb) + nota explícita de que o registro vai
  para Progresso Corporal.
- **Distância**: unidade (km/m/mi). **Duração de atividade**: unidade
  (minutos/horas).
- Demais métricas: valor + data + horário.
- Observação (opcional) em todas — vai para `metadata.notes` do registro
  (exceto peso, que não tem campo de observação em Body Progress).

Validação reaproveita `validateHealthDataInput`/`METRIC_RANGES` da Parte 1 —
o formulário não redefine limites nem regras próprias. Um valor que o motor
rejeitaria depois nunca é aceito na hora (a mensagem de erro do motor é
mostrada diretamente).

## Peso — decisão de não duplicar

`manual-entry.ts` é o único ponto que a UI chama. Para `metric: 'weight'`,
ele **não** chama `createHealthDataRecord` — delega para
`createBodyProgressEntry` (`lib/body-progress.ts`), preservando Body
Progress como fonte de verdade única (decisão da Parte 1, ver
`HEALTH-DATA-FOUNDATION.md`). A UI mostra "salvo em Progresso Corporal" no
resultado e o registro aparece na lista com `source: 'body_progress'` e um
link "Editar em Progresso Corporal" em vez de um botão de excluir — excluir
peso precisa passar pelo fluxo de Body Progress, nunca pelo adapter
somente-leitura.

## Resultado e erros

Após salvar: mensagem `role="status" aria-live="polite"` com métrica, valor
normalizado, unidade e qualidade calculada. Em caso de erro: mensagem
`role="alert" aria-live="assertive"`, formulário preservado (nada é limpo),
nenhum dado parcial. O botão de salvar fica desabilitado durante o envio
para evitar submissão dupla.
