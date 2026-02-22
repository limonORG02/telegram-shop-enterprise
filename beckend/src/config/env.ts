import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  serviceName: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  telegramBotToken: string;
  telegramInitDataMaxAgeSeconds: number;
  adminTelegramIds: string[];
}

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parseCsv = (value: string | undefined): string[] => {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  serviceName: process.env.SERVICE_NAME ?? "telegram-shop-backend",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramInitDataMaxAgeSeconds: parsePositiveInt(
    process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    86400
  ),
  adminTelegramIds: parseCsv(process.env.ADMIN_TELEGRAM_IDS)
};
