-- Bala Ji Stock Book — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- ---------- items ----------
create table if not exists items (
  id text primary key,
  name text not null,
  hsn text,
  category text not null default 'Other / General',
  unit text not null default 'EA',
  rate numeric not null default 0,
  reorder_level numeric not null default 0,
  total_purchased_qty numeric not null default 0,
  total_purchased_amount numeric not null default 0,
  times_ordered integer not null default 0,
  stock numeric not null default 0,
  supplier_rates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- suppliers ----------
create table if not exists suppliers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  added_at timestamptz not null default now()
);

-- ---------- cart (one shared "current" row — same as the original single-document cart) ----------
create table if not exists cart (
  id text primary key default 'current',
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into cart (id, items) values ('current', '[]'::jsonb)
  on conflict (id) do nothing;

-- ---------- orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null default '[]'::jsonb,
  placed_at timestamptz not null default now(),
  total numeric not null default 0
);

-- ---------- Row Level Security ----------
-- This app has no login system — it's meant for a small internal staff group
-- who all share the same link. These policies let anyone holding the anon
-- key (i.e. anyone with the deployed URL) read and write. If you want finer
-- control, add Supabase Auth and tighten these policies, and/or use the
-- BASIC_AUTH_USER / BASIC_AUTH_PASS gate described in the README.
alter table items enable row level security;
alter table suppliers enable row level security;
alter table cart enable row level security;
alter table orders enable row level security;

create policy "items_all" on items for all using (true) with check (true);
create policy "suppliers_all" on suppliers for all using (true) with check (true);
create policy "cart_all" on cart for all using (true) with check (true);
create policy "orders_all" on orders for all using (true) with check (true);

-- ---------- Realtime ----------
-- Lets every open tab see the others' changes live, like the original app.
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table cart;
alter publication supabase_realtime add table orders;
