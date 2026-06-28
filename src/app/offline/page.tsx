"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">📡</div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Você está offline</h1>
        <p className="text-[var(--color-text-secondary)] max-w-sm">
          Sem conexão com a internet. Seus dados locais continuam disponíveis — volte ao app quando reconectar.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
