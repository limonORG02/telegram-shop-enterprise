import { UserRole, UserStatus } from "@prisma/client";
import * as jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { mapPrismaError } from "../../shared/errors/prisma-error";

import { AuthRepository, AuthUserRecord } from "./auth.repository";
import { verifyTelegramInitData } from "./telegram-init-data";
import { TelegramSignInDto } from "./auth.validation";

export interface AuthUserResponse {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthUserResponse;
}

interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  telegramId: string;
}

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async signInWithTelegram(payload: TelegramSignInDto): Promise<AuthResponse> {
    this.ensureJwtConfigured();

    const verifiedTelegramUser = verifyTelegramInitData(
      payload.initData,
      env.telegramBotToken,
      env.telegramInitDataMaxAgeSeconds
    );

    const isAdminUser = this.isAdminTelegramId(verifiedTelegramUser.telegramId);
    let user = await this.authRepository.findUserByTelegramId(verifiedTelegramUser.telegramId);

    if (!user) {
      user = await this.createTelegramUser({
        telegramId: verifiedTelegramUser.telegramId,
        firstName: verifiedTelegramUser.firstName,
        lastName: verifiedTelegramUser.lastName,
        username: verifiedTelegramUser.username,
        role: isAdminUser ? UserRole.ADMIN : UserRole.CUSTOMER,
        authDate: verifiedTelegramUser.authDate
      });
    } else {
      this.ensureUserCanSignIn(user);

      user = await this.updateTelegramUser(user.id, {
        firstName: verifiedTelegramUser.firstName,
        lastName: verifiedTelegramUser.lastName,
        username: verifiedTelegramUser.username,
        authDate: verifiedTelegramUser.authDate,
        role: isAdminUser ? UserRole.ADMIN : undefined
      });
    }

    await this.ensureAccountOwnership(user.id, verifiedTelegramUser.telegramId);

    const accessToken = this.issueAccessToken(user);

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: env.jwtAccessExpiresIn,
      user: this.toAuthUserResponse(user)
    };
  }

  private async createTelegramUser(input: {
    telegramId: bigint;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    authDate: Date;
  }): Promise<AuthUserRecord> {
    try {
      return await this.authRepository.createUserWithTelegramAccount({
        telegramId: input.telegramId,
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        lastLoginAt: input.authDate
      });
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (!prismaError) {
        throw error;
      }

      if (prismaError.statusCode !== 409) {
        throw prismaError;
      }

      const existingUser = await this.authRepository.findUserByTelegramId(input.telegramId);
      if (!existingUser) {
        throw prismaError;
      }

      this.ensureUserCanSignIn(existingUser);

      return this.updateTelegramUser(existingUser.id, {
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        authDate: input.authDate,
        role: input.role === UserRole.ADMIN ? UserRole.ADMIN : undefined
      });
    }
  }

  private async updateTelegramUser(
    userId: string,
    input: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      authDate: Date;
      role?: UserRole;
    }
  ): Promise<AuthUserRecord> {
    try {
      return await this.authRepository.updateTelegramUser(userId, {
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        lastLoginAt: input.authDate
      });
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }

  private async ensureAccountOwnership(userId: string, telegramId: bigint): Promise<void> {
    try {
      const authAccount = await this.authRepository.ensureTelegramAuthAccount(userId, telegramId);
      if (authAccount.userId !== userId) {
        throw new AppError("Telegram identity is linked to another account", 409);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }

  private ensureUserCanSignIn(user: AuthUserRecord): void {
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
      throw new AppError("User account is not allowed to sign in", 403);
    }
  }

  private ensureJwtConfigured(): void {
    if (!env.jwtAccessSecret) {
      throw new AppError("JWT access token secret is not configured", 500);
    }
  }

  private issueAccessToken(user: AuthUserRecord): string {
    const telegramId = this.requireTelegramId(user.telegramId);

    const payload: JwtAccessPayload = {
      sub: user.id,
      role: user.role,
      telegramId
    };

    return jwt.sign(payload, env.jwtAccessSecret, {
      expiresIn: env.jwtAccessExpiresIn,
      issuer: env.serviceName
    });
  }

  private isAdminTelegramId(telegramId: bigint): boolean {
    return env.adminTelegramIds.includes(telegramId.toString());
  }

  private toAuthUserResponse(user: AuthUserRecord): AuthUserResponse {
    const telegramId = this.requireTelegramId(user.telegramId);

    return {
      id: user.id,
      telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt
    };
  }

  private requireTelegramId(telegramId: bigint | null): string {
    if (!telegramId) {
      throw new AppError("User telegram_id is missing", 500);
    }

    return telegramId.toString();
  }
}
