-- Insert initial categories
INSERT INTO public.categories (name_en, name_am, description_en, description_am, icon) VALUES
('Cement & Binders', 'ሲሚንቶ እና ማያያዣዎች', 'Eco-friendly cement and binding materials', 'ለአካባቢ ተስማሚ ሲሚንቶ እና ማያያዣ ቁሳቁሶች', '🏗️'),
('Bricks & Blocks', 'ጡብ እና ብሎኮች', 'Sustainable bricks and building blocks', 'ዘላቂ ጡብ እና የግንባታ ብሎኮች', '🧱'),
('Steel & Metal', 'ብረት እና ብረታ ብረት', 'Recycled and sustainable steel products', 'እንደገና ጥቅም ላይ የዋለ እና ዘላቂ የብረት ምርቶች', '⚙️'),
('Wood & Timber', 'እንጨት', 'Sustainably sourced wood and timber', 'በዘላቂነት የተገኘ እንጨት', '🌲'),
('Insulation', 'መከላከያ', 'Eco-friendly insulation materials', 'ለአካባቢ ተስማሚ የመከላከያ ቁሳቁሶች', '🏠'),
('Roofing', 'ጣራ', 'Sustainable roofing materials', 'ዘላቂ የጣራ ቁሳቁሶች', '🏘️'),
('Paint & Coatings', 'ቀለም እና ሽፋን', 'Low-VOC and eco-friendly paints', 'ዝቅተኛ VOC እና ለአካባቢ ተስማሚ ቀለሞች', '🎨'),
('Flooring', 'ወለል', 'Sustainable flooring options', 'ዘላቂ የወለል አማራጮች', '📐')
ON CONFLICT DO NOTHING;
