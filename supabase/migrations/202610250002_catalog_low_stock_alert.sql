create or replace view public.public_catalog_products
  with (security_barrier = true) as
select p.id, p.slug, p.name, p.product_type, p.description, p.colors, p.price_brl,
       p.category_name, p.occasion, p.size, p.materials, p.care_instructions,
       p.flower_meaning, p.pet_toxicity, p.shelf_life, p.content_version,
       coalesce(
         jsonb_agg(jsonb_build_object(
           'objectKey', i.object_key, 'altText', i.alt_text,
           'width', i.width, 'height', i.height, 'mimeType', i.mime_type
         ) order by i.sort_order) filter (where i.id is not null),
         '[]'::jsonb
       ) as images,
       (p.stock_quantity between 1 and 2) as low_stock_alert
from public.catalog_products p
join public.catalog_categories c on c.name = p.category_name
left join public.catalog_product_images i on i.product_id = p.id
where p.status = 'published' and p.stock_quantity > 0
group by p.id;
