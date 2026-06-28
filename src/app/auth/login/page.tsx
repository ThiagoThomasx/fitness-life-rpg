"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/env"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace("/dashboard")
    }
  }, [router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  if (!isSupabaseConfigured) {
    return (
      <main style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#121212", color: "#b3b3b3", fontSize: "0.875rem",
      }}>
        Redirecionando…
      </main>
    )
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({ type: "success", text: "Verifique seu email para confirmar o cadastro." })
      }
    }

    setLoading(false)
  }

  async function handleGoogleAuth() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMessage({ type: "error", text: error.message })
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-icon">⚔️</span>
          <h1 className="login-title">Fitness Life RPG</h1>
          <p className="login-subtitle">Transforme seus treinos em aventura</p>
        </div>

        <button onClick={handleGoogleAuth} className="btn-google">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </button>

        <div className="login-divider"><span>ou</span></div>

        <form onSubmit={handleEmailAuth} className="login-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" required autoComplete="email" />
          </div>
          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} />
          </div>

          {message && (
            <p className={`form-message form-message--${message.type}`}>{message.text}</p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="login-toggle">
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(null) }}>
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>

      <style jsx>{`
        .login-page { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: radial-gradient(ellipse at 50% 0%, rgba(29, 185, 84, 0.08) 0%, transparent 60%), var(--color-bg-base); }
        .login-card { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: var(--space-5); }
        .login-brand { text-align: center; }
        .login-brand-icon { font-size: 2.5rem; display: block; margin-bottom: var(--space-2); }
        .login-title { font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary); }
        .login-subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-1); }
        .btn-google { display: flex; align-items: center; justify-content: center; gap: var(--space-3); width: 100%; padding: var(--space-3) var(--space-4); background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); font-size: var(--text-sm); font-weight: var(--font-medium); cursor: pointer; transition: background var(--duration-fast) var(--ease-out); }
        .btn-google:hover { background: var(--color-bg-highlight); }
        .login-divider { display: flex; align-items: center; gap: var(--space-3); color: var(--color-text-muted); font-size: var(--text-xs); }
        .login-divider::before, .login-divider::after { content: ""; flex: 1; height: 1px; background: var(--color-border); }
        .login-form { display: flex; flex-direction: column; gap: var(--space-4); }
        .form-field { display: flex; flex-direction: column; gap: var(--space-2); }
        .form-field label { font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text-secondary); }
        .form-field input { width: 100%; padding: var(--space-3) var(--space-4); background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); font-size: var(--text-base); outline: none; transition: border-color var(--duration-fast) var(--ease-out); }
        .form-field input:focus { border-color: var(--color-accent); }
        .form-field input::placeholder { color: var(--color-text-muted); }
        .form-message { font-size: var(--text-sm); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); }
        .form-message--error { background: var(--color-danger-muted); color: var(--color-danger); }
        .form-message--success { background: var(--color-accent-muted); color: var(--color-accent); }
        .btn-primary { width: 100%; padding: var(--space-3) var(--space-4); background: var(--color-accent); color: #000; font-size: var(--text-base); font-weight: var(--font-semibold); border: none; border-radius: var(--radius-md); cursor: pointer; transition: background var(--duration-fast) var(--ease-out); }
        .btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-toggle { text-align: center; font-size: var(--text-sm); color: var(--color-text-secondary); }
        .login-toggle button { color: var(--color-accent); background: none; border: none; cursor: pointer; font-size: var(--text-sm); font-weight: var(--font-medium); text-decoration: underline; }
      `}</style>
    </main>
  )
}
