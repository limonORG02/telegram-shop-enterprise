import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  telegramId: string;
}

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  telegramId: string;
  iat?: number;
  exp?: number;
  iss?: string;
}
