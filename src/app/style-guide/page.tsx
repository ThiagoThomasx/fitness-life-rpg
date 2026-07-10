import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Style Guide",
  robots: { index: false },
}

/**
 * /style-guide — referência viva do design system.
 * Rota isolada e estática: não consome stores nem localStorage.
 * Fonte de valores: src/styles/tokens.css (ver DESIGN.md).
 */

const COLOR_GROUPS: Array<{ title: string; colors: Array<{ name: string; token: string; border?: boolean }> }> = [
  {
    title: "Superfícies",
    colors: [
      { name: "Canvas", token: "--color-canvas", border: true },
      { name: "Surface", token: "--color-surface", border: true },
      { name: "Surface raised", token: "--color-surface-raised", border: true },
      { name: "Surface hover", token: "--color-surface-hover", border: true },
      { name: "Surface active", token: "--color-surface-active", border: true },
    ],
  },
  {
    title: "Acento",
    colors: [
      { name: "Accent (chartreuse)", token: "--color-accent" },
      { name: "Accent hover", token: "--color-accent-hover" },
      { name: "Accent active", token: "--color-accent-active" },
      { name: "Accent subtle", token: "--color-accent-subtle", border: true },
      { name: "Deep forest", token: "--color-deep-forest" },
    ],
  },
  {
    title: "Texto",
    colors: [
      { name: "Primary", token: "--color-text-primary" },
      { name: "Secondary", token: "--color-text-secondary" },
      { name: "Muted", token: "--color-text-muted" },
      { name: "Disabled", token: "--color-text-disabled", border: true },
    ],
  },
  {
    title: "Semânticas",
    colors: [
      { name: "Success", token: "--color-success" },
      { name: "Warning", token: "--color-warning" },
      { name: "Danger", token: "--color-danger" },
      { name: "Info", token: "--color-info" },
      { name: "Level", token: "--color-level" },
      { name: "Streak", token: "--color-streak" },
    ],
  },
]

const SPACING = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16"]

const RADII = [
  { name: "xs", token: "--radius-xs" },
  { name: "sm", token: "--radius-sm" },
  { name: "control", token: "--radius-control" },
  { name: "card", token: "--radius-card" },
  { name: "card-lg", token: "--radius-card-lg" },
  { name: "modal", token: "--radius-modal" },
  { name: "pill", token: "--radius-pill" },
]

const SHADOWS = [
  { name: "card", token: "--shadow-card" },
  { name: "card-hover", token: "--shadow-card-hover" },
  { name: "modal", token: "--shadow-modal" },
  { name: "drawer", token: "--shadow-drawer" },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="display-heading text-2xl border-b border-subtle pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatch({ name, token, border }: { name: string; token: string; border?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 rounded-control"
        style={{
          background: `var(${token})`,
          border: border ? "1px solid var(--color-border-default)" : "none",
        }}
      />
      <div className="text-xs font-semibold text-primary">{name}</div>
      <code className="text-[0.65rem] text-muted">{token}</code>
    </div>
  )
}

