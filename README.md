# Life RPG — Módulo Fit

Um app gamificado de fitness onde treinar, registrar refeições e escrever no diário rendem XP, níveis e atributos como em um RPG.

## Funcionalidades

- **Dashboard** — visão geral de XP, nível, atributos e missões diárias
- **Treinos** — biblioteca de treinos, sessão ativa com cronômetro e detecção de PR
- **Histórico** — registros de treinos completados com evolução de carga
- **Diário** — entradas diárias com tags automáticas e XP
- **Nutrição** — metas de macros, registro diário e streak de dias
- **Insights** — gráficos de frequência, evolução de carga e progresso
- **Perfil** — atributos, badges e conquistas
- **Dados & Backup** — exportar/importar/resetar dados locais com segurança

## Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **Zustand** — gerenciamento de estado com persistência local
- **Recharts** — gráficos
- **localStorage** — persistência de dados (sem banco de dados obrigatório)

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

O app funciona em **modo local/mock** sem nenhuma configuração adicional.

## Build de produção

```bash
npm run build
npm start
```

## Deploy

Veja [`docs/DEPLOY.md`](docs/DEPLOY.md) para instruções de deploy na Vercel ou em servidor próprio.

## QA

Veja [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) para o checklist de validação antes do deploy.

## Dados locais

Todos os dados ficam no `localStorage` do browser, organizados pelas chaves:

| Chave | Conteúdo |
|---|---|
| `lrpg-fit:character` | Personagem, XP e nível |
| `lrpg-fit:active-session` | Sessão de treino ativa |
| `lrpg-fit:workout-history` | Histórico de treinos completados |
| `lrpg-fit:badges` | Conquistas ganhas |
| `lrpg-fit:daily-logs` | Entradas do diário |
| `lrpg-fit:reward-events` | Histórico de recompensas |
| `lrpg-fit:nutrition-goal` | Metas de macros |
| `lrpg-fit:nutrition-logs` | Registros nutricionais |

Use a página **Dados & Backup** (`/configuracoes`) para exportar um `.json` com todos os dados, importar um backup anterior ou resetar tudo com confirmação.
