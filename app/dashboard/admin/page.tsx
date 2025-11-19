"use client"

import { AdminDashboard as RealAdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminDashboardPage() {
  return (
    <div suppressHydrationWarning>
      <RealAdminDashboard />
    </div>
  )
}
