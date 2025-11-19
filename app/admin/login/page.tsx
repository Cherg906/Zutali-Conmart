"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { Shield } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"

export default function AdminLoginPage() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email")
  const { language } = useLanguage()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get(loginMethod === 'email' ? 'admin-email' : 'admin-phone') as string
    const password = formData.get(loginMethod === 'email' ? 'admin-password' : 'admin-password-phone') as string

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginMethod === 'email' ? email : undefined,
          phone: loginMethod === 'phone' ? email : undefined,
          password,
          userType: 'admin'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: language === "en" ? "Admin Login Failed" : "የአስተዳዳሪ መግቢያ አልተሳካም",
          description: data.message || (language === "en" ? "Invalid admin credentials" : "የተሳለመ የአስተዳዳሪ ምስጋና"),
          variant: "destructive"
        })
        return
      }

      // Store auth data - store both for compatibility
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('userData', JSON.stringify(data.user))
      localStorage.setItem('admin_user', JSON.stringify(data.user))
      localStorage.setItem('admin_authenticated', 'true')

      router.push("/dashboard/admin")
    } catch (error) {
      console.error('Admin login error:', error)
      toast({
        title: language === "en" ? "Admin Login Error" : "የአስተዳዳሪ መግቢያ ስህተት",
        description: language === "en" ? "An error occurred during admin login" : "በአስተዳዳሪ መግቢያ ወቅት ስህተት ተፈጥሯል",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{language === "en" ? "Admin Access" : "የአስተዳዳሪ መዳረሻ"}</CardTitle>
          <CardDescription>
            {language === "en" ? "Secure login for system administrators" : "ለስርዓት አስተዳዳሪዎች ደህንነቱ የተጠበቀ መግቢያ"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "email" | "phone")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{language === "en" ? "Email" : "ኢሜይል"}</TabsTrigger>
              <TabsTrigger value="phone">{language === "en" ? "Phone" : "ስልክ"}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <Label htmlFor="admin-email">{language === "en" ? "Admin Email" : "የአስተዳዳሪ ኢሜይል"}</Label>
                  <Input id="admin-email" name="admin-email" type="email" placeholder="admin@zutali.com" className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="admin-password">{language === "en" ? "Password" : "የይለፍ ቃል"}</Label>
                  <PasswordInput id="admin-password" name="admin-password" placeholder="••••••••" className="mt-2" required />
                </div>
                <Button type="submit" className="w-full">
                  {language === "en" ? "Login as Admin" : "እንደ አስተዳዳሪ ይግቡ"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <Label htmlFor="admin-phone">{language === "en" ? "Admin Phone" : "የአስተዳዳሪ ስልክ"}</Label>
                  <Input id="admin-phone" name="admin-phone" type="tel" placeholder="+251 9XX XXX XXX" className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="admin-password-phone">{language === "en" ? "Password" : "የይለፍ ቃል"}</Label>
                  <PasswordInput id="admin-password-phone" name="admin-password-phone" placeholder="••••••••" className="mt-2" required />
                </div>
                <Button type="submit" className="w-full">
                  {language === "en" ? "Login as Admin" : "እንደ አስተዳዳሪ ይግቡ"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
            {language === "en"
              ? "This is a restricted area. Unauthorized access is prohibited."
              : "ይህ የተገደበ አካባቢ ነው። ያልተፈቀደ መዳረሻ የተከለከለ ነው።"}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
