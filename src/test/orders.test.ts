import { describe, expect, it } from "vitest";
import { orderSchema } from "@/lib/orders";

const requestId = "baea0408-6f0d-4374-9dbd-2c1f01146f1a";
describe("Customized orders", () => {
  it("preserves distinct sugar choices for the same drink", () => {
    const order = orderSchema.parse({ requestId, lines: [
      { id: "latte", qty: 2, sugar: 50 }, { id: "latte", qty: 1, sugar: 0 },
    ] });
    expect(order.lines).toEqual([{ id: "latte", qty: 2, sugar: 50 }, { id: "latte", qty: 1, sugar: 0 }]);
  });
  it("requires items before an order can be submitted", () => {
    expect(orderSchema.safeParse({ requestId, lines: [] }).success).toBe(false);
  });
  it("rejects client supplied prices", () => {
    expect(orderSchema.safeParse({ requestId, lines: [{ id: "latte", qty: 1, sugar: 50, price: 1 }] }).success).toBe(false);
  });
  it("rejects a missing drink sugar selection", () => {
    expect(orderSchema.safeParse({ requestId, lines: [{ id: "latte", qty: 1, sugar: null }] }).success).toBe(false);
  });
  it("does not apply sugar customization to food", () => {
    expect(orderSchema.safeParse({ requestId, lines: [{ id: "croissant", qty: 1, sugar: 50 }] }).success).toBe(false);
  });
});