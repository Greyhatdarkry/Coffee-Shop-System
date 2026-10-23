import { z } from "zod";

export const sugarSchema = z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)]);
export type Sugar = z.infer<typeof sugarSchema>;
export const orderLineSchema = z
  .object({
    // slug-style id — server RPC validates existence against menu_items table
    id: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Invalid item id"),
    qty: z.number().int().min(1).max(20),
    sugar: sugarSchema.nullable(),
  })
  .strict();
export const orderSchema = z.object({
  requestId: z.string().uuid(),
  lines: z.array(orderLineSchema).min(1).max(22),
}).strict().superRefine(({ lines }, ctx) => {
  const keys = lines.map((line) => `${line.id}:${line.sugar}`);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Combine matching items before submitting." });
  }
});
export const receiptSchema = z.object({
  id: z.string().uuid(),
  number: z.number(),
  items: z.array(z.object({
    id: z.string(), name: z.string(), price: z.number(), qty: z.number(), sugar: sugarSchema.nullable(),
  })),
  total: z.number(),
  status: z.literal("received"),
  createdAt: z.string(),
});
export type Receipt = z.infer<typeof receiptSchema>;