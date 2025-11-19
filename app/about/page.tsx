"use client"

import { Shield, Users, Target, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"

export default function AboutPage() {
  const { t, language } = useLanguage()

  const values = [
    {
      icon: Shield,
      title: language === "en" ? "Trust & Transparency" : "እምነት እና ግልጽነት",
      description:
        language === "en"
          ? "We verify all suppliers and ensure transparent pricing and product information."
          : "ሁሉንም አቅራቢዎች እናረጋግጣለን እና ግልጽ የዋጋ አወጣጥ እና የምርት መረጃን እናረጋግጣለን።",
    },
    {
      icon: Users,
      title: language === "en" ? "Community First" : "ማህበረሰብ በመጀመሪያ",
      description:
        language === "en"
          ? "Building a community of trusted suppliers and satisfied customers across Ethiopia."
          : "በመላ ኢትዮጵያ የታመኑ አቅራቢዎች እና የረኩ ደንበኞች ማህበረሰብ መገንባት።",
    },
    {
      icon: Target,
      title: language === "en" ? "Sustainability" : "ዘላቂነት",
      description:
        language === "en"
          ? "Promoting sustainable construction materials and practices for a better future."
          : "ለተሻለ ወደፊት ዘላቂ የግንባታ ቁሳቁሶችን እና ልምዶችን ማስተዋወቅ።",
    },
    {
      icon: Award,
      title: language === "en" ? "Quality Assurance" : "የጥራት ማረጋገጫ",
      description:
        language === "en"
          ? "Only the highest quality construction materials from verified suppliers."
          : "ከተረጋገጡ አቅራቢዎች ከፍተኛ ጥራት ያላቸው የግንባታ ቁሳቁሶች ብቻ።",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-balance">
          {language === "en" ? "About Zutali Conmart" : "ስለ ዙታሊ ኮንማርት"}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty leading-relaxed">
          {language === "en"
            ? "Ethiopia's premier marketplace connecting construction professionals with verified suppliers of sustainable building materials."
            : "የኢትዮጵያ ዋና ገበያ የግንባታ ባለሙያዎችን ከተረጋገጡ የዘላቂ የግንባታ ቁሳቁሶች አቅራቢዎች ጋር የሚያገናኝ።"}
        </p>
      </div>

      {/* Mission Section */}
      <div className="mb-16">
        <Card>
          <CardContent className="p-8">
            <h2 className="mb-4 text-2xl font-bold">{t("about.ourMission")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("about.ourMissionDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">{t("about.whyChooseUs")}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 font-semibold">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold">1,200+</div>
                <p className="text-primary-foreground/90">{language === "en" ? "Active Users" : "ንቁ ተጠቃሚዎች"}</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold">150+</div>
                <p className="text-primary-foreground/90">{t("about.verifiedSuppliers")}</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold">2,500+</div>
                <p className="text-primary-foreground/90">{language === "en" ? "Products Listed" : "የተዘረዘሩ ምርቶች"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Story Section */}
      <div>
        <Card>
          <CardContent className="p-8">
            <h2 className="mb-4 text-2xl font-bold">{language === "en" ? "Our Story" : "የእኛ ታሪክ"}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {language === "en"
                  ? "Zutali Conmart was born from the recognition that Ethiopia's construction industry needed a modern, digital solution to connect suppliers with buyers. Traditional methods of sourcing construction materials were time-consuming, opaque, and often unreliable."
                  : "ዙታሊ ኮንማርት የተወለደው የኢትዮጵያ የግንባታ ኢንዱስትሪ አቅራቢዎችን ከገዢዎች ጋር ለማገናኘት ዘመናዊ፣ ዲጂታል መፍትሄ እንደሚያስፈልገው ከመገንዘብ ነው። ባህላዊ የግንባታ ቁሳቁሶችን የማግኘት ዘዴዎች ጊዜ የሚወስዱ፣ ግልጽ ያልሆኑ እና ብዙ ጊዜ አስተማማኝ ያልሆኑ ነበሩ።"}
              </p>
              <p>
                {language === "en"
                  ? "We set out to change that by creating a platform where verified suppliers can showcase their products, and buyers can easily compare options, request quotations, and make informed decisions. Our focus on sustainability ensures that we're not just building a marketplace, but contributing to a more sustainable future for Ethiopia's construction industry."
                  : "የተረጋገጡ አቅራቢዎች ምርቶቻቸውን የሚያሳዩበት እና ገዢዎች አማራጮችን በቀላሉ ማወዳደር፣ ግምቶችን መጠየቅ እና በመረጃ ላይ የተመሰረተ ውሳኔ የሚያደርጉበት መድረክ በመፍጠር ይህንን ለመቀየር ተነሳን። በዘላቂነት ላይ ያለን ትኩረት ገበያ ብቻ ሳንሆን ለኢትዮጵያ የግንባታ ኢንዱስትሪ ዘላቂ ወደፊት አስተዋፅኦ እያደረግን መሆናችንን ያረጋግጣል።"}
              </p>
              <p>
                {language === "en"
                  ? "Today, Zutali Conmart serves thousands of users across Ethiopia, from individual builders to large construction companies, all finding the materials they need from trusted, verified suppliers."
                  : "ዛሬ ዙታሊ ኮንማርት በመላ ኢትዮጵያ ከግለሰብ ገንቢዎች እስከ ትላልቅ የግንባታ ኩባንያዎች በሺዎች የሚቆጠሩ ተጠቃሚዎችን ያገለግላል፣ ሁሉም የሚፈልጓቸውን ቁሳቁሶች ከታመኑ፣ ከተረጋገጡ አቅራቢዎች ያገኛሉ።"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
