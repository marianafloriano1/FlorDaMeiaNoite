create table public.catalog_categories (
  name text primary key,
  constraint catalog_category_name_fixed check (name in (
    'Buquês', 'Arranjos', 'Boxes', 'Embalagens', 'Laços', 'Vasos', 'Ornamentos',
    'Flores', 'Plantas', 'Fertilizantes', 'Terras', 'Sementes',
    'Ferramentas de jardinagem', 'Decorações', 'Pedras', 'Insumos'
  ))
);

insert into public.catalog_categories (name) values
  ('Buquês'), ('Arranjos'), ('Boxes'), ('Embalagens'), ('Laços'), ('Vasos'),
  ('Ornamentos'), ('Flores'), ('Plantas'), ('Fertilizantes'), ('Terras'),
  ('Sementes'), ('Ferramentas de jardinagem'), ('Decorações'), ('Pedras'), ('Insumos');

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  product_type text not null check (length(trim(product_type)) > 0),
  description text not null default '',
  colors text[] not null default '{}',
  price_brl numeric(10,2) not null check (price_brl >= 0),
  category_name text not null references public.catalog_categories(name),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  occasion text,
  size text,
  materials text[] not null default '{}',
  care_instructions text not null default 'Informação não disponível.',
  flower_meaning text not null default 'Informação não disponível.',
  pet_toxicity text not null default 'Informação não disponível.',
  shelf_life text not null default 'Informação não disponível.',
  content_version integer not null default 1 check (content_version > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_products_public_idx on public.catalog_products (status, name)
  where status = 'published' and stock_quantity > 0;

create table public.catalog_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  object_key text not null check (
    object_key ~ '^[A-Za-z0-9_./-]+\.(avif|webp|jpe?g|png)$'
    and object_key !~ '(^/|(^|/)\.\.?(/|$))'
  ),
  alt_text text not null check (length(trim(alt_text)) > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  mime_type text not null check (mime_type in ('image/avif', 'image/webp', 'image/jpeg', 'image/png')),
  sort_order integer not null default 0 check (sort_order >= 0),
  unique (product_id, sort_order)
);

create table public.catalog_product_translations (
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  locale text not null check (locale in ('en', 'es', 'ru')),
  source_version integer not null check (source_version > 0),
  content jsonb not null check (
    jsonb_typeof(content) = 'object'
    and content - array[
      'name', 'product_type', 'description', 'colors', 'category_name', 'occasion', 'size',
      'materials', 'care_instructions', 'flower_meaning', 'pet_toxicity', 'shelf_life'
    ] = '{}'::jsonb
  ),
  created_at timestamptz not null default now(),
  primary key (product_id, locale, source_version)
);

alter table public.catalog_categories enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_product_images enable row level security;
alter table public.catalog_product_translations enable row level security;

create policy catalog_categories_public_read on public.catalog_categories
  for select to anon, authenticated using (true);
create policy catalog_products_public_read on public.catalog_products
  for select to anon, authenticated using (status = 'published' and stock_quantity > 0);
create policy catalog_product_images_public_read on public.catalog_product_images
  for select to anon, authenticated using (
    exists (
      select 1 from public.catalog_products p
      where p.id = product_id and p.status = 'published' and p.stock_quantity > 0
    )
  );
create policy catalog_product_translations_public_read on public.catalog_product_translations
  for select to anon, authenticated using (
    exists (
      select 1 from public.catalog_products p
      where p.id = product_id and p.status = 'published'
        and p.stock_quantity > 0 and p.content_version = source_version
    )
  );

revoke all on public.catalog_categories, public.catalog_products,
  public.catalog_product_images, public.catalog_product_translations from anon, authenticated;
grant select on public.catalog_categories to anon, authenticated;
grant select (id, slug, name, product_type, description, colors, price_brl, category_name,
  occasion, size, materials, care_instructions, flower_meaning, pet_toxicity, shelf_life,
  content_version, status) on public.catalog_products to anon, authenticated;
grant select (id, product_id, object_key, alt_text, width, height, mime_type, sort_order)
  on public.catalog_product_images to anon, authenticated;
grant select (product_id, locale, source_version, content)
  on public.catalog_product_translations to anon, authenticated;

create view public.public_catalog_products with (security_barrier = true) as
select p.id, p.slug, p.name, p.product_type, p.description, p.colors, p.price_brl,
       p.category_name, p.occasion, p.size, p.materials, p.care_instructions,
       p.flower_meaning, p.pet_toxicity, p.shelf_life, p.content_version,
       coalesce(
         jsonb_agg(jsonb_build_object(
           'objectKey', i.object_key, 'altText', i.alt_text,
           'width', i.width, 'height', i.height, 'mimeType', i.mime_type
         ) order by i.sort_order) filter (where i.id is not null),
         '[]'::jsonb
       ) as images
from public.catalog_products p
join public.catalog_categories c on c.name = p.category_name
left join public.catalog_product_images i on i.product_id = p.id
where p.status = 'published' and p.stock_quantity > 0
group by p.id;

create view public.public_catalog_translations with (security_barrier = true) as
select t.product_id, t.locale, t.source_version, t.content
from public.catalog_product_translations t
join public.catalog_products p on p.id = t.product_id
where p.status = 'published' and p.stock_quantity > 0
  and p.content_version = t.source_version;

grant select on public.public_catalog_products, public.public_catalog_translations to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 10485760,
        array['image/avif', 'image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy catalog_storage_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'catalog');
