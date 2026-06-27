import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TopBar from "@/components/layout/TopBar"
import BottomNav from "@/components/layout/BottomNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar user={user} />
      <main style={{ flex: 1, paddingTop: "56px", paddingBottom: "64px", overflowY: "auto" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
