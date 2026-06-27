# Life RPG — Guia de Deploy

Este app é um projeto Next.js 14 (App Router) com dados locais. Funciona sem banco de dados em modo local/mock.

---

## Deploy na Vercel (recomendado)

### Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Repositório no GitHub
- Node.js 18+ localmente

### Passos

1. **Push do código para o GitHub:**

```bash
git push origin master
```

2. **Importar projeto na Vercel:**
   - Acesse https://vercel.com/new
   - Selecione o repositório `fitness-life-rpg`
   - Framework: **Next.js** (detectado automaticamente)
   - Clique em **Deploy**

3. **Variáveis de ambiente (opcionais para modo local):**

O app funciona sem `.env.local`. Para habilitar autenticação real com Supabase no futuro:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Não (modo local) | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Não (modo local) | Chave pública Supabase |

Sem essas variáveis, o app usa modo local/mock automaticamente.

4. **Após o deploy:**
   - URL gerada automaticamente pela Vercel (ex: `fitness-life-rpg.vercel.app`)
   - Cada push na branch `master` gera um novo deploy

---

## Deploy manual (VPS / servidor próprio)

```bash
# Instalar dependências
npm install

# Build de produção
npm run build

# Iniciar servidor
npm start
# ou com PM2:
pm2 start npm --name "life-rpg" -- start
```

Porta padrão: `3000`. Configure um reverse proxy (nginx/caddy) apontando para essa porta.

---

## Build local para teste

```bash
npm run build
npm start
```

Acesse `http://localhost:3000`.

---

## Verificar antes do deploy

Execute a lista em [`docs/QA_CHECKLIST.md`](./QA_CHECKLIST.md) antes de qualquer release para produção.

---

## Dados locais em produção

Todos os dados do usuário ficam no `localStorage` do browser. Não há banco de dados obrigatório.

- **Vantagem:** zero infraestrutura, zero custo de backend
- **Limite:** dados são por dispositivo e browser
- **Backup:** usuário pode exportar/importar via `/configuracoes`

---

## Checklist de deploy

- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem erros
- [ ] QA_CHECKLIST.md validado
- [ ] Push para `master` com mensagem de release
- [ ] Vercel deploy concluído com status "Ready"
- [ ] URL de produção testada em mobile
