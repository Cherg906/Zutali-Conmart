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

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_owner ON public.products(product_owner_id);
