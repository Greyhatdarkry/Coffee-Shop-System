import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const menuItems = pgTable("menu_items", {
  id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug:        text("slug").notNull().unique(),
  name:        text("name").notNull(),
  description: text("description").notNull().default(""),
  price:       integer("price").notNull(),
  category:    text("category", { enum: ["coffee", "food", "drinks"] }).notNull(),
  imageUrl:    text("image_url"),
  badge:       text("badge"),
  active:      boolean("active").notNull().default(true),
  sortOrder:   integer("sort_order").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuItem    = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
