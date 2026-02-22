import { z } from "zod";

export const orderIdParamsSchema = z.object({
  id: z.string().uuid("Invalid order id")
});

export const createOrderBodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Invalid product id"),
        quantity: z.number().int().positive().max(100)
      })
    )
    .min(1),
  notes: z.string().trim().min(1).max(1000).optional()
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "CANCELED"])
});

export type CreateOrderDto = z.infer<typeof createOrderBodySchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusBodySchema>;
