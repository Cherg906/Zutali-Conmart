"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, Lock } from "lucide-react"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import { PasswordInput } from "@/components/ui/password-input"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  })
  const [loginError, setLoginError] = useState('')
  const { t, language } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated (either regular auth or admin auth)
    const adminAuth = localStorage.getItem('admin_authenticated')
    const regularToken = localStorage.getItem('authToken')
    const regularUser = localStorage.getItem('userData')

    console.log('Admin page auth check:', {
      adminAuth,
      hasRegularToken: !!regularToken,
      hasRegularUser: !!regularUser
    })

    if (adminAuth === 'true') {
      console.log('Admin already authenticated via admin_auth')
      setIsAuthenticated(true)
    } else if (regularToken && regularUser) {
      try {
        const userData = JSON.parse(regularUser)
        console.log('Regular user data:', userData)
        // Check if user has admin role
        if (userData.role === 'admin') {
          console.log('Regular user has admin role, setting admin auth')
          localStorage.setItem('admin_authenticated', 'true')
          setIsAuthenticated(true)
        } else {
          console.log('Regular user does not have admin role:', userData.role)
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    } else {
      console.log('No authentication found')
    }
    setLoading(false)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    try {
      // Authenticate with Django backend
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await response.json()

      // Check if user has admin role
      if (data.user.role !== 'admin') {
        setLoginError('Access denied. Admin privileges required.')
        return
      }

      // Store auth token and mark as authenticated
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_authenticated', 'true')
      localStorage.setItem('admin_user', JSON.stringify(data.user))

      // Also set regular auth tokens for full application access
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('userData', JSON.stringify(data.user))

      setIsAuthenticated(true)
      console.log('Admin login successful:', data.user)

    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Invalid credentials. Please check your username and password.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')

    // Also clear regular auth tokens
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')

    setIsAuthenticated(false)
    setLoginForm({ username: '', password: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'am' ? 'አስተዳደር መግቢያ' : 'Admin Login'}
            </CardTitle>
            <CardDescription>
              {language === 'am' ? 'ወደ ዙታሊ ኮንማርት አስተዳደር ዳሽቦርድ ይግቡ' : 'Access Zutali Conmart Administration Dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === 'am' ? 'የተጠቃሚ ስም' : 'Username'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={language === 'am' ? 'አስተዳደር የተጠቃሚ ስም' : 'Admin username'}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === 'am' ? 'የይለፍ ቃል' : 'Password'}
                </Label>
                <PasswordInput
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={language === 'am' ? 'የይለፍ ቃል' : 'Admin password'}
                  required
                />
              </div>

              {loginError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                {language === 'am' ? 'ግባ' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-xs text-muted-foreground">
                {language === 'am' ? 'የአስተዳደር መለያ ያስፈልጋል' : 'Admin account required'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {language === 'am' ? 'የአስተዳደር መብቶች ያላቸው ተጠቃሚዎች ብቻ መግባት ይችላሉ' : 'Only users with admin privileges can access this panel'}
              </div>

              {/* Debug button for testing */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  // For testing purposes - set demo admin auth with correct token
                  const correctToken = 'c8c2e9d4f1a5b6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4'
                  localStorage.setItem('admin_token', correctToken)
                  localStorage.setItem('admin_authenticated', 'true')
                  localStorage.setItem('admin_user', JSON.stringify({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    username: 'admin',
                    email: 'admin@zutali.com',
                    role: 'admin',
                    first_name: 'Admin',
                    last_name: 'User'
                  }))
                  localStorage.setItem('authToken', correctToken)
                  localStorage.setItem('userData', JSON.stringify({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    username: 'admin',
                    email: 'admin@zutali.com',
                    role: 'admin',
                    first_name: 'Admin',
                    last_name: 'User'
                  }))
                  setIsAuthenticated(true)
                  window.location.reload()
                }}
              >
                🔧 Debug: Set Demo Admin Auth
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {language === 'am' ? 'አስተዳደር ፓነል' : 'Admin Panel'}
            </span>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm">
            {language === 'am' ? 'ውጣ' : 'Logout'}
          </Button>
        </div>
      </div>
      <AdminDashboard />
    </div>
  )
}