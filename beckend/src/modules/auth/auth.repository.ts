import { AuthProvider, Prisma, UserRole, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";

export interface AuthUserRecord {
  id: string;
  telegramId: bigint | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTelegramUserData {
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  lastLoginAt: Date;
}

interface UpdateTelegramUserData {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role?: UserRole;
  lastLoginAt: Date;
}

const authUserSelect = {
  id: true,
  telegramId: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
};

export class AuthRepository {
  async findUserByTelegramId(telegramId: bigint): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findFirst({
      where: {
        telegramId,
        deletedAt: null
      } as never,
      select: authUserSelect as never
    });

    return (user as AuthUserRecord | null) ?? null;
  }

  async createUserWithTelegramAccount(data: CreateTelegramUserData): Promise<AuthUserRecord> {
    const providerUserId = data.telegramId.toString();

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          telegramId: data.telegramId,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          status: UserStatus.ACTIVE,
          lastLoginAt: data.lastLoginAt
        } as never,
        select: authUserSelect as never
      });

      await tx.authAccount.create({
        data: {
          userId: createdUser.id,
          provider: AuthProvider.TELEGRAM,
          providerUserId
        } as never
      });

      return createdUser;
    });

    return user as unknown as AuthUserRecord;
  }

  async updateTelegramUser(userId: string, data: UpdateTelegramUserData): Promise<AuthUserRecord> {
    const user = await prisma.user.update({
      where: { id: userId } as never,
      data: {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        lastLoginAt: data.lastLoginAt
      } as never,
      select: authUserSelect as never
    });

    return user as unknown as AuthUserRecord;
  }

  async ensureTelegramAuthAccount(userId: string, telegramId: bigint): Promise<{ userId: string }> {
    const providerUserId = telegramId.toString();

    const existingAccount = await prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.TELEGRAM,
          providerUserId
        }
      } as never,
      select: {
        userId: true
      } as never
    });

    if (existingAccount) {
      return existingAccount as { userId: string };
    }

    try {
      const createdAccount = await prisma.authAccount.create({
        data: {
          userId,
          provider: AuthProvider.TELEGRAM,
          providerUserId
        } as never,
        select: {
          userId: true
        } as never
      });

      return createdAccount as { userId: string };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raceWinner = await prisma.authAccount.findUnique({
          where: {
            provider_providerUserId: {
              provider: AuthProvider.TELEGRAM,
              providerUserId
            }
          } as never,
          select: {
            userId: true
          } as never
        });

        if (raceWinner) {
          return raceWinner as { userId: string };
        }
      }

      throw error;
    }
  }
}
