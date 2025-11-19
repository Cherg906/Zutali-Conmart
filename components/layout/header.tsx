"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X, User as UserIcon, Globe, LogOut, LayoutDashboard, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchWithSuggestions } from "@/components/ui/search-with-suggestions"
import { useLanguage } from "@/lib/language-context"
import { useAuth } from "@/app/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()
  const { user, isAuthenticated, logout, loading } = useAuth()

  const displayName = useMemo(() => {
    if (!user) return ""
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(" ")
    }
    return user.username ?? ""
  }, [user])

  const avatarUrl = useMemo(() => {
    if (!user?.avatar) return undefined
    return user.avatar.startsWith("http")
      ? user.avatar
      : `${process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"}${user.avatar}`
  }, [user?.avatar])

  const initials = useMemo(() => {
    if (!displayName) return "U"
    const parts = displayName.trim().split(" ")
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U"
    return `${parts[0][0]?.toUpperCase() ?? ""}${parts[parts.length - 1][0]?.toUpperCase() ?? ""}`
  }, [displayName])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "am" : "en")
  }

  const handleSearch = (query: string) => {
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  const handleSuggestionSelect = (suggestion: any) => {
    if (suggestion.type === 'category') {
      router.push(`/categories/${suggestion.id}`)
    } else if (suggestion.type === 'product') {
      router.push(`/products/${suggestion.id}`)
    } else {
      router.push(`/products?search=${encodeURIComponent(suggestion.title)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto flex h-10 items-center justify-between px-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{t("common.welcome")}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{language === "en" ? t("common.amharic") : t("common.english")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">Z</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none text-primary">Zutali</span>
              <span className="text-xs text-muted-foreground">Conmart</span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden flex-1 max-w-2xl md:block">
            <SearchWithSuggestions
              placeholder={t("header.searchPlaceholder")}
              onSearch={handleSearch}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              {t("common.home")}
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              {t("common.about")}
            </Link>
            <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
              {t("common.contact")}
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {!isAuthenticated && !loading && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="bg-transparent">
                  <Link href="/login?type=user">
                    <UserIcon className="mr-2 h-4 w-4" />
                    {t("header.asUser")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="bg-transparent">
                  <Link href="/login?type=owner">
                    {t("header.asOwner")}
                  </Link>
                </Button>
              </div>
            )}

            {isAuthenticated && !loading && (
              <div className="hidden md:flex items-center gap-2 relative z-40 pr-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {displayName || t("common.welcome")}
                </span>
                <Avatar className="h-9 w-9 border">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>
                    {displayName
                      ? displayName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("") || "U"
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Open account menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" sideOffset={8} forceMount>
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{displayName}</span>
                        {user?.email ? <span className="text-xs text-muted-foreground">{user.email}</span> : null}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push(user?.role === "product_owner" ? "/dashboard/owner" : "/dashboard/user")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("common.dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("common.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="pb-4 md:hidden">
          <SearchWithSuggestions
            placeholder={t("header.searchPlaceholder")}
            onSearch={handleSearch}
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-background lg:hidden">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-4">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("common.home")}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("common.about")}
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("common.contact")}
            </Link>
            <div className="border-t pt-4 space-y-3">
              {isAuthenticated && !loading ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{displayName || t("common.welcome")}</span>
                      {user?.email ? <span className="text-xs text-muted-foreground">{user.email}</span> : null}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => { router.push(user?.role === "product_owner" ? "/dashboard/owner" : "/dashboard/user"); setMobileMenuOpen(false); }}>
                    {t("common.dashboard")}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                    {t("common.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login?type=user">
                    <Button variant="outline" className="w-full mb-2 bg-transparent" onClick={() => setMobileMenuOpen(false)}>
                      {t("auth.asUserPurchaser")}
                    </Button>
                  </Link>
                  <Link href="/login?type=owner">
                    <Button variant="default" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                      {t("auth.asProductOwner")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
