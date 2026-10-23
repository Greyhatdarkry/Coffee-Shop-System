import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Coffee, LogOut, Plus, Pencil, Trash2, LoaderCircle,
  LayoutDashboard, X, Coffee as CoffeeIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/menu.functions";
import type { PublicMenuItem, MenuItemInput } from "@/lib/menu";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/dashboard")({
  // Guard: redirect unauthenticated users to /admin login
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/admin" });
    const meta = data.session.user.app_metadata as Record<string, unknown> | undefined;
    if (meta?.["role"] !== "admin") {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin" });
    }
  },

  head: () => ({
    meta: [
      { title: "Dashboard — Sunday & Co. Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: AdminDashboard,
});

type Panel = { mode: "add" } | { mode: "edit"; item: PublicMenuItem } | null;

function AdminDashboard() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [panel, setPanel]     = useState<Panel>(null);
  const [delTarget, setDelTarget] = useState<PublicMenuItem | null>(null);

  const listFn   = useServerFn(listMenuItems);
  const addFn    = useServerFn(addMenuItem);
  const updateFn = useServerFn(updateMenuItem);
  const deleteFn = useServerFn(deleteMenuItem);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-menu-items"],
    queryFn:  () => listFn(),
    staleTime: 30_000,
  });

  const addMut = useMutation({
    mutationFn: (data: MenuItemInput) => addFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Menu item added!");
      setPanel(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MenuItemInput }) =>
      updateFn({ data: { id, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Item updated!");
      setPanel(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Item deleted.");
      setDelTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/admin" });
  }, [navigate]);

  const handleFormSubmit = useCallback(
    async (data: MenuItemInput) => {
      if (panel?.mode === "edit") {
        await updateMut.mutateAsync({ id: panel.item.id, data });
      } else {
        await addMut.mutateAsync(data);
      }
    },
    [panel, addMut, updateMut],
  );

  const panelLoading = addMut.isPending || updateMut.isPending;
  const deleteLoading = deleteMut.isPending;

  const CATEGORY_LABELS: Record<string, string> = { coffee: "☕ Coffee", food: "🥐 Food", drinks: "🥤 Drinks" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900">
      {/* decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-green-800/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-900/20 blur-3xl" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="font-display font-semibold leading-none text-white">sunday <span className="text-xs italic text-white/40">& co.</span></p>
              <p className="text-xs text-white/40">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* ── Menu Management card ── */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
          {/* card header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Menu Management</p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-white">All Items</h1>
            </div>
            <button
              onClick={() => setPanel({ mode: "add" })}
              className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>

          {/* ── Add / Edit form panel ── */}
          {panel && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-white">
                  {panel.mode === "edit" ? `Edit "${panel.item.name}"` : "Add new menu item"}
                </h2>
                <button
                  onClick={() => setPanel(null)}
                  aria-label="Close form"
                  className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <MenuItemForm
                initial={panel.mode === "edit" ? panel.item : null}
                onSubmit={handleFormSubmit}
                onCancel={() => setPanel(null)}
                loading={panelLoading}
              />
            </div>
          )}

          {/* ── Table ── */}
          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-white/50">
                <LoaderCircle className="mr-2 h-5 w-5 motion-safe:animate-spin" /> Loading menu…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-white/40">
                <CoffeeIcon className="h-8 w-8" />
                <p className="text-sm">No menu items yet. Add one above.</p>
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-widest text-white/40">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Category</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Slug</th>
                    <th className="py-3 pr-4">Badge</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => (
                    <tr key={item.id} className="group transition hover:bg-white/5">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                              <Coffee className="h-4 w-4 text-white/40" />
                            </span>
                          )}
                          <span className="font-semibold text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-white">₱{item.price}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-white/50">{item.slug}</td>
                      <td className="py-3 pr-4 text-xs text-white/50">{item.badge ?? "—"}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setPanel({ mode: "edit", item })}
                            aria-label={`Edit ${item.name}`}
                            className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDelTarget(item)}
                            aria-label={`Delete ${item.name}`}
                            className="rounded-lg p-2 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ── Delete dialog ── */}
      <DeleteConfirmDialog
        open={delTarget !== null}
        itemName={delTarget?.name ?? ""}
        loading={deleteLoading}
        onConfirm={() => delTarget && deleteMut.mutate(delTarget.id)}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}
