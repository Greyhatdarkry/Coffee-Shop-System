import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { orderSchema, receiptSchema } from "./orders";
import type { Database } from "@/integrations/supabase/types";

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return { ok: false as const, error: "Orders are temporarily unavailable. Please try again." };
    // Guest checkout exposes only a validated, insert-only RPC, never table reads or admin access.
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: receipt, error } = await client.rpc("submit_customer_order", {
      request_id: data.requestId,
      lines: data.lines,
    });
    if (error) {
      console.error("Order submission failed", error.code);
      return { ok: false as const, error: "We couldn’t submit your order. Your items are still here—please try again." };
    }
    return { ok: true as const, receipt: receiptSchema.parse(receipt) };
  });