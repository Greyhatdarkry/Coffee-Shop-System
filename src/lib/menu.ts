import { z } from "zod";

export const MENU_CATEGORIES = ["coffee", "food", "drinks"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const menuItemSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).default(""),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .int("Price must be a whole number")
    .min(1, "Price must be at least ₱1"),
  category: z.enum(MENU_CATEGORIES, { errorMap: () => ({ message: "Invalid category" }) }),
  imageUrl: z.string().url("Must be a valid URL").nullable().optional(),
  badge: z.string().max(40).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const menuItemUpdateSchema = menuItemSchema.partial().extend({
  id: z.string().uuid(),
});

export type MenuItemInput  = z.infer<typeof menuItemSchema>;
export type MenuItemUpdate = z.infer<typeof menuItemUpdateSchema>;

/** Shape returned to the client for public menu display */
export const publicMenuItemSchema = z.object({
  id:          z.string().uuid(),
  slug:        z.string(),
  name:        z.string(),
  description: z.string(),
  price:       z.number(),
  category:    z.enum(MENU_CATEGORIES),
  imageUrl:    z.string().url().nullable(),
  isDrink:     z.boolean(),
  badge:       z.string().nullable(),
  sortOrder:   z.number(),
});

export type PublicMenuItem = z.infer<typeof publicMenuItemSchema>;
