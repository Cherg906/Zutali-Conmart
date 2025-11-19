// Database utility functions
// This will be used to connect to PostgreSQL when database is set up

export interface User {
    id: number
    email: string
    full_name: string
    phone?: string
    role: "free" | "standard" | "premium"
    is_verified: boolean
    quotations_used: number
    quotations_limit: number
    subscription_end_date?: string
  }
  
  export interface ProductOwner {
    id: number
    email: string
    business_name: string
    contact_person: string
    phone: string
    address?: string
    tier: "free" | "standard" | "premium"
    is_verified: boolean
    products_count: number
    products_limit: number
    subscription_end_date?: string
  }
  
  export interface Admin {
    id: number
    email: string
    full_name: string
    role: "admin" | "super_admin"
  }
  
  export interface Product {
    id: number
    product_owner_id: number
    category_id: number
    name_en: string
    name_am: string
    description_en: string
    description_am: string
    price: number
    unit: string
    stock_quantity: number
    images: string[]
    is_sustainable: boolean
    sustainability_info_en?: string
    sustainability_info_am?: string
    is_active: boolean
    views_count: number
    created_at: string
  }
  
  export interface Category {
    id: number
    name_en: string
    name_am: string
    description_en?: string
    description_am?: string
    icon?: string
  }
  
  export interface Quotation {
    id: number
    user_id: number
    product_id: number
    product_owner_id: number
    quantity: number
    message?: string
    status: "pending" | "responded" | "accepted" | "rejected"
    response_message?: string
    quoted_price?: number
    created_at: string
  }
  
  // Mock data for development (replace with real database queries later)
  export const mockUsers: User[] = [
    {
      id: 1,
      email: "user@example.com",
      full_name: "Test User",
      role: "standard",
      is_verified: true,
      quotations_used: 3,
      quotations_limit: 10,
      subscription_end_date: "2025-12-31",
    },
  ]
  
  export const mockProductOwners: ProductOwner[] = [
    {
      id: 1,
      email: "owner@example.com",
      business_name: "Green Build Supplies",
      contact_person: "John Doe",
      phone: "+251911234567",
      tier: "standard",
      is_verified: true,
      products_count: 3,
      products_limit: 10,
      subscription_end_date: "2025-12-31",
    },
  ]
  
  export const mockAdmins: Admin[] = [
    {
      id: 1,
      email: "admin@zutali.com",
      full_name: "System Admin",
      role: "super_admin",
    },
  ]
  
  export const mockCategories: Category[] = [
    { id: 1, name_en: "Cement", name_am: "ሲሚንቶ", icon: "Package" },
    { id: 2, name_en: "Steel & Iron", name_am: "ብረት", icon: "Hammer" },
    { id: 3, name_en: "Bricks & Blocks", name_am: "እንጨት እና ብሎኮች", icon: "Box" },
    { id: 4, name_en: "Wood & Timber", name_am: "እንጨት", icon: "Trees" },
    { id: 5, name_en: "Paint & Coatings", name_am: "ቀለም", icon: "Paintbrush" },
    { id: 6, name_en: "Plumbing", name_am: "የቧንቧ ስራ", icon: "Wrench" },
    { id: 7, name_en: "Electrical", name_am: "ኤሌክትሪክ", icon: "Zap" },
    { id: 8, name_en: "Roofing", name_am: "ጣራ", icon: "Home" },
    { id: 9, name_en: "Insulation", name_am: "መከላከያ", icon: "Shield" },
    { id: 10, name_en: "Sustainable Materials", name_am: "ዘላቂ ቁሳቁሶች", icon: "Leaf" },
  ]
  
  export const mockProducts: Product[] = [
    {
      id: 1,
      product_owner_id: 1,
      category_id: 1,
      name_en: "Eco Cement Type I",
      name_am: "ኢኮ ሲሚንቶ ዓይነት I",
      description_en: "High-quality eco-friendly cement with reduced carbon footprint",
      description_am: "ዝቅተኛ የካርቦን አሻራ ያለው ከፍተኛ ጥራት ያለው ለአካባቢ ተስማሚ ሲሚንቶ",
      price: 850.0,
      unit: "bag",
      stock_quantity: 500,
      images: ["/eco-cement-bag.jpg"],
      is_sustainable: true,
      sustainability_info_en: "Made with 30% recycled materials",
      sustainability_info_am: "30% እንደገና ጥቅም ላይ ከዋሉ ቁሳቁሶች የተሰራ",
      is_active: true,
      views_count: 245,
      created_at: "2025-01-15",
    },
    {
      id: 2,
      product_owner_id: 1,
      category_id: 2,
      name_en: "Recycled Steel Bars 12mm",
      name_am: "እንደገና ጥቅም ላይ የዋለ የብረት አሞሌ 12ሚሜ",
      description_en: "Durable steel reinforcement bars made from recycled steel",
      description_am: "እንደገና ጥቅም ላይ ከዋለ ብረት የተሰራ ዘላቂ የብረት ማጠናከሪያ አሞሌዎች",
      price: 45.0,
      unit: "meter",
      stock_quantity: 1000,
      images: ["/steel-reinforcement-bars.jpg"],
      is_sustainable: true,
      sustainability_info_en: "100% recycled steel, same strength as new steel",
      sustainability_info_am: "100% እንደገና ጥቅም ላይ የዋለ ብረት፣ ከአዲስ ብረት ጋር ተመሳሳይ ጥንካሬ",
      is_active: true,
      views_count: 189,
      created_at: "2025-01-20",
    },
    {
      id: 3,
      product_owner_id: 1,
      category_id: 3,
      name_en: "Compressed Earth Blocks",
      name_am: "የተጨመቀ የምድር ብሎኮች",
      description_en: "Sustainable building blocks made from compressed earth",
      description_am: "ከተጨመቀ흙 የተሰሩ ዘላቂ የግንባታ ብሎኮች",
      price: 12.0,
      unit: "piece",
      stock_quantity: 5000,
      images: ["/compressed-earth-blocks.jpg"],
      is_sustainable: true,
      sustainability_info_en: "Natural, biodegradable, excellent thermal properties",
      sustainability_info_am: "ተፈጥሯዊ፣ ሊበሰብስ የሚችል፣ በጣም ጥሩ የሙቀት ባህሪያት",
      is_active: true,
      views_count: 312,
      created_at: "2025-02-01",
    },
  ]
  
  // Helper function to hash passwords (use bcrypt in production)
  export function hashPassword(password: string): string {
    // In production, use bcrypt: return bcrypt.hashSync(password, 10)
    return `hashed_${password}`
  }
  
  // Helper function to verify passwords
  export function verifyPassword(password: string, hash: string): boolean {
    // In production, use bcrypt: return bcrypt.compareSync(password, hash)
    return hash === `hashed_${password}`
  }
  