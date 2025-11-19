"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"
import { CategoriesManagement } from "@/components/admin/categories-management"

export default function CategoriesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_authenticated')
    const regularToken = localStorage.getItem('authToken')
    
    if (adminAuth === 'true' || regularToken) {
      setIsAuthenticated(true)
    } else {
      router.push('/admin')
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <CategoriesManagement />
}
