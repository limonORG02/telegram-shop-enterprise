import { z } from "zod";

export const redeemBonusBodySchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid idempotencyKey format")
});

export type RedeemBonusDto = z.infer<typeof redeemBonusBodySchema>;
