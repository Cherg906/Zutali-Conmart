"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { TierSelect } from "@/components/ui/tier-select";
import { PasswordInput } from "@/components/ui/password-input";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userType = searchParams.get("type") || "user";

  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">("email");
  const [emailTier, setEmailTier] = useState("free");
  const [phoneTier, setPhoneTier] = useState("free");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { t, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert(language === "en" ? "Please accept the terms and privacy policy." : "እባክዎ የደንብ ስምምነትና የግላዊነት ፖሊሲ ይስማሙ።");
      return;
    }

    if (password !== confirmPassword) {
      alert(language === "en" ? "Passwords do not match." : "የይለፍ ቃሎች አይመሳሰሉም።");
      return;
    }

    const normalizedUserType = userType === "owner" ? "product_owner" : userType

    const payload = {
      username: registerMethod === "email" ? email : phone,
      email: registerMethod === "email" ? email : undefined,
      phone: registerMethod === "phone" ? phone : undefined,
      password,
      confirmPassword,
      password_confirm: confirmPassword,
      fullName,
      userType: normalizedUserType,
      first_name: fullName.split(' ')[0] || fullName,
      last_name: fullName.split(' ').slice(1).join(' ') || '',
      role: normalizedUserType,
      tier: registerMethod === "email" ? emailTier : phoneTier,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || (language === "en" ? "Registration failed" : "የመመዝገቢያ ሂደት አልተሳካም።"));
        return;
      }

      alert(language === "en" ? "Registration successful!" : "መመዝገቢያ ተሳክቷል!");
      router.push(`/login?type=${userType}`);
    } catch (error) {
      console.error("Registration error:", error);
      alert(language === "en" ? "An error occurred during registration." : "በመመዝገቢያ ሂደት ላይ ስህተት ተፈጥሯል።");
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{language === "en" ? "Create Account" : "መለያ ይፍጠሩ"}</CardTitle>
          <CardDescription>
            {userType === "owner"
              ? language === "en"
                ? "Register as a product owner"
                : "እንደ ምርት ባለቤት ይመዝገቡ"
              : language === "en"
                ? "Register as a user/purchaser"
                : "እንደ ተጠቃሚ ይመዝገቡ"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={registerMethod} onValueChange={(v) => setRegisterMethod(v as "email" | "phone")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{language === "en" ? "Email" : "ኢሜይል"}</TabsTrigger>
              <TabsTrigger value="phone">{language === "en" ? "Phone" : "ስልክ"}</TabsTrigger>
            </TabsList>

            {/* Email Registration */}
            <TabsContent value="email">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("auth.fullName")}</Label>
                  <Input
                    id="name"
                    name="fullName"
                    type="text"
                    placeholder={language === "en" ? "Your full name" : "ሙሉ ስምዎ"}
                    className="mt-2"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    className="mt-2"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    className="mt-2"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                  <PasswordInput
                    id="confirm-password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    className="mt-2"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
                  <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                    {language === "en" ? "I agree to the " : "እስማማለሁ "}
                    <Link href="/terms" className="text-primary hover:underline">{t("footer.termsOfService")}</Link>
                    {language === "en" ? " and " : " እና "}
                    <Link href="/privacy" className="text-primary hover:underline">{t("footer.privacyPolicy")}</Link>
                  </Label>
                </div>
                <div>
                  <TierSelect
                    label={userType === "owner" ? "Product Owner Tier" : "User Tier"}
                    tiers={userType === "owner" ? [
                      { 
                        value: "basic", 
                        label: "Free Trial/Basic", 
                        description: "Perfect for getting started",
                        features: ["1 product listing", "Basic support", "Standard verification"]
                      },
                      { 
                        value: "standard", 
                        label: "Standard - 200 ETB/month", 
                        description: "Great for growing businesses",
                        features: ["10 product listings", "Priority support", "Enhanced verification", "Analytics dashboard"]
                      },
                      { 
                        value: "premium", 
                        label: "Premium - 500 ETB/month", 
                        description: "For established businesses",
                        features: ["Unlimited products", "24/7 support", "Premium verification", "Advanced analytics", "Featured listings"]
                      },
                    ] : [
                      { 
                        value: "free", 
                        label: "Free User", 
                        description: "Basic access to the platform",
                        features: ["Browse products", "Basic search", "Contact suppliers"]
                      },
                      { 
                        value: "standard", 
                        label: "Standard User - 50 ETB/month", 
                        description: "Enhanced user experience",
                        features: ["50 quotation requests/month", "Priority support", "Save favorites", "Advanced search"]
                      },
                      { 
                        value: "premium", 
                        label: "Premium User - 200 ETB/month", 
                        description: "Full platform access",
                        features: ["Unlimited quotations", "24/7 support", "Bulk requests", "Market insights", "Direct messaging"]
                      },
                    ]}
                    value={emailTier}
                    onChange={setEmailTier}
                  />
                </div>
                <Button type="submit" className="w-full">{language === "en" ? "Create Account" : "መለያ ይፍጠሩ"}</Button>
              </form>
            </TabsContent>

            {/* Phone Registration */}
            <TabsContent value="phone">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name-phone">{t("auth.fullName")}</Label>
                  <Input
                    id="name-phone"
                    name="fullName"
                    type="text"
                    placeholder={language === "en" ? "Your full name" : "ሙሉ ስምዎ"}
                    className="mt-2"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+251 9XX XXX XXX"
                    className="mt-2"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password-phone">{t("auth.password")}</Label>
                  <PasswordInput
                    id="password-phone"
                    name="password"
                    placeholder="••••••••"
                    className="mt-2"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password-phone">{t("auth.confirmPassword")}</Label>
                  <PasswordInput
                    id="confirm-password-phone"
                    name="confirmPassword"
                    placeholder="••••••••"
                    className="mt-2"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms-phone" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
                  <Label htmlFor="terms-phone" className="text-sm font-normal leading-relaxed cursor-pointer">
                    {language === "en" ? "I agree to the " : "እስማማለሁ "}
                    <Link href="/terms" className="text-primary hover:underline">{t("footer.termsOfService")}</Link>
                    {language === "en" ? " and " : " እና "}
                    <Link href="/privacy" className="text-primary hover:underline">{t("footer.privacyPolicy")}</Link>
                  </Label>
                </div>
                <div>
                  <TierSelect
                    label={userType === "owner" ? "Product Owner Tier" : "User Tier"}
                    tiers={userType === "owner" ? [
                      { 
                        value: "basic", 
                        label: "Free Trial/Basic", 
                        description: "Perfect for getting started",
                        features: ["1 product listing", "Basic support", "Standard verification"]
                      },
                      { 
                        value: "standard", 
                        label: "Standard - 200 ETB/month", 
                        description: "Great for growing businesses",
                        features: ["10 product listings", "Priority support", "Enhanced verification", "Analytics dashboard"]
                      },
                      { 
                        value: "premium", 
                        label: "Premium - 500 ETB/month", 
                        description: "For established businesses",
                        features: ["Unlimited products", "24/7 support", "Premium verification", "Advanced analytics", "Featured listings"]
                      },
                    ] : [
                      { 
                        value: "free", 
                        label: "Free User", 
                        description: "Basic access to the platform",
                        features: ["Browse products", "Basic search", "Contact suppliers"]
                      },
                      { 
                        value: "standard", 
                        label: "Standard User - 50 ETB/month", 
                        description: "Enhanced user experience",
                        features: ["50 quotation requests/month", "Priority support", "Save favorites", "Advanced search"]
                      },
                      { 
                        value: "premium", 
                        label: "Premium User - 200 ETB/month", 
                        description: "Full platform access",
                        features: ["Unlimited quotations", "24/7 support", "Bulk requests", "Market insights", "Direct messaging"]
                      },
                    ]}
                    value={phoneTier}
                    onChange={setPhoneTier}
                  />
                </div>
                <Button type="submit" className="w-full">{language === "en" ? "Create Account" : "መለያ ይፍጠሩ"}</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t("auth.haveAccount")} </span>
            <Link href={`/login?type=${userType}`} className="text-primary hover:underline">{language === "en" ? "Login here" : "እዚህ ይግቡ"}</Link>
          </div>

          {userType === "user" && (
            <div className="mt-4 text-center text-sm">
              <Link href="/register?type=owner" className="text-muted-foreground hover:text-primary">{language === "en" ? "Register as Product Owner instead" : "በምትኩ እንደ ምርት ባለቤት ይመዝገቡ"}</Link>
            </div>
          )}
          {userType === "owner" && (
            <div className="mt-4 text-center text-sm">
              <Link href="/register?type=user" className="text-muted-foreground hover:text-primary">{language === "en" ? "Register as User instead" : "በምትኩ እንደ ተጠቃሚ ይመዝገቡ"}</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
