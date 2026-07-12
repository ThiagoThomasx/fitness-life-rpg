import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"
import { MOCK_USER } from "@/lib/mock/data"
import { redirect } from "next/navigation"
import AppSidebar from "@/components/layout/AppSidebar"
import { RewardToast } from "@/components/rewards/RewardToast"
import { StoreHydrationBoundary } from "@/components/layout/StoreHydrationBoundary"

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
    <div className="app-shell">
      <StoreHydrationBoundary />
      <AppSidebar userEmail={user?.email} />
      <main className="app-main">
        {children}
      </main>
      <RewardToast />
    </div>
  )
}
