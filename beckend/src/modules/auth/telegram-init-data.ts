import { createHmac, timingSafeEqual } from "crypto";

import { ZodError, z } from "zod";

import { AppError } from "../../shared/errors/app-error";

const telegramUserSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  first_name: z.string().trim().min(1).max(255).optional(),
  last_name: z.string().trim().min(1).max(255).optional(),
  username: z.string().trim().min(1).max(255).optional()
});

export interface VerifiedTelegramUser {
  telegramId: bigint;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  authDate: Date;
}

const normalizeInitData = (initData: string): string => {
  return initData.startsWith("?") ? initData.slice(1) : initData;
};

const ensureValidHash = (hash: string): void => {
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    throw new AppError("Invalid Telegram signature hash format", 401);
  }
};

const buildDataCheckString = (params: URLSearchParams): string => {
  return Array.from(params.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
};

const validateAuthDate = (authDateRaw: string, maxAgeSeconds: number): Date => {
  const authTimestamp = Number(authDateRaw);

  if (!Number.isInteger(authTimestamp) || authTimestamp <= 0) {
    throw new AppError("Invalid Telegram auth_date", 401);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (authTimestamp > nowInSeconds + 30) {
    throw new AppError("Telegram auth_date is in the future", 401);
  }

  if (nowInSeconds - authTimestamp > maxAgeSeconds) {
    throw new AppError("Telegram initData expired", 401);
  }

  return new Date(authTimestamp * 1000);
};

export const verifyTelegramInitData = (
  initData: string,
  botToken: string,
  maxAgeSeconds: number
): VerifiedTelegramUser => {
  if (!botToken) {
    throw new AppError("Telegram auth is not configured", 500);
  }

  const params = new URLSearchParams(normalizeInitData(initData));
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!hash || !authDateRaw || !userRaw) {
    throw new AppError("Invalid Telegram initData payload", 400);
  }

  ensureValidHash(hash);

  params.delete("hash");

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expectedHash = Buffer.from(computedHash, "utf8");
  const actualHash = Buffer.from(hash.toLowerCase(), "utf8");

  if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    throw new AppError("Telegram initData signature is invalid", 401);
  }

  const authDate = validateAuthDate(authDateRaw, maxAgeSeconds);

  let telegramUserJson: unknown;
  try {
    telegramUserJson = JSON.parse(userRaw);
  } catch (_error) {
    throw new AppError("Invalid Telegram user payload", 400);
  }

  let parsedUser: z.infer<typeof telegramUserSchema>;
  try {
    parsedUser = telegramUserSchema.parse(telegramUserJson);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("Invalid Telegram user payload", 400, error.flatten());
    }

    throw error;
  }

  const telegramId = BigInt(parsedUser.id);

  return {
    telegramId,
    firstName: parsedUser.first_name ?? null,
    lastName: parsedUser.last_name ?? null,
    username: parsedUser.username ?? null,
    authDate
  };
};
