import { z } from "zod";

export const sugarSchema = z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)]);
export type Sugar = z.infer<typeof sugarSchema>;
export const orderLineSchema = z.object({
  id: z.enum(["latte", "croissant", "iced", "avocado", "matcha", "berry"]),
  qty: z.number().int().min(1).max(20),
  sugar: sugarSchema.nullable(),
}).strict().superRefine((line, ctx) => {
  const food = line.id === "croissant" || line.id === "avocado";
  if (food !== (line.sugar === null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a sugar level for each drink only." });
  }
});
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