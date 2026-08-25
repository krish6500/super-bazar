-- Run this once in Supabase → SQL Editor before uploading product photos.
alter table public.products add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;
