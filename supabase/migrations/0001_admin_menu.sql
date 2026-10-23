-- Migration 0001: Admin role + menu_items table + RLS
-- Run this in Supabase SQL Editor or via Supabase CLI:
--   supabase db push  OR  supabase migration up

-- ─── 1. Helper: check if the calling JWT belongs to an admin ─────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ─── 2. menu_items table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description text        NOT NULL DEFAULT '',
  price       integer     NOT NULL CHECK (price > 0),
  category    text        NOT NULL CHECK (category IN ('coffee','food','drinks')),
  image_url   text,
  is_drink    boolean     NOT NULL GENERATED ALWAYS AS (category IN ('coffee','drinks')) STORED,
  badge       text,
  active      boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Public can read active items only
CREATE POLICY "public_read_active_menu"
  ON public.menu_items FOR SELECT
  USING (active = true);

-- Admins can read all rows (including inactive)
CREATE POLICY "admin_read_all_menu"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert
CREATE POLICY "admin_insert_menu"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update
CREATE POLICY "admin_update_menu"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete
CREATE POLICY "admin_delete_menu"
  ON public.menu_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── 4. Seed the initial menu from the existing hard-coded catalog ────────────
INSERT INTO public.menu_items (slug, name, description, price, category, badge, sort_order) VALUES
  ('latte',      'Signature Latte',      'Rich espresso, silky milk. A hug in a cup.',              65, 'coffee', 'Crowd favorite', 1),
  ('croissant',  'Butter Croissant',     'Golden, flaky, buttery. Simple things done right.',        50, 'food',   'Freshly baked',  2),
  ('iced',       'Iced Spanish Latte',   'Bold coffee, a sweet little twist. Perfectly chilled.',    70, 'coffee', NULL,             3),
  ('avocado',    'Avocado Toast',        'Creamy avocado on toasted sourdough. Brunch, sorted.',     70, 'food',   NULL,             4),
  ('matcha',     'Iced Matcha Latte',    'Earthy matcha, creamy milk. Your moment of calm.',         65, 'drinks', NULL,             5),
  ('berry',      'Berry Hibiscus Tea',   'Bright berries, floral hibiscus. A refreshing escape.',   60, 'drinks', NULL,             6)
ON CONFLICT (slug) DO NOTHING;

-- ─── 5. Update submit_customer_order to read catalog from menu_items ──────────
-- Drop old function first (signature unchanged, body updated)
DROP FUNCTION IF EXISTS public.submit_customer_order(uuid, jsonb);

CREATE FUNCTION public.submit_customer_order(request_id uuid, lines jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  line jsonb; product record; prepared jsonb := '[]'; amount integer := 0;
  quantity integer; sugar integer; saved public.customer_orders;
BEGIN
  IF request_id IS NULL
     OR jsonb_typeof(lines) <> 'array'
     OR jsonb_array_length(lines) NOT BETWEEN 1 AND 22 THEN
    RAISE EXCEPTION 'Invalid order';
  END IF;

  FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
    SELECT id, slug, name, price, is_drink
      INTO product
      FROM public.menu_items
     WHERE slug = (line ->> 'id') AND active = true;

    IF NOT FOUND
       OR jsonb_typeof(line -> 'qty') <> 'number'
       OR (line ->> 'qty') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Invalid item';
    END IF;

    quantity := (line ->> 'qty')::integer;
    IF quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    sugar := NULL;
    IF product.is_drink THEN
      IF jsonb_typeof(line -> 'sugar') <> 'number'
         OR (line ->> 'sugar') NOT IN ('0','25','50','75','100') THEN
        RAISE EXCEPTION 'Invalid sugar level';
      END IF;
      sugar := (line ->> 'sugar')::integer;
    ELSE
      IF line -> 'sugar' IS DISTINCT FROM 'null'::jsonb THEN
        RAISE EXCEPTION 'Food cannot have sugar selection';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(prepared) p
       WHERE p ->> 'id' = line ->> 'id'
         AND p -> 'sugar' = coalesce(to_jsonb(sugar), 'null'::jsonb)
    ) THEN RAISE EXCEPTION 'Duplicate item'; END IF;

    prepared := prepared || jsonb_build_array(
      jsonb_build_object(
        'id',    product.slug,
        'name',  product.name,
        'price', product.price,
        'qty',   quantity,
        'sugar', sugar
      )
    );
    amount := amount + quantity * product.price;
  END LOOP;

  INSERT INTO public.customer_orders(id, items, total)
    VALUES (request_id, prepared, amount)
    ON CONFLICT (id) DO NOTHING;

  SELECT * INTO saved FROM public.customer_orders WHERE id = request_id;
  IF saved.items <> prepared THEN RAISE EXCEPTION 'Order reference already used'; END IF;

  RETURN jsonb_build_object(
    'id',        saved.id,
    'number',    saved.order_number,
    'items',     saved.items,
    'total',     saved.total,
    'status',    saved.status,
    'createdAt', saved.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_customer_order(uuid, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_customer_order(uuid, jsonb) TO anon, authenticated, service_role;

-- ─── 6. Grants ───────────────────────────────────────────────────────────────
GRANT SELECT                         ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.menu_items TO authenticated;
GRANT ALL                            ON public.menu_items TO service_role;
