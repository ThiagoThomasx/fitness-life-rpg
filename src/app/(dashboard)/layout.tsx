import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"
import { MOCK_USER } from "@/lib/mock/data"
import { redirect } from "next/navigation"
import TopBar from "@/components/layout/TopBar"
import BottomNav from "@/components/layout/BottomNav"
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar user={user} />
      <main style={{ flex: 1, paddingTop: "56px", paddingBottom: "64px", overflowY: "auto" }}>
        {children}
      </main>
      <RewardToast />
      <BottomNav />
    </div>
  )
}
