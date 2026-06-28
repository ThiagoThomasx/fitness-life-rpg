"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OnlineStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-[var(--color-bg-highlight)] border-t border-[var(--color-border)] py-2 px-4 text-sm text-[var(--color-text-secondary)]"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-danger)]" aria-hidden="true" />
      Offline — usando dados locais
    </div>
  );
}
