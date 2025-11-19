"use client"

import { useState } from "react"
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/language-context"

export default function ContactPage() {
  const { t, language } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      firstName: formData.get('first-name'),
      lastName: formData.get('last-name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      subject: formData.get('subject'),
      message: formData.get('message')
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert(language === 'en' ? 'Message sent successfully!' : 'መልእክት በተሳካ ሁኔታ ተልኳል!')
        e.currentTarget.reset()
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      alert(language === 'en' ? 'Failed to send message. Please try again.' : 'መልእክት መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("contact.getInTouch")}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("contact.getInTouchDesc")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "en" ? "Send us a Message" : "መልእክት ይላኩልን"}</CardTitle>
            <CardDescription>
              {language === "en"
                ? "Fill out the form below and we'll get back to you shortly"
                : "ከዚህ በታች ያለውን ቅጽ ይሙሉ እና በቅርቡ እናገኝዎታለን"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="first-name">{language === "en" ? "First Name" : "የመጀመሪያ ስም"}</Label>
                  <Input id="first-name" name="first-name" placeholder={language === "en" ? "John" : "አበበ"} className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="last-name">{language === "en" ? "Last Name" : "የአባት ስም"}</Label>
                  <Input id="last-name" name="last-name" placeholder={language === "en" ? "Doe" : "ከበደ"} className="mt-2" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" name="email" type="email" placeholder="john@example.com" className="mt-2" required />
              </div>
              <div>
                <Label htmlFor="phone">{t("contact.phoneNumber")}</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+251 9XX XXX XXX" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="subject">{t("contact.subject")}</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder={language === "en" ? "How can we help?" : "እንዴት ልንረዳዎ እንችላለን?"}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">{t("contact.message")}</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder={language === "en" ? "Tell us more about your inquiry..." : "ስለ ጥያቄዎ የበለጠ ይንገሩን..."}
                  className="mt-2"
                  rows={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (language === "en" ? "Sending..." : "በመላክ ላይ...") : t("contact.sendMessage")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("contact.contactInfo")}</CardTitle>
              <CardDescription>
                {language === "en" ? "Get in touch with us through any of these channels" : "በእነዚህ ቻናሎች በማንኛውም ያግኙን"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{language === "en" ? "Phone" : "ስልክ"}</h4>
                  <p className="text-sm text-muted-foreground">+251 11 XXX XXXX</p>
                  <p className="text-sm text-muted-foreground">+251 911 XXX XXX</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{language === "en" ? "Email" : "ኢሜይል"}</h4>
                  <p className="text-sm text-muted-foreground">info@zutaliconmart.com</p>
                  <p className="text-sm text-muted-foreground">support@zutaliconmart.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{language === "en" ? "Address" : "አድራሻ"}</h4>
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Bole Road" : "ቦሌ መንገድ"}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === "en" ? "Addis Ababa, Ethiopia" : "አዲስ አበባ፣ ኢትዮጵያ"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{language === "en" ? "Business Hours" : "የስራ ሰዓት"}</h4>
                  <p className="text-sm text-muted-foreground">
                    {language === "en" ? "Monday - Friday: 8:00 AM - 6:00 PM" : "ሰኞ - አርብ: 8:00 ጠዋት - 6:00 ምሽት"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "en" ? "Saturday: 9:00 AM - 4:00 PM" : "ቅዳሜ: 9:00 ጠዋት - 4:00 ከሰዓት"}
                  </p>
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Sunday: Closed" : "እሁድ: ዝግ"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="mb-2 text-lg font-semibold">
                {language === "en" ? "Need Immediate Help?" : "አስቸኳይ እርዳታ ይፈልጋሉ?"}
              </h3>
              <p className="mb-4 text-sm text-primary-foreground/90">
                {language === "en"
                  ? "Our AI assistant is available 24/7 to answer your questions. Click the chat button in the bottom right corner to get started."
                  : "የእኛ AI ረዳት ጥያቄዎችዎን ለመመለስ 24/7 ይገኛል። ለመጀመር በታችኛው ቀኝ ጥግ ላይ ያለውን የውይይት ቁልፍ ይጫኑ።"}
              </p>
              <Button variant="secondary" onClick={() => setShowChat(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {language === "en" ? "Chat with AI Assistant" : "ከ AI ረዳት ጋር ይወያዩ"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
