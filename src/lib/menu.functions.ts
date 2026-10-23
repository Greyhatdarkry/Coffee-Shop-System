import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { menuItemSchema, menuItemUpdateSchema, type PublicMenuItem } from "./menu";

// ── helper: assert admin role ─────────────────────────────────────────────────
async function assertAdmin(claims: Record<string, unknown>) {
  const role = (claims["app_metadata"] as Record<string, unknown> | undefined)?.["role"];
  if (role !== "admin") throw new Error("Forbidden: admin access required");
}

// ── List all menu items (admin: all rows; called server-side only) ─────────────
export const listMenuItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublicMenuItem[]> => {
    await assertAdmin(context.claims);
    const { supabase } = context;
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,slug,name,description,price,category,image_url,is_drink,badge,sort_order,active")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id:          r.id,
      slug:        r.slug,
      name:        r.name,
      description: r.description,
      price:       r.price,
      category:    r.category as PublicMenuItem["category"],
      imageUrl:    r.image_url ?? null,
      isDrink:     r.is_drink,
      badge:       r.badge ?? null,
      sortOrder:   r.sort_order,
    }));
  });

// ── Public list (no auth required) – active items only ───────────────────────
export const listPublicMenuItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicMenuItem[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return [];
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client
      .from("menu_items")
      .select("id,slug,name,description,price,category,image_url,is_drink,badge,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    type Row = { id: string; slug: string; name: string; description: string; price: number; category: string; image_url: string | null; is_drink: boolean; badge: string | null; sort_order: number };
    return (data ?? []).map((r: Row) => ({
      id:          r.id,
      slug:        r.slug,
      name:        r.name,
      description: r.description,
      price:       r.price,
      category:    r.category as PublicMenuItem["category"],
      imageUrl:    r.image_url ?? null,
      isDrink:     r.is_drink,
      badge:       r.badge ?? null,
      sortOrder:   r.sort_order,
    }));
  },
);

// ── Add a menu item ───────────────────────────────────────────────────────────
export const addMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => menuItemSchema.parse(input))
  .handler(async ({ data, context }): Promise<PublicMenuItem> => {
    await assertAdmin(context.claims);
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("menu_items")
      .insert({
        slug:        data.slug,
        name:        data.name,
        description: data.description ?? "",
        price:       data.price,
        category:    data.category,
        image_url:   data.imageUrl ?? null,
        badge:       data.badge ?? null,
        active:      data.active ?? true,
        sort_order:  data.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("A menu item with this slug already exists.");
      throw new Error(error.message);
    }
    return {
      id:          row.id,
      slug:        row.slug,
      name:        row.name,
      description: row.description,
      price:       row.price,
      category:    row.category as PublicMenuItem["category"],
      imageUrl:    row.image_url ?? null,
      isDrink:     row.is_drink,
      badge:       row.badge ?? null,
      sortOrder:   row.sort_order,
    };
  });

// ── Update a menu item ────────────────────────────────────────────────────────
export const updateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => menuItemUpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<PublicMenuItem> => {
    await assertAdmin(context.claims);
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    if (rest.slug        !== undefined) patch["slug"]        = rest.slug;
    if (rest.name        !== undefined) patch["name"]        = rest.name;
    if (rest.description !== undefined) patch["description"] = rest.description;
    if (rest.price       !== undefined) patch["price"]       = rest.price;
    if (rest.category    !== undefined) patch["category"]    = rest.category;
    if (rest.imageUrl    !== undefined) patch["image_url"]   = rest.imageUrl;
    if (rest.badge       !== undefined) patch["badge"]       = rest.badge;
    if (rest.active      !== undefined) patch["active"]      = rest.active;
    if (rest.sortOrder   !== undefined) patch["sort_order"]  = rest.sortOrder;

    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("menu_items")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id:          row.id,
      slug:        row.slug,
      name:        row.name,
      description: row.description,
      price:       row.price,
      category:    row.category as PublicMenuItem["category"],
      imageUrl:    row.image_url ?? null,
      isDrink:     row.is_drink,
      badge:       row.badge ?? null,
      sortOrder:   row.sort_order,
    };
  });

// ── Delete a menu item ────────────────────────────────────────────────────────
export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.claims);
    const { supabase } = context;
    const { error } = await supabase.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
