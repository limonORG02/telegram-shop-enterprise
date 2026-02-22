import { z } from "zod";

const bigintLikeSchema = z
  .union([
    z.bigint(),
    z.number().int().nonnegative(),
    z.string().regex(/^\d+$/, "telegramId must contain only digits")
  ])
  .transform((value) => BigInt(value));

const optionalString = z.string().trim().min(1).max(255).optional();

export const userIdParamsSchema = z.object({
  id: z.string().uuid("Invalid user id")
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["CUSTOMER", "ADMIN", "MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional()
});

export const createUserBodySchema = z.object({
  telegramId: bigintLikeSchema.optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: optionalString,
  username: optionalString,
  firstName: optionalString,
  lastName: optionalString,
  role: z.enum(["CUSTOMER", "ADMIN", "MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(),
  bonusPoints: z.number().int().nonnegative().optional()
});

export const updateUserBodySchema = createUserBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided"
  }
);

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
export type CreateUserDto = z.infer<typeof createUserBodySchema>;
export type UpdateUserDto = z.infer<typeof updateUserBodySchema>;
