"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"
import { useAuth } from "@/app/context/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PasswordInput } from "@/components/ui/password-input"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = searchParams.get("type") || "user"
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { t, language } = useLanguage()
  const { login: loginUser, refreshProfile } = useAuth()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get(loginMethod === 'email' ? 'email' : 'phone') as string
    const password = formData.get(loginMethod === 'email' ? 'password' : 'password-phone') as string

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginMethod === 'email' ? email : undefined,
          phone: loginMethod === 'phone' ? email : undefined,
          password,
          userType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const mismatchMessage = userType === "owner"
          ? (language === "en"
              ? "You don't have a product owner account with these credentials. Please login with your user account or register as a product owner."
              : "ከዚህ መለያ ጋር የምርት ባለቤት መለያ የለዎትም። እባክዎ እንደ ተጠቃሚ ይግቡ ወይም እንደ ምርት ባለቤት ይመዝገቡ።")
          : (language === "en"
              ? "You don't have a user account with these credentials. Please login with your product owner account or register as a user."
              : "ከዚህ መለያ ጋር የተጠቃሚ መለያ የለዎትም። እባክዎ እንደ ምርት ባለቤት ይግቡ ወይም እንደ ተጠቃሚ ይመዝገቡ።")

        const description = data.message && data.message !== "Invalid credentials"
          ? data.message
          : mismatchMessage

        toast({
          title: language === "en" ? "Login Failed" : "መግቢያ አልተሳካም",
          description,
          variant: "destructive"
        })
        setErrorMessage(description)
        return
      }

      // Store auth data (you might want to use a proper auth context)
      loginUser(data.token, data.user)
      await refreshProfile()

      // Redirect based on role
      if (userType === "owner") {
        router.push("/dashboard/owner")
      } else {
        router.push("/dashboard/user")
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: language === "en" ? "Login Error" : "የመግቢያ ስህተት",
        description: language === "en" ? "An error occurred during login" : "በመግቢያ ወቅት ስህተት ተፈጥሯል",
        variant: "destructive"
      })
      setErrorMessage(language === "en" ? "An error occurred during login" : "በመግቢያ ወቅት ስህተት ተፈጥሯል")
    }
  }

  const getTitle = () => {
    return language === "en" ? "Welcome Back" : "እንኳን ደህና መጡ"
  }

  const getDescription = () => {
    if (userType === "owner") {
      return language === "en" ? "Login to your product owner account" : "ወደ የምርት ባለቤት መለያዎ ይግቡ"
    }
    return t("auth.loginTitle")
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={loginMethod}
            onValueChange={(v) => {
              setLoginMethod(v as "email" | "phone")
              setErrorMessage(null)
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{language === "en" ? "Email" : "ኢሜይል"}</TabsTrigger>
              <TabsTrigger value="phone">{language === "en" ? "Phone" : "ስልክ"}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" name="email" type="email" placeholder="your@email.com" className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordInput id="password" name="password" placeholder="••••••••" className="mt-2" required />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <Button type="submit" className="w-full">
                  {t("common.login")}
                </Button>
                {errorMessage && (
                  <p className="text-sm text-destructive text-center leading-relaxed">
                    {errorMessage}
                  </p>
                )}
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+251 9XX XXX XXX" className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="password-phone">{t("auth.password")}</Label>
                  <PasswordInput id="password-phone" name="password-phone" placeholder="••••••••" className="mt-2" required />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <Button type="submit" className="w-full">
                  {t("common.login")}
                </Button>
                {errorMessage && (
                  <p className="text-sm text-destructive text-center leading-relaxed">
                    {errorMessage}
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t("auth.noAccount")} </span>
            <Link href={`/register?type=${userType}`} className="text-primary hover:underline">
              {language === "en" ? "Register here" : "እዚህ ይመዝገቡ"}
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            {userType === "user" ? (
              <Link href="/login?type=owner" className="text-muted-foreground hover:text-primary">
                {language === "en" ? "Login as Product Owner" : "እንደ ምርት ባለቤት ይግቡ"}
              </Link>
            ) : (
              <Link href="/login?type=user" className="text-muted-foreground hover:text-primary">
                {language === "en" ? "Login as User" : "እንደ ተጠቃሚ ይግቡ"}
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
