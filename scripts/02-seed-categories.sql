-- Insert initial categories
INSERT INTO public.categories (name_en, name_am, description_en, description_am, icon) VALUES
('Cement & Concrete', 'ሲሚንቶ እና ኮንክሪት', 'Sustainable cement and concrete products', 'ዘላቂ ሲሚንቶ እና ኮንክሪት ምርቶች', 'building'),
('Steel & Metal', 'ብረት እና ብረታ ብረት', 'Recycled and sustainable steel products', 'እንደገና ጥቅም ላይ የዋለ እና ዘላቂ የብረት ምርቶች', 'hammer'),
('Bricks & Blocks', 'ጡብ እና ብሎኮች', 'Eco-friendly bricks and building blocks', 'ለአካባቢ ተስማሚ ጡብ እና የግንባታ ብሎኮች', 'box'),
('Wood & Timber', 'እንጨት', 'Sustainably sourced wood and timber', 'በዘላቂነት የተገኘ እንጨት', 'tree'),
('Insulation', 'መከላከያ', 'Energy-efficient insulation materials', 'ኃይል ቆጣቢ የመከላከያ ቁሳቁሶች', 'shield'),
('Roofing', 'ጣራ', 'Sustainable roofing materials', 'ዘላቂ የጣራ ቁሳቁሶች', 'home'),
('Paint & Coatings', 'ቀለም እና ሽፋን', 'Eco-friendly paints and coatings', 'ለአካባቢ ተስማሚ ቀለሞች እና ሽፋኖች', 'palette'),
('Plumbing', 'የቧንቧ ስራ', 'Water-efficient plumbing materials', 'ውሃ ቆጣቢ የቧንቧ ቁሳቁሶች', 'droplet')
ON CONFLICT DO NOTHING;
