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

-- RLS Policies for categories (public read)
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
