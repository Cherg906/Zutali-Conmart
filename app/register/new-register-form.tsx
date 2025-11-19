"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";

type UserRole = 'user' | 'product_owner';

export function NewRegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('user');
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { t, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!termsAccepted) {
      setError(language === "en" ? "Please accept the terms and privacy policy." : "እባክዎ የደንብ ስምምነትና የግላዊነት ፖሊሲ ይስማሙ።");
      return;
    }

    if (password !== confirmPassword) {
      setError(language === "en" ? "Passwords do not match." : "የይለፍ ቃሎች አይመሳሰሉም።");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined,
          password,
          password_confirm: confirmPassword,
          role,
          // Additional fields for product owners
          ...(role === 'product_owner' && {
            business_name: `${firstName}'s Business`,
            business_description: '',
            business_address: ''
          })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect to dashboard or login page
      router.push('/login?registered=true');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || (language === "en" ? "Registration failed. Please try again." : "ምዝገባ አልተሳካም። እባክዎ እንደገና ይሞክሩ።"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {language === 'en' ? 'Create an account' : 'መለያ ይፍጠሩ'}
        </CardTitle>
        <CardDescription>
          {language === 'en' 
            ? 'Enter your information to create an account' 
            : 'መረጃዎትን ያስገቡ እና መለያ ይፍጠሩ'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {language === 'en' ? 'First Name' : 'የመጀመሪያ ስም'}
              </Label>
              <Input
                id="firstName"
                placeholder={language === 'en' ? 'John' : 'ያሬድ'}
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {language === 'en' ? 'Last Name' : 'የአባት ስም'}
              </Label>
              <Input
                id="lastName"
                placeholder={language === 'en' ? 'Doe' : 'አለማየሁ'}
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              {language === 'en' ? 'Username' : 'የተጠቃሚ ስም'}
            </Label>
            <Input
              id="username"
              placeholder={language === 'en' ? 'johndoe' : 'yared'}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {language === 'en' ? 'Email' : 'ኢሜይል'}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              {language === 'en' ? 'Phone (Optional)' : 'ስልክ (አማራጭ)'}
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+251 9XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {language === 'en' ? 'Password' : 'የይለፍ ቃል'}
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {language === 'en' ? 'Confirm Password' : 'የይለፍ ቃል ያረጋግጡ'}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'en' ? 'I am a' : 'እኔ ነኝ'}</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="userRole"
                  name="role"
                  checked={role === 'user'}
                  onChange={() => setRole('user')}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <Label htmlFor="userRole">
                  {language === 'en' ? 'Buyer' : 'ገዢ'}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="ownerRole"
                  name="role"
                  checked={role === 'product_owner'}
                  onChange={() => setRole('product_owner')}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <Label htmlFor="ownerRole">
                  {language === 'en' ? 'Seller' : 'አቅራቢ'}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {language === 'en' ? (
                  <>
                    I agree to the{' '}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                      Privacy Policy
                    </Link>
                  </>
                ) : (
                  <>
                    ከ{' '}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                      የአገልግሎት ውሎች
                    </Link>{' '}
                    እና{' '}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                      የግላዊነት ፖሊሲ
                    </Link>{' '}
                    ጋር ተስማምቻለሁ
                  </>
                )}
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading 
              ? (language === 'en' ? 'Creating account...' : 'መለያ እየተፈጠረ...')
              : (language === 'en' ? 'Create account' : 'መለያ ይፍጠሩ')
            }
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {language === 'en' ? 'Already have an account? ' : 'ቀድመው ያለዎት መለያ አለ? '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              {language === 'en' ? 'Sign in' : 'ግባ'}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
