import Link from "next/link"

const STATS = [
  { value: "XP", label: "por treino" },
  { value: "PR", label: "registros automáticos" },
  { value: "5", label: "atributos do personagem" },
] as const

export default function Home() {
  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem 1rem",
      overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 0%, rgba(29, 185, 84, 0.08) 0%, transparent 60%), #121212",
    }}>
      <div style={{
        maxWidth: 520,
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
      }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(29, 185, 84, 0.12)",
          color: "#1db954",
          fontSize: "0.875rem",
          fontWeight: 600,
          padding: "0.5rem 1rem",
          borderRadius: 9999,
          border: "1px solid rgba(29, 185, 84, 0.2)",
        }}>
          🎮 Gamify your fitness
        </span>

        <h1 style={{
          fontSize: "clamp(2.25rem, 8vw, 3.5rem)",
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "#ffffff",
        }}>
          Seus treinos.<br />
          Sua jornada.<br />
          <span style={{ color: "#1db954" }}>Sua lenda.</span>
        </h1>

        <p style={{ fontSize: "1.125rem", color: "#b3b3b3", lineHeight: 1.6 }}>
          Transforme cada rep em XP, cada PR em conquista.<br />
          O RPG que torna impossível não treinar.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1rem 2rem",
            background: "#1db954",
            color: "#000",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 9999,
            textDecoration: "none",
          }}
        >
          Começar aventura
        </Link>

        <div style={{ display: "flex", gap: "2rem" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1db954" }}>{s.value}</span>
              <span style={{ fontSize: "0.75rem", color: "#6a6a6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
