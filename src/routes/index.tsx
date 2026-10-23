import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Plus, Minus, ShoppingBag, LoaderCircle, Coffee, Croissant, CupSoda, Leaf, Sun, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { OrderConfirmation } from "@/components/order-confirmation";
import { submitOrder } from "@/lib/orders.functions";
import { orderSchema, type Receipt } from "@/lib/orders";
import { listPublicMenuItems } from "@/lib/menu.functions";
import type { PublicMenuItem } from "@/lib/menu";
import latte from "@/assets/latte.jpg.asset.json";
import croissant from "@/assets/croissant.jpg.asset.json";
import iced from "@/assets/iced-latte.jpg.asset.json";
import avocado from "@/assets/avocado-toast.jpg.asset.json";
import matcha from "@/assets/matcha.jpg.asset.json";
import berry from "@/assets/berry-tea.jpg.asset.json";


// ── Static fallback (used when Supabase returns nothing) ────────────────────
type StaticItem = { id: string; name: string; desc: string; price: number; img: string; cat: string; badge?: string; isDrink: boolean };
const STATIC_ITEMS: StaticItem[] = [
  { id: "latte",     name: "Signature Latte",     desc: "Rich espresso, silky milk. A hug in a cup.",              price: 65, img: latte.url,     cat: "coffee", badge: "Crowd favorite", isDrink: true  },
  { id: "croissant", name: "Butter Croissant",     desc: "Golden, flaky, buttery. Simple things done right.",       price: 50, img: croissant.url, cat: "food",   badge: "Freshly baked",  isDrink: false },
  { id: "iced",      name: "Iced Spanish Latte",   desc: "Bold coffee, a sweet little twist. Perfectly chilled.",  price: 70, img: iced.url,      cat: "coffee", isDrink: true  },
  { id: "avocado",   name: "Avocado Toast",         desc: "Creamy avocado on toasted sourdough. Brunch, sorted.",  price: 70, img: avocado.url,   cat: "food",   isDrink: false },
  { id: "matcha",    name: "Iced Matcha Latte",     desc: "Earthy matcha, creamy milk. Your moment of calm.",      price: 65, img: matcha.url,    cat: "drinks", isDrink: true  },
  { id: "berry",     name: "Berry Hibiscus Tea",    desc: "Bright berries, floral hibiscus. A refreshing escape.", price: 60, img: berry.url,     cat: "drinks", isDrink: true  },
];

type MenuRow = { id: string; name: string; desc: string; price: number; img: string; cat: string; badge?: string | null; isDrink: boolean };

function toMenuRow(item: PublicMenuItem): MenuRow {
  const IMG_MAP: Record<string, string> = { latte: latte.url, croissant: croissant.url, iced: iced.url, avocado: avocado.url, matcha: matcha.url, berry: berry.url };
  return {
    id:      item.slug,
    name:    item.name,
    desc:    item.description,
    price:   item.price,
    img:     item.imageUrl ?? IMG_MAP[item.slug] ?? latte.url,
    cat:     item.category,
    badge:   item.badge,
    isDrink: item.isDrink,
  };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sunday & Co. — Coffee, food & little moments" },
      { name: "description", content: "Browse specialty coffee, freshly baked pastries, brunch and refreshing drinks at Sunday & Co." },
      { property: "og:title", content: "Sunday & Co. — Coffee, food & little moments" },
      { property: "og:description", content: "Good coffee. Honest food. Your little everyday escape." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: latte.url },
      { name: "twitter:image", content: latte.url },
    ],
  }),
  component: Index,
});



const FILTERS = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "food", label: "Food", icon: Croissant },
  { id: "drinks", label: "Drinks", icon: CupSoda },
  { id: "saved", label: "Saved", icon: Heart },
] as const;

const SUGAR_LEVELS = [
  { pct: 0, label: "0%" },
  { pct: 25, label: "25%" },
  { pct: 50, label: "50%" },
  { pct: 75, label: "75%" },
  { pct: 100, label: "100%" },
] as const;
type Sugar = 0 | 25 | 50 | 75 | 100;
const sugarLabel = (s: Sugar) => (s === 0 ? "no sugar" : s === 100 ? "standard sugar" : `${s}% sugar`);

function Brand() {
  return (
    <a href="#" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      sunday <span className="text-base italic text-muted-foreground">&amp; co.</span>
    </a>
  );
}

function Index() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sugarChoice, setSugarChoice] = useState<Record<string, Sugar>>({});
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const pendingRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const submitLock = useRef(false);
  const placeOrder = useServerFn(submitOrder);
  const fetchMenu = useServerFn(listPublicMenuItems);
  const [ITEMS, setItems] = useState<MenuRow[]>(STATIC_ITEMS);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("sunday-saved") || "[]")); } catch { /* ignore */ }
  }, []);

  // Load live menu from Supabase; gracefully fall back to STATIC_ITEMS
  useEffect(() => {
    fetchMenu().then((rows) => {
      if (rows.length > 0) setItems(rows.map(toMenuRow));
    }).catch(() => { /* keep static fallback */ });
  }, [fetchMenu]);
  const toggleSave = (id: string) =>
    setSaved((s) => {
      const n = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      localStorage.setItem("sunday-saved", JSON.stringify(n));
      return n;
    });
  const change = (id: string, d: number) =>
    setCart((c) => {
      const q = Math.max(0, Math.min(20, (c[id] || 0) + d));
      const n = { ...c, [id]: q };
      if (!q) delete n[id];
      return n;
    });

  const shown = ITEMS.filter((i) => (filter === "all" ? true : filter === "saved" ? saved.includes(i.id) : i.cat === filter));
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const isDrink = (row: MenuRow) => row.isDrink;
  const orderLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, qty]) => {
          const [id, sugar] = key.split(":");
          return { key, item: ITEMS.find((i) => i.id === id), sugar: Number(sugar) as Sugar, qty };
        })
        .filter((l): l is typeof l & { item: MenuRow } => Boolean(l.item)),
    [cart, ITEMS]
  );
  const total = useMemo(() => orderLines.reduce((t, l) => t + l.qty * l.item.price, 0), [orderLines]);

  async function handlePlaceOrder() {
    if (!count || submitLock.current) return;
    const lines = orderLines.map((line) => ({ id: line.item.id, qty: line.qty, sugar: isDrink(line.item.cat) ? line.sugar : null }));
    const fingerprint = JSON.stringify(lines);
    if (pendingRequest.current?.fingerprint !== fingerprint) {
      pendingRequest.current = { fingerprint, id: crypto.randomUUID() };
    }
    const parsed = orderSchema.safeParse({ requestId: pendingRequest.current.id, lines });
    if (!parsed.success) {
      setOrderError("Please check your items and sugar choices before placing the order.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setOrderError("");
    try {
      const result = await placeOrder({ data: parsed.data });
      if (!result.ok) { setOrderError(result.error); return; }
      setReceipt(result.receipt);
      setCart({});
      pendingRequest.current = null;
    } catch {
      setOrderError("Your order may have been received, but we couldn’t confirm it. Retry without changing your items to avoid placing a second order.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Brand />
          <nav className="hidden gap-8 text-sm font-medium md:flex">
            {["Menu", "Story", "Visit"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-muted-foreground transition-colors hover:text-foreground">{l}</a>
            ))}
          </nav>
          <button onClick={() => setOpen(true)} aria-label="Open your order" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{count}</span>}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-xs font-semibold tracking-widest text-primary">
            <Sun className="h-3.5 w-3.5" /> YOUR DAILY DOSE OF GOOD
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            A little <em className="text-accent">happiness</em>, every day.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">Good coffee. Honest food. A place to slow down — your little everyday escape, made with love.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="#menu" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5">
              Explore the menu <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#visit" className="font-semibold underline-offset-4 hover:underline">Find our café</a>
          </div>
        </div>
        <div className="relative animate-rise [animation-delay:150ms]">
          <div className="absolute -inset-4 rotate-3 rounded-[2.5rem] bg-soft-accent" />
          <img src={latte.url} alt="Signature latte with latte art" className="relative aspect-square w-full rounded-[2rem] object-cover shadow-lift" />
          <div className="absolute -bottom-6 -left-6 rounded-2xl bg-surface p-4 shadow-lift">
            <p className="font-display text-2xl font-semibold">4.9 ★</p>
            <p className="text-xs text-muted-foreground">from 1,200+ regulars</p>
          </div>
        </div>
      </section>

      <section className="border-y bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3">
          {[
            { i: Leaf, t: "Thoughtfully sourced", d: "Good ingredients, better choices." },
            { i: Croissant, t: "Fresh every day", d: "From our kitchen to your table." },
            { i: Heart, t: "Something for everyone", d: "Your favorites, your way." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-primary"><I className="h-5 w-5" /></span>
              <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold tracking-widest text-accent">MADE FOR YOUR EVERYDAY</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Find your new favorite.</h2>
        <div className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${filter === id ? "border-primary bg-primary text-primary-foreground shadow-soft" : "bg-surface hover:border-primary"}`}>
              <I className="h-4 w-4" /> {label}
              {id === "saved" && saved.length > 0 && <span className="rounded-full bg-berry px-1.5 text-xs text-primary-foreground">{saved.length}</span>}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
            <Heart className="mx-auto mb-3 h-8 w-8" />
            No favorites yet. Tap a heart to save something lovely.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => {
              const fav = saved.includes(item.id);
              const sugarPct = sugarChoice[item.id] ?? 100;
              const cartKey = isDrink(item) ? `${item.id}:${sugarPct}` : `${item.id}:none`;
              const q = cart[cartKey] || 0;
              return (
                <article key={item.id} className="group overflow-hidden rounded-3xl bg-surface shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={item.img} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {item.badge && <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold backdrop-blur">{item.badge}</span>}
                    <button onClick={() => toggleSave(item.id)} aria-pressed={fav} aria-label={fav ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition-transform hover:scale-110">
                      <Heart key={String(fav)} className={`h-5 w-5 ${fav ? "animate-heart-pop fill-berry text-berry" : "text-foreground"}`} />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    {isDrink(item) && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground">Sugar level</p>
                        <div className="mt-2 flex gap-1.5">
                          {SUGAR_LEVELS.map(({ pct, label }) => (
                            <button
                              key={pct}
                              onClick={() => setSugarChoice((s) => ({ ...s, [item.id]: pct }))}
                              aria-pressed={sugarPct === pct}
                              aria-label={`${item.name} ${sugarLabel(pct)}`}
                              className={`h-8 flex-1 rounded-full text-xs font-semibold transition-all ${sugarPct === pct ? "bg-primary text-primary-foreground shadow-soft" : "bg-mint text-primary hover:bg-soft-accent"}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-display text-2xl font-semibold">₱{item.price}</span>
                      {q === 0 ? (
                        <button onClick={() => change(cartKey, 1)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105">
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-full bg-mint p-1">
                          <button aria-label="Less" onClick={() => change(cartKey, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface"><Minus className="h-4 w-4" /></button>
                          <span className="w-4 text-center font-semibold">{q}</span>
                          <button aria-label="More" onClick={() => change(cartKey, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="story" className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid items-center gap-10 rounded-[2rem] bg-primary p-10 text-primary-foreground md:grid-cols-[1.4fr_1fr] md:p-16">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent">MORE THAN A CUP OF COFFEE</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Your neighborhood, your little pause.</h2>
            <p className="mt-5 max-w-lg opacity-80">We believe the best moments are the simple ones. A familiar face, a freshly baked treat, and a really good cup of coffee.</p>
          </div>
          <img src={croissant.url} alt="Butter croissant" className="aspect-square w-full rounded-3xl object-cover" />
        </div>
      </section>

      <footer id="visit" className="border-t bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 md:flex-row md:items-center">
          <Brand />
          <p className="text-sm text-muted-foreground">Open daily · 7am – 9pm</p>
          <p className="text-sm text-muted-foreground">© 2026 Sunday &amp; Co. Made with a little love.</p>
        </div>
      </footer>

      {count > 0 && !open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lift animate-rise">
          <ShoppingBag className="h-4 w-4" /> View order · {count} · ₱{total}
        </button>
      )}

      <Sheet open={open} onOpenChange={(next) => { if (!submitting) setOpen(next); }}>
        <SheetContent className="flex h-dvh w-full flex-col gap-0 p-6 sm:max-w-md" onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }} onPointerDownOutside={(event) => { if (submitting) event.preventDefault(); }}>
          <SheetTitle className="pr-5 font-display text-3xl">{receipt ? "Order confirmation" : "Your coffee break"}</SheetTitle>
          <SheetDescription className="sr-only">{receipt ? "Your submitted order details" : "Review your customized order before submitting"}</SheetDescription>
          {receipt ? <OrderConfirmation receipt={receipt} onDone={() => { setOpen(false); setReceipt(null); }} /> : <>
            <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-auto pb-4" aria-busy={submitting}>
              {count === 0 && <p className="py-16 text-center text-muted-foreground">Your order is waiting for a little happiness.</p>}
              {orderLines.map((l) => (
                <div key={l.key} className="flex items-center gap-4 rounded-2xl bg-surface p-3 shadow-soft">
                  <img src={l.item.img} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold">{l.item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₱{l.item.price} each{isDrink(l.item) && <> · {l.sugar}% sugar</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="secondary" disabled={submitting} aria-label={`Less ${l.item.name} ${l.sugar}% sugar`} onClick={() => change(l.key, -1)} className="h-7 w-7 rounded-full"><Minus /></Button>
                    <span className="w-4 text-center font-semibold">{l.qty}</span>
                    <Button size="icon" disabled={submitting || l.qty >= 20} aria-label={`More ${l.item.name} ${l.sugar}% sugar`} onClick={() => change(l.key, 1)} className="h-7 w-7 rounded-full"><Plus /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-5">
              <div className="flex justify-between text-lg"><span>Total</span><span className="font-display text-2xl font-semibold">₱{total}</span></div>
              {orderError && <p role="alert" className="mt-3 text-sm text-destructive">{orderError}</p>}
              <Button onClick={handlePlaceOrder} disabled={!count || submitting} className="mt-4 h-12 w-full rounded-full font-semibold">{submitting ? <><LoaderCircle className="motion-safe:animate-spin" /> Placing order…</> : <><ShoppingBag /> Place order</>}</Button>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