export default function StyleGuidePage() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-10 px-4 py-8 md:px-8">
      <header>
        <div className="section-label">Fitness Life RPG</div>
        <h1 className="display-heading text-display" style={{ fontSize: "clamp(1.75rem, 5vw, var(--text-display))" }}>
          Style Guide
        </h1>
        <p className="mt-2 max-w-lg text-sm text-secondary">
          Referência viva do design system. Todos os valores vêm de{" "}
          <code className="text-xs">src/styles/tokens.css</code> — nenhum componente deve declarar
          cor, fonte, espaçamento ou raio fora dos tokens.
        </p>
      </header>

      {/* ─── Foundations ─────────────────────────────────────────────── */}
      <Section id="cores" title="Cores">
        <div className="flex flex-col gap-6">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="section-label">{group.title}</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {group.colors.map((c) => <Swatch key={c.token} {...c} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="alert alert--warning text-xs">
          Regra: chartreuse é acento — CTA, XP, badges e estados ativos. Nunca como fundo de tela
          ou card grande (limite ~15% da viewport).
        </div>
      </Section>

      <Section id="tipografia" title="Tipografia">
        <div className="card flex flex-col gap-5">
          <div>
            <div className="section-label">Display — Fraunces</div>
            <p className="display-heading" style={{ fontSize: "clamp(1.75rem, 5vw, var(--text-display))" }}>
              Progresso constante
            </p>
          </div>
          <div>
            <div className="section-label">H1 — Fraunces</div>
            <p className="display-heading text-3xl">Semana 12 de treino</p>
          </div>
          <div>
            <div className="section-label">H2 — Inter bold</div>
            <p className="text-2xl font-bold text-primary">Título de seção</p>
          </div>
          <div>
            <div className="section-label">H3 — Inter semibold</div>
            <p className="text-lg font-semibold text-primary">Subtítulo de card</p>
          </div>
          <div>
            <div className="section-label">Body</div>
            <p className="text-base text-primary">
              Texto de corpo em Inter regular. Usado em descrições, parágrafos e conteúdo denso.
            </p>
          </div>
          <div>
            <div className="section-label">Small / Secondary</div>
            <p className="text-sm text-secondary">Texto secundário para metadados e contexto.</p>
          </div>
          <div>
            <div className="section-label">Label</div>
            <p className="section-label" style={{ marginBottom: 0 }}>Rótulo uppercase com tracking</p>
          </div>
          <div>
            <div className="section-label">Caption</div>
            <p className="text-xs text-muted">Legenda em 12px para hints e notas.</p>
          </div>
          <div>
            <div className="section-label">Métrica — tabular nums</div>
            <p className="numeric text-3xl font-bold text-primary">1.248 <span className="text-sm text-muted">XP</span></p>
          </div>
        </div>
        <div className="alert alert--info text-xs">
          Fraunces só em headlines, números especiais e mensagens editoriais — nunca em labels,
          botões, tabelas ou textos longos.
        </div>
      </Section>

      <Section id="spacing" title="Espaçamento (base 4px)">
        <div className="card flex flex-col gap-2">
          {SPACING.map((s) => (
            <div key={s} className="flex items-center gap-3">
              <code className="w-24 flex-shrink-0 text-xs text-muted">--space-{s}</code>
              <div
                className="h-4 rounded-xs"
                style={{ width: `var(--space-${s})`, background: "var(--color-accent)" }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section id="radius" title="Radius">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="h-14 w-full border border-strong bg-surface-raised"
                style={{ borderRadius: `var(${r.token})` }}
              />
              <code className="text-[0.65rem] text-muted">{r.name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section id="sombras" title="Sombras">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SHADOWS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-full rounded-card bg-surface-raised"
                style={{ boxShadow: `var(${s.token})` }}
              />
              <code className="text-[0.65rem] text-muted">{s.name}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Buttons ─────────────────────────────────────────────────── */}
      <Section id="botoes" title="Botões">
        <div className="card flex flex-wrap items-center gap-3">
          <button className="btn btn--primary">Primário</button>
          <button className="btn btn--secondary">Secundário</button>
          <button className="btn btn--ghost">Ghost</button>
          <button className="btn btn--danger">Danger</button>
          <button className="btn btn--primary" disabled>Disabled</button>
          <button className="btn btn--primary btn--loading" aria-label="Carregando">Salvar</button>
          <button className="icon-btn" aria-label="Configurações">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="btn btn--primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Ícone à esquerda
          </button>
          <button className="btn btn--secondary">
            Ícone à direita
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </Section>

      {/* ─── Cards ───────────────────────────────────────────────────── */}
      <Section id="cards" title="Cards">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="card">
            <div className="section-label">Base</div>
            <p className="text-sm text-secondary">Superfície padrão com borda sutil.</p>
          </div>
          <div className="card card--raised">
            <div className="section-label">Elevado</div>
            <p className="text-sm text-secondary">Surface raised + sombra de card.</p>
          </div>
          <div className="card card--interactive">
            <div className="section-label">Interativo</div>
            <p className="text-sm text-secondary">Hover e active com mudança de superfície.</p>
          </div>
          <div className="card card--selected">
            <div className="section-label" style={{ color: "var(--color-accent)" }}>Selecionado</div>
            <p className="text-sm text-secondary">Borda e fundo com acento sutil.</p>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon metric-card__icon--accent" aria-hidden="true">🏋️</div>
            <div className="metric-card__value metric-card__value--accent">3/4</div>
            <div className="metric-card__label">Métrica</div>
          </div>
          <div className="card card--dashed">
            <div className="empty-state" style={{ padding: "var(--space-4)" }}>
              <span className="empty-state__icon" aria-hidden="true">📭</span>
              <p className="empty-state__title">Estado vazio</p>
              <p className="empty-state__desc">Sem dados ainda — com ação sugerida.</p>
              <button className="btn btn--primary">Começar</button>
            </div>
          </div>
        </div>
        <div className="card card--accent-top">
          <div className="section-label">Card com destaque no topo</div>
          <p className="text-sm text-secondary">Linha de acento de 2px — usada em recomendações e destaques.</p>
        </div>
      </Section>

      {/* ─── Form controls ───────────────────────────────────────────── */}
      <Section id="forms" title="Formulários">
        <div className="card grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="sg-input">Input</label>
            <input id="sg-input" className="input" placeholder="Nome do treino" />
          </div>
          <div>
            <label className="field-label" htmlFor="sg-input-err">Input com erro</label>
            <input id="sg-input-err" className="input input--error" defaultValue="valor inválido" aria-invalid="true" aria-describedby="sg-input-err-msg" />
            <p id="sg-input-err-msg" className="field-error">Campo obrigatório.</p>
          </div>
          <div>
            <label className="field-label" htmlFor="sg-select">Select</label>
            <select id="sg-select" className="select" defaultValue="forca">
              <option value="forca">Força</option>
              <option value="cardio">Cardio</option>
              <option value="flex">Flexibilidade</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="sg-input-dis">Disabled</label>
            <input id="sg-input-dis" className="input" disabled defaultValue="Indisponível" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label" htmlFor="sg-textarea">Textarea</label>
            <textarea id="sg-textarea" className="textarea" placeholder="Como foi o treino de hoje?" />
          </div>
          <div className="flex items-center gap-3">
            <label className="toggle">
              <input type="checkbox" defaultChecked aria-label="Notificações ativadas" />
              <span className="toggle__track" />
              <span className="toggle__thumb" />
            </label>
            <span className="text-sm text-primary">Toggle ativo</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="toggle">
              <input type="checkbox" aria-label="Notificações desativadas" />
              <span className="toggle__track" />
              <span className="toggle__thumb" />
            </label>
            <span className="text-sm text-secondary">Toggle inativo</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="sg-check" defaultChecked className="h-4 w-4 accent-accent" />
            <label htmlFor="sg-check" className="text-sm text-primary">Checkbox nativo com accent</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="radio" id="sg-radio" name="sg-radio" defaultChecked className="h-4 w-4 accent-accent" />
            <label htmlFor="sg-radio" className="text-sm text-primary">Radio nativo com accent</label>
          </div>
        </div>
      </Section>

      {/* ─── Feedback ────────────────────────────────────────────────── */}
      <Section id="feedback" title="Feedback">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="alert alert--info">Informação: dados sincronizados localmente.</div>
          <div className="alert alert--success">Sucesso: treino registrado, +50 XP.</div>
          <div className="alert alert--warning">Atenção: meta semanal em risco.</div>
          <div className="alert alert--danger">Erro: não foi possível importar o backup.</div>
        </div>
        <div className="card flex flex-wrap items-center gap-3">
          <span className="badge-pill badge-pill--accent">+50 XP</span>
          <span className="badge-pill badge-pill--level">Nv 12</span>
          <span className="badge-pill badge-pill--xp">XP</span>
          <span className="badge-pill badge-pill--streak">🔥 7 dias</span>
          <span className="badge-pill badge-pill--danger">Expirado</span>
          <span className="badge-recommended">✨ Recomendado</span>
        </div>
        <div className="card flex flex-col gap-4">
          <div>
            <div className="section-label">Barra de XP (chartreuse)</div>
            <div className="xp-bar" role="progressbar" aria-valuenow={64} aria-valuemin={0} aria-valuemax={100} aria-label="Exemplo de barra de XP">
              <div className="xp-bar__fill" style={{ width: "64%" }} />
            </div>
          </div>
          <div>
            <div className="section-label">Progresso — level</div>
            <div className="progress-track">
              <div className="progress-fill progress-fill--level" style={{ width: "40%" }} />
            </div>
          </div>
          <div>
            <div className="section-label">Skeleton</div>
            <div className="flex flex-col gap-2">
              <div className="skeleton skeleton--title" style={{ width: "40%" }} />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" style={{ width: "66%" }} />
            </div>
          </div>
          <div>
            <div className="section-label">Toast (demonstração estática)</div>
            <div
              className="card card--sm inline-flex items-center gap-3"
              style={{ borderColor: "var(--color-accent-border)", background: "var(--color-accent-subtle)" }}
              role="presentation"
            >
              <span aria-hidden="true">⭐</span>
              <span className="text-sm font-semibold text-primary">+50 XP — Treino completo!</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Navigation ──────────────────────────────────────────────── */}
      <Section id="navegacao" title="Navegação">
        <div className="card" style={{ maxWidth: 280, padding: "var(--space-3) var(--space-2)" }}>
          <nav aria-label="Demonstração de navegação" className="flex flex-col gap-0.5">
            <span className="nav-link nav-link--active">
              <span className="nav-link__icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              </span>
              <span className="nav-link__label">Item ativo</span>
            </span>
            <span className="nav-link">
              <span className="nav-link__icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              </span>
              <span className="nav-link__label">Item padrão</span>
            </span>
            <span className="nav-link">
              <span className="nav-link__icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </span>
              <span className="nav-link__label">Com notificação</span>
              <span className="badge-pill badge-pill--accent" style={{ marginLeft: "auto" }}>3</span>
            </span>
          </nav>
        </div>
        <p className="text-xs text-muted">
          Navegação oficial: sidebar fixa (desktop) + drawer com overlay (mobile) — decisão travada
          no Sprint 1. Implementação em <code>AppSidebar.tsx</code> / <code>shell.css</code>.
        </p>
      </Section>

      {/* ─── Dashboard patterns ──────────────────────────────────────── */}
      <Section id="dashboard-patterns" title="Padrões do Dashboard">
        <div className="card">
          <div className="section-label">Hero compacto</div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="display-heading text-2xl">Herói Local</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge-pill badge-pill--level">Nv 3</span>
                <span className="numeric text-xs text-muted">120 / 900 XP</span>
              </div>
            </div>
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-card" style={{ background: "var(--color-deep-forest)" }}>
              <span className="numeric text-xl font-bold" style={{ color: "var(--color-accent)" }}>3</span>
              <span className="text-[0.55rem] uppercase tracking-wider" style={{ color: "var(--color-accent)", opacity: 0.7 }}>nível</span>
            </div>
          </div>
          <div className="xp-bar mt-4">
            <div className="xp-bar__fill" style={{ width: "13%" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { icon: "🏋️", cls: "metric-card__icon--accent", value: "3/4", label: "Treinos na semana", hl: true },
            { icon: "⭐", cls: "metric-card__icon--streak", value: "+120", label: "XP na semana", hl: false },
            { icon: "🎯", cls: "metric-card__icon--level", value: "27", label: "Total de treinos", hl: false },
            { icon: "⚡", cls: "metric-card__icon--info", value: "1.248", label: "XP acumulado", hl: false },
          ].map((m) => (
            <div key={m.label} className="metric-card">
              <div className={`metric-card__icon ${m.cls}`} aria-hidden="true">{m.icon}</div>
              <div className={`metric-card__value${m.hl ? " metric-card__value--accent" : ""}`}>{m.value}</div>
              <div className="metric-card__label">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="card card--interactive card--accent-top flex items-center gap-4" style={{ padding: "var(--space-4) var(--space-5)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-card text-xl" style={{ background: "var(--color-accent-subtle)" }} aria-hidden="true">🏋️</div>
            <div className="flex-1">
              <div className="section-label" style={{ marginBottom: 2, color: "var(--color-accent)" }}>Ação rápida</div>
              <div className="text-sm font-bold text-primary">Iniciar treino de força</div>
              <div className="text-xs text-muted">~45min · recomendado hoje</div>
            </div>
            <span style={{ color: "var(--color-accent)" }} aria-hidden="true">›</span>
          </div>
          <div className="card">
            <div className="section-label">Meta semanal</div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-sm font-bold text-primary">3 de 4 treinos</span>
              <span className="numeric text-xs text-muted">75%</span>
            </div>
            <div className="xp-bar">
              <div className="xp-bar__fill" style={{ width: "75%" }} />
            </div>
          </div>
        </div>
      </Section>

      <footer className="border-t border-subtle pt-4 pb-8 text-xs text-muted">
        Sprint 1 · fundação visual — valores canônicos em <code>src/styles/tokens.css</code>.
      </footer>
    </main>
  )
}
