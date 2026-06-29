-- Suzi sample catalog — run manually in the Supabase SQL Editor.
-- Pure INSERTs against the existing `products` table; no schema changes.
-- id / created_at / updated_at / embedding are left to their column defaults.
-- All rows use source = 'seed' so they're easy to find or delete later:
--   delete from public.products where source = 'seed';

insert into public.products
  (source, external_id, merchant, brand, title, description, category,
   price, original_price, currency, image_url, product_url,
   colors, sizes, in_stock, attributes)
values
  ('seed', 'seed-001', 'Zara', 'Zara', 'Oversized Wool Blend Coat',
   'Longline double-breasted coat in a soft wool blend.', 'coat',
   1899.95, 2499.95, 'TRY', 'https://picsum.photos/seed/suzi-1/600/800', 'https://example.com/p/seed-001',
   array['camel','black'], array['XS','S','M','L'], true, '{"material":"wool blend","fit":"oversized"}'::jsonb),

  ('seed', 'seed-002', 'Nike', 'Nike', 'Air Force 1 ''07 Sneakers',
   'Classic low-top leather sneakers with Air cushioning.', 'sneakers',
   3299.00, null, 'TRY', 'https://picsum.photos/seed/suzi-2/600/800', 'https://example.com/p/seed-002',
   array['white'], array['38','39','40','41','42','43','44'], true, '{"material":"leather","gender":"unisex"}'::jsonb),

  ('seed', 'seed-003', 'Mango', 'Mango', 'Linen Midi Slip Dress',
   'Bias-cut slip dress in breathable linen for warm days.', 'dress',
   899.99, 1199.99, 'TRY', 'https://picsum.photos/seed/suzi-3/600/800', 'https://example.com/p/seed-003',
   array['sage','ecru','black'], array['XS','S','M','L'], true, '{"material":"linen","season":"summer"}'::jsonb),

  ('seed', 'seed-004', 'Levi''s', 'Levi''s', '501 Original Straight Jeans',
   'The original straight-fit jean in rigid denim.', 'jeans',
   129.90, null, 'USD', 'https://picsum.photos/seed/suzi-4/600/800', 'https://example.com/p/seed-004',
   array['indigo','black','light wash'], array['28','30','32','34','36'], true, '{"material":"denim","fit":"straight"}'::jsonb),

  ('seed', 'seed-005', 'COS', 'COS', 'Relaxed Cotton Poplin Shirt',
   'Crisp poplin shirt with a relaxed silhouette.', 'shirt',
   75.00, 95.00, 'EUR', 'https://picsum.photos/seed/suzi-5/600/800', 'https://example.com/p/seed-005',
   array['white','sky blue'], array['S','M','L','XL'], true, '{"material":"cotton","fit":"relaxed"}'::jsonb),

  ('seed', 'seed-006', 'Adidas', 'adidas Originals', 'Sambae Leather Trainers',
   'Retro terrace-style trainers with a gum sole.', 'sneakers',
   2799.00, 2999.00, 'TRY', 'https://picsum.photos/seed/suzi-6/600/800', 'https://example.com/p/seed-006',
   array['black','white'], array['37','38','39','40','41','42'], true, '{"material":"leather","style":"retro"}'::jsonb),

  ('seed', 'seed-007', 'Massimo Dutti', 'Massimo Dutti', 'Cashmere Crew Sweater',
   'Lightweight pure cashmere knit with ribbed trims.', 'sweater',
   159.00, null, 'EUR', 'https://picsum.photos/seed/suzi-7/600/800', 'https://example.com/p/seed-007',
   array['grey','navy','cream'], array['S','M','L'], true, '{"material":"cashmere","weight":"light"}'::jsonb),

  ('seed', 'seed-008', 'Stradivarius', 'Stradivarius', 'Pleated Mini Skirt',
   'High-waisted pleated mini skirt with side zip.', 'skirt',
   499.95, 699.95, 'TRY', 'https://picsum.photos/seed/suzi-8/600/800', 'https://example.com/p/seed-008',
   array['black','burgundy'], array['XS','S','M','L'], true, '{"material":"polyester","fit":"high-waist"}'::jsonb),

  ('seed', 'seed-009', 'The North Face', 'The North Face', 'Nuptse 1996 Puffer Jacket',
   'Iconic baffled down puffer with a stowaway hood.', 'jacket',
   320.00, null, 'USD', 'https://picsum.photos/seed/suzi-9/600/800', 'https://example.com/p/seed-009',
   array['black','tnf yellow','green'], array['S','M','L','XL'], true, '{"material":"down","season":"winter"}'::jsonb),

  ('seed', 'seed-010', 'Polene', 'Polène', 'Numéro Un Leather Tote',
   'Structured top-handle tote in smooth textured leather.', 'bag',
   390.00, null, 'EUR', 'https://picsum.photos/seed/suzi-10/600/800', 'https://example.com/p/seed-010',
   array['camel','black','taupe'], array['One Size'], true, '{"material":"leather","compartments":3}'::jsonb),

  ('seed', 'seed-011', 'Ray-Ban', 'Ray-Ban', 'Wayfarer Sunglasses',
   'Timeless acetate Wayfarer frames with UV400 lenses.', 'sunglasses',
   4499.00, 4999.00, 'TRY', 'https://picsum.photos/seed/suzi-11/600/800', 'https://example.com/p/seed-011',
   array['black','tortoise'], array['One Size'], true, '{"material":"acetate","uv":"400"}'::jsonb),

  ('seed', 'seed-012', 'Uniqlo', 'Uniqlo', 'Supima Cotton Crew T-Shirt',
   'Everyday crew-neck tee in soft Supima cotton.', 't-shirt',
   12.90, null, 'USD', 'https://picsum.photos/seed/suzi-12/600/800', 'https://example.com/p/seed-012',
   array['white','black','navy','olive'], array['XS','S','M','L','XL'], true, '{"material":"supima cotton","fit":"regular"}'::jsonb);
