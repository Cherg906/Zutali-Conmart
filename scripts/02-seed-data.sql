-- Insert default admin account
-- Password: admin123 (hashed with bcrypt)
INSERT INTO admins (email, password_hash, full_name, role) VALUES
('admin@zutali.com', '$2a$10$rKvVPZqGvVZqGvVZqGvVZOqGvVZqGvVZqGvVZqGvVZqGvVZqGvVZq', 'System Admin', 'super_admin');

-- Insert categories
INSERT INTO categories (name_en, name_am, description_en, description_am, icon) VALUES
('Cement', 'ሲሚንቶ', 'Various types of cement for construction', 'ለግንባታ የተለያዩ የሲሚንቶ ዓይነቶች', 'Package'),
('Steel & Iron', 'ብረት', 'Steel bars, iron sheets, and metal products', 'የብረት አሞሌዎች፣ የብረት ሉሆች እና የብረት ምርቶች', 'Hammer'),
('Bricks & Blocks', 'እንጨት እና ብሎኮች', 'Bricks, concrete blocks, and masonry units', 'ጡቦች፣ የኮንክሪት ብሎኮች እና የግንባታ ክፍሎች', 'Box'),
('Wood & Timber', 'እንጨት', 'Lumber, plywood, and wooden materials', 'እንጨት፣ ፕላይዉድ እና የእንጨት ቁሳቁሶች', 'Trees'),
('Paint & Coatings', 'ቀለም', 'Paints, varnishes, and protective coatings', 'ቀለሞች፣ ቫርኒሾች እና መከላከያ ሽፋኖች', 'Paintbrush'),
('Plumbing', 'የቧንቧ ስራ', 'Pipes, fittings, and plumbing supplies', 'ቧንቧዎች፣ መገጣጠሚያዎች እና የቧንቧ አቅርቦቶች', 'Wrench'),
('Electrical', 'ኤሌክትሪክ', 'Wires, switches, and electrical components', 'ሽቦዎች፣ ማብሪያ ማጥፊያዎች እና የኤሌክትሪክ ክፍሎች', 'Zap'),
('Roofing', 'ጣራ', 'Roofing materials and accessories', 'የጣራ ቁሳቁሶች እና መለዋወጫዎች', 'Home'),
('Insulation', 'መከላከያ', 'Thermal and sound insulation materials', 'የሙቀት እና የድምፅ መከላከያ ቁሳቁሶች', 'Shield'),
('Sustainable Materials', 'ዘላቂ ቁሳቁሶች', 'Eco-friendly and recycled construction materials', 'ለአካባቢ ተስማሚ እና እንደገና ጥቅም ላይ የዋሉ የግንባታ ቁሳቁሶች', 'Leaf');

-- Insert sample product owner (for testing)
-- Password: owner123
INSERT INTO product_owners (email, password_hash, business_name, contact_person, phone, tier, is_verified, products_limit) VALUES
('owner@example.com', '$2a$10$rKvVPZqGvVZqGvVZqGvVZOqGvVZqGvVZqGvVZqGvVZqGvVZqGvVZq', 'Green Build Supplies', 'John Doe', '+251911234567', 'standard', true, 10);

-- Insert sample products
INSERT INTO products (product_owner_id, category_id, name_en, name_am, description_en, description_am, price, unit, stock_quantity, is_sustainable, sustainability_info_en, sustainability_info_am) VALUES
(1, 1, 'Eco Cement Type I', 'ኢኮ ሲሚንቶ ዓይነት I', 'High-quality eco-friendly cement with reduced carbon footprint', 'ዝቅተኛ የካርቦን አሻራ ያለው ከፍተኛ ጥራት ያለው ለአካባቢ ተስማሚ ሲሚንቶ', 850.00, 'bag', 500, true, 'Made with 30% recycled materials', '30% እንደገና ጥቅም ላይ ከዋሉ ቁሳቁሶች የተሰራ'),
(1, 2, 'Recycled Steel Bars 12mm', 'እንደገና ጥቅም ላይ የዋለ የብረት አሞሌ 12ሚሜ', 'Durable steel reinforcement bars made from recycled steel', 'እንደገና ጥቅም ላይ ከዋለ ብረት የተሰራ ዘላቂ የብረት ማጠናከሪያ አሞሌዎች', 45.00, 'meter', 1000, true, '100% recycled steel, same strength as new steel', '100% እንደገና ጥቅም ላይ የዋለ ብረት፣ ከአዲስ ብረት ጋር ተመሳሳይ ጥንካሬ'),
(1, 3, 'Compressed Earth Blocks', 'የተጨመቀ የምድር ብሎኮች', 'Sustainable building blocks made from compressed earth', 'ከተጨመቀ흙 የተሰሩ ዘላቂ የግንባታ ብሎኮች', 12.00, 'piece', 5000, true, 'Natural, biodegradable, excellent thermal properties', 'ተፈጥሯዊ፣ ሊበሰብስ የሚችል፣ በጣም ጥሩ የሙቀት ባህሪያት');
