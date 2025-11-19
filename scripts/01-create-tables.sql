-- Rewriting entire schema to use Supabase auth and add RLS policies

-- User profiles table (references auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'free' CHECK (role IN ('free', 'standard', 'premium')),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_document TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  quotations_used INTEGER DEFAULT 0,
  quotations_limit INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Owner profiles table (references auth.users)
CREATE TABLE IF NOT EXISTS public.product_owner_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'premium')),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_document TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  products_count INTEGER DEFAULT 0,
  products_limit INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin profiles table (references auth.users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_am TEXT NOT NULL,
  description_en TEXT,
  description_am TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_owner_id UUID REFERENCES public.product_owner_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name_en TEXT NOT NULL,
  name_am TEXT NOT NULL,
  description_en TEXT,
  description_am TEXT,
  price DECIMAL(10, 2),
  unit TEXT,
  stock_quantity INTEGER DEFAULT 0,
  images TEXT[],
  is_sustainable BOOLEAN DEFAULT TRUE,
  sustainability_info_en TEXT,
  sustainability_info_am TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_owner_id UUID REFERENCES public.product_owner_profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected')),
  response_message TEXT,
  quoted_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('user', 'product_owner')),
  receiver_id UUID NOT NULL,
  receiver_type TEXT CHECK (receiver_type IN ('user', 'product_owner')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  product_owner_id UUID,
  user_type TEXT CHECK (user_type IN ('user', 'product_owner')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  product_owner_id UUID,
  user_type TEXT CHECK (user_type IN ('user', 'product_owner')),
  plan_type TEXT CHECK (plan_type IN ('standard', 'premium')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_owner ON public.products(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_quotations_user ON public.quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_product ON public.quotations(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id, receiver_type);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for product_owner_profiles
CREATE POLICY "Product owners can view their own profile" ON public.product_owner_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Product owners can update their own profile" ON public.product_owner_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Product owners can insert their own profile" ON public.product_owner_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for admin_profiles
CREATE POLICY "Admins can view their own profile" ON public.admin_profiles FOR SELECT USING (auth.uid() = id);

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO PUBLIC USING (true);

-- RLS Policies for products (public read, owner write)
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Product owners can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = product_owner_id);
CREATE POLICY "Product owners can update their own products" ON public.products FOR UPDATE USING (auth.uid() = product_owner_id);
CREATE POLICY "Product owners can delete their own products" ON public.products FOR DELETE USING (auth.uid() = product_owner_id);

-- RLS Policies for quotations
CREATE POLICY "Users can view their own quotations" ON public.quotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Product owners can view quotations for their products" ON public.quotations FOR SELECT USING (auth.uid() = product_owner_id);
CREATE POLICY "Users can create quotations" ON public.quotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Product owners can update quotations for their products" ON public.quotations FOR UPDATE USING (auth.uid() = product_owner_id);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (
  (sender_type = 'user' AND auth.uid() = sender_id) OR 
  (receiver_type = 'user' AND auth.uid() = receiver_id) OR
  (sender_type = 'product_owner' AND auth.uid() = sender_id) OR 
  (receiver_type = 'product_owner' AND auth.uid() = receiver_id)
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  (sender_type = 'user' AND auth.uid() = sender_id) OR
  (sender_type = 'product_owner' AND auth.uid() = sender_id)
);

-- RLS Policies for verification_requests
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests FOR SELECT USING (
  (user_type = 'user' AND auth.uid() = user_id) OR
  (user_type = 'product_owner' AND auth.uid() = product_owner_id)
);
CREATE POLICY "Users can create verification requests" ON public.verification_requests FOR INSERT WITH CHECK (
  (user_type = 'user' AND auth.uid() = user_id) OR
  (user_type = 'product_owner' AND auth.uid() = product_owner_id)
);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (
  (user_type = 'user' AND auth.uid() = user_id) OR
  (user_type = 'product_owner' AND auth.uid() = product_owner_id)
);
