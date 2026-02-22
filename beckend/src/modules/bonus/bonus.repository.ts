import { BonusTransactionType, Prisma, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";

export type DbClient = Prisma.TransactionClient;

export interface BonusUserRecord {
  id: string;
  bonusPoints: number;
  status: UserStatus;
  deletedAt: Date | null;
}

export interface BonusTransactionRecord {
  id: string;
  userId: string;
  orderId: string | null;
  type: BonusTransactionType;
  points: number;
  idempotencyKey: string | null;
  createdAt: Date;
}

const bonusTransactionSelect = {
  id: true,
  userId: true,
  orderId: true,
  type: true,
  points: true,
  idempotencyKey: true,
  createdAt: true
};

export class BonusRepository {
  async runInTransaction<T>(callback: (tx: DbClient) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => callback(tx as DbClient));
  }

  async findUserById(tx: DbClient, userId: string): Promise<BonusUserRecord | null> {
    const user = await tx.user.findUnique({
      where: { id: userId } as never,
      select: {
        id: true,
        bonusPoints: true,
        status: true,
        deletedAt: true
      } as never
    });

    return (user as BonusUserRecord | null) ?? null;
  }

  async findSpendTransactionByIdempotencyKey(
    tx: DbClient,
    userId: string,
    idempotencyKey: string
  ): Promise<BonusTransactionRecord | null> {
    const transaction = await tx.bonusTransaction.findFirst({
      where: {
        userId,
        idempotencyKey,
        type: BonusTransactionType.SPEND
      } as never,
      select: bonusTransactionSelect as never
    });

    return (transaction as BonusTransactionRecord | null) ?? null;
  }

  async createSpendTransaction(
    tx: DbClient,
    data: {
      userId: string;
      idempotencyKey: string;
      points: number;
      metadata?: Prisma.InputJsonValue;
    }
  ): Promise<BonusTransactionRecord> {
    const transaction = await tx.bonusTransaction.create({
      data: {
        userId: data.userId,
        type: BonusTransactionType.SPEND,
        points: data.points,
        idempotencyKey: data.idempotencyKey,
        metadata: data.metadata
      } as never,
      select: bonusTransactionSelect as never
    });

    return transaction as unknown as BonusTransactionRecord;
  }

  async decrementBonusPointsIfEnough(
    tx: DbClient,
    userId: string,
    points: number
  ): Promise<boolean> {
    const result = await tx.user.updateMany({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        bonusPoints: {
          gte: points
        }
      } as never,
      data: {
        bonusPoints: {
          decrement: points
        }
      } as never
    });

    return result.count > 0;
  }
}
