import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"
import { MOCK_USER } from "@/lib/mock/data"
import { redirect } from "next/navigation"
import AppSidebar from "@/components/layout/AppSidebar"
import { RewardToast } from "@/components/rewards/RewardToast"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: typeof MOCK_USER | null = null

  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user as typeof MOCK_USER | null
    if (!user) redirect("/auth/login")
  } else {
    user = MOCK_USER
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <AppSidebar userEmail={user?.email} />
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }} className="app-main">
        {children}
      </main>
      <RewardToast />
      <style>{`
        .app-main { margin-left: 220px; }
        @media (max-width: 767px) { .app-main { margin-left: 0; padding-top: 52px; } }
      `}</style>
    </div>
  )
}
