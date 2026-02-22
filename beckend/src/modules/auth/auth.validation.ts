import { z } from "zod";

export const telegramSignInBodySchema = z.object({
  initData: z.string().trim().min(1).max(8192)
});

export type TelegramSignInDto = z.infer<typeof telegramSignInBodySchema>;
