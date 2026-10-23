import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { menuItemSchema, MENU_CATEGORIES, type MenuItemInput, type PublicMenuItem } from "@/lib/menu";

interface Props {
  initial?: PublicMenuItem | null;
  onSubmit: (data: MenuItemInput) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function MenuItemForm({ initial, onSubmit, onCancel, loading }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MenuItemInput>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: initial
      ? {
          slug:        initial.slug,
          name:        initial.name,
          description: initial.description,
          price:       initial.price,
          category:    initial.category,
          imageUrl:    initial.imageUrl ?? undefined,
          badge:       initial.badge ?? undefined,
          active:      true,
          sortOrder:   initial.sortOrder,
        }
      : { active: true, sortOrder: 0, description: "" },
  });

  useEffect(() => {
    reset(
      initial
        ? {
            slug:        initial.slug,
            name:        initial.name,
            description: initial.description,
            price:       initial.price,
            category:    initial.category,
            imageUrl:    initial.imageUrl ?? undefined,
            badge:       initial.badge ?? undefined,
            active:      true,
            sortOrder:   initial.sortOrder,
          }
        : { active: true, sortOrder: 0, description: "" },
    );
  }, [initial, reset]);

  const field = "block w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/40";
  const err   = "mt-1 text-xs text-red-300";
  const lbl   = "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/70";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="mi-name" className={lbl}>Name *</Label>
          <Input id="mi-name" {...register("name")} className={field} placeholder="Signature Latte" />
          {errors.name && <p className={err}>{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="mi-slug" className={lbl}>Slug *</Label>
          <Input id="mi-slug" {...register("slug")} className={field} placeholder="signature-latte" />
          {errors.slug && <p className={err}>{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="mi-desc" className={lbl}>Description</Label>
        <Input id="mi-desc" {...register("description")} className={field} placeholder="Short, enticing description…" />
        {errors.description && <p className={err}>{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="mi-price" className={lbl}>Price (₱) *</Label>
          <Input
            id="mi-price"
            type="number"
            min={1}
            {...register("price", { valueAsNumber: true })}
            className={field}
            placeholder="65"
          />
          {errors.price && <p className={err}>{errors.price.message}</p>}
        </div>
        <div>
          <Label htmlFor="mi-cat" className={lbl}>Category *</Label>
          <select id="mi-cat" {...register("category")} className={field + " cursor-pointer"}>
            <option value="" disabled>Select…</option>
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-gray-800 text-white capitalize">{c}</option>
            ))}
          </select>
          {errors.category && <p className={err}>{errors.category.message}</p>}
        </div>
        <div>
          <Label htmlFor="mi-order" className={lbl}>Sort order</Label>
          <Input
            id="mi-order"
            type="number"
            {...register("sortOrder", { valueAsNumber: true })}
            className={field}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="mi-image" className={lbl}>Image URL</Label>
        <Input id="mi-image" {...register("imageUrl")} className={field} placeholder="https://…" />
        {errors.imageUrl && <p className={err}>{errors.imageUrl.message}</p>}
      </div>

      <div>
        <Label htmlFor="mi-badge" className={lbl}>Badge (optional)</Label>
        <Input id="mi-badge" {...register("badge")} className={field} placeholder="Crowd favorite" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white/20 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/30 disabled:opacity-50"
        >
          {loading ? <><LoaderCircle className="motion-safe:animate-spin h-4 w-4" /> Saving…</> : initial ? "Update item" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
