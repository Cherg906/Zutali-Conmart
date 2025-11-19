"use client"

import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"
import { AIChatbot } from "@/components/chat/ai-chatbot"
import { useLanguage } from "@/lib/language-context"

export function Footer() {
  const { t } = useLanguage()

  return (
    <>
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <span className="text-xl font-bold text-primary-foreground">Z</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold leading-none text-primary">Zutali</span>
                  <span className="text-xs text-muted-foreground">Conmart</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("footer.companyDescription")}</p>
            </div>

            {/* My Account */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">{t("footer.myAccount")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/login?type=user" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.login")}
                  </Link>
                </li>
                <li>
                  <Link href="/register?type=user" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.register")}
                  </Link>
                </li>
                <li>
                  <Link href="/register?type=owner" className="text-muted-foreground transition-colors hover:text-primary">
                    Register as Supplier
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.dashboard")}
                  </Link>
                </li>
                <li>
                  <Link href="/favorites" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.favorites")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">{t("footer.quickLinks")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.home")}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.about")}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("common.contact")}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
                    {t("footer.privacyPolicy")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="mb-4 text-sm font-semibold">{t("footer.contactUs")}</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-muted-foreground">+251 11 XXX XXXX</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-muted-foreground">info@zutaliconmart.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-muted-foreground">Addis Ababa, Ethiopia</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Zutali Conmart. {t("footer.allRightsReserved")}
            </p>
            <p className="text-sm text-muted-foreground">{t("footer.developedWith")}</p>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <AIChatbot />
    </>
  )
}
