# Order submission
- [x] Save customized guest orders securely in Cloud.
- [x] Show a detailed confirmation and handle submission failures.
- [x] Test customized order submission end to end.

# Admin Module
- [ ] Supabase migration: `menu_items` table, RLS policies, admin role helper.
- [ ] Update `submit_customer_order` RPC catalog to read from `menu_items`.
- [ ] Extend Drizzle schema with `menu_items` table type.
- [ ] Extend `Database` types in `src/integrations/supabase/types.ts`.
- [ ] `src/lib/menu.ts` — shared Zod schemas for menu items.
- [ ] `src/lib/menu.functions.ts` — server functions (list, add, update, delete).
- [ ] `src/routes/admin.tsx` — login page with `beforeLoad` redirect-if-authenticated guard.
- [ ] `src/routes/admin/dashboard.tsx` — admin dashboard with menu management table.
- [ ] `src/components/admin/menu-item-form.tsx` — add/edit form with validation.
- [ ] `src/components/admin/delete-confirm-dialog.tsx` — confirmation dialog.
- [ ] Update `src/routes/index.tsx` to fetch live menu from Supabase.
- [ ] Create `.env.example` with all required environment variables.
- [ ] Run lint and tests and fix any errors.

## Files created / modified
| File | Action |
|---|---|
| `roadmap.md` | modified |
| `supabase/migrations/0001_admin_menu.sql` | created |
| `drizzle/schema.ts` | modified |
| `src/integrations/supabase/types.ts` | modified |
| `src/lib/menu.ts` | created |
| `src/lib/menu.functions.ts` | created |
| `src/routes/admin.tsx` | created |
| `src/routes/admin/dashboard.tsx` | created |
| `src/components/admin/menu-item-form.tsx` | created |
| `src/components/admin/delete-confirm-dialog.tsx` | created |
| `src/routes/index.tsx` | modified (live menu fetch) |
| `.env.example` | created |