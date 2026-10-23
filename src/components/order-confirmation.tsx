import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Receipt } from "@/lib/orders";

export function OrderConfirmation({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto py-6">
        <div className="mb-7 text-center" role="status">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint text-primary"><Check className="h-8 w-8" /></span>
          <h3 className="text-3xl font-semibold">A little happiness, on its way.</h3>
          <p className="mt-3 font-semibold">Order #{String(receipt.number).padStart(4, "0")}</p>
          <p className="mt-1 text-sm text-muted-foreground">Order received · {new Date(receipt.createdAt).toLocaleString()}</p>
        </div>
        <div className="divide-y border-y">
          {receipt.items.map((line) => (
            <div key={`${line.id}:${line.sugar}`} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-semibold">{line.qty} × {line.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">₱{line.price} each{line.sugar !== null && ` · ${line.sugar}% sugar`}</p>
              </div>
              <span className="shrink-0 font-semibold">₱{line.price * line.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t pt-5">
        <div className="flex justify-between text-lg"><span>Total</span><span className="font-display text-2xl font-semibold">₱{receipt.total}</span></div>
        <Button onClick={onDone} className="mt-5 h-12 w-full rounded-full"><ShoppingBag /> Back to menu</Button>
      </div>
    </>
  );
}