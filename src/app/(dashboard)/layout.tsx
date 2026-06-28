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
    <div className="app-shell">
      <AppSidebar userEmail={user?.email} />
      <main className="app-main">
        {children}
      </main>
      <RewardToast />

      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100dvh;
        }
        .app-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          /* Desktop: offset for sidebar */
          margin-left: 220px;
        }
        @media (max-width: 767px) {
          .app-main {
            margin-left: 0;
            /* Mobile: offset for hamburger button */
            padding-top: 52px;
          }
        }
      `}</style>
    </div>
  )
}
