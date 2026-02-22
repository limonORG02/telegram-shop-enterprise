import { Prisma, UserStatus } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapPrismaError } from "../../shared/errors/prisma-error";

import { BonusRepository } from "./bonus.repository";
import { RedeemBonusDto } from "./bonus.validation";

const REDEEM_POINTS = 10;

export interface RedeemBonusResponse {
  redeemedPoints: number;
  balance: number;
  idempotent: boolean;
}

export class BonusService {
  constructor(private readonly bonusRepository = new BonusRepository()) {}

  async redeemBonus(userId: string, payload: RedeemBonusDto): Promise<RedeemBonusResponse> {
    try {
      return this.bonusRepository.runInTransaction(async (tx) => {
        const user = await this.bonusRepository.findUserById(tx, userId);

        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
          throw new AppError("User is not allowed to redeem bonus points", 403);
        }

        const existingTransaction = await this.bonusRepository.findSpendTransactionByIdempotencyKey(
          tx,
          userId,
          payload.idempotencyKey
        );

        if (existingTransaction) {
          const latestUser = await this.bonusRepository.findUserById(tx, userId);
          if (!latestUser) {
            throw new AppError("User not found", 404);
          }

          return {
            redeemedPoints: existingTransaction.points,
            balance: latestUser.bonusPoints,
            idempotent: true
          };
        }

        if (user.bonusPoints < REDEEM_POINTS) {
          throw new AppError("At least 10 bonus points are required", 400);
        }

        try {
          await this.bonusRepository.createSpendTransaction(tx, {
            userId,
            idempotencyKey: payload.idempotencyKey,
            points: REDEEM_POINTS,
            metadata: {
              source: "BONUS_REDEEM"
            }
          });
        } catch (error) {
          const duplicateIdempotencyKey =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

          if (!duplicateIdempotencyKey) {
            const prismaError = mapPrismaError(error);
            if (prismaError) {
              throw prismaError;
            }

            throw error;
          }

          const retryTransaction = await this.bonusRepository.findSpendTransactionByIdempotencyKey(
            tx,
            userId,
            payload.idempotencyKey
          );

          if (!retryTransaction) {
            throw new AppError("Failed to resolve idempotency conflict", 409);
          }

          const latestUser = await this.bonusRepository.findUserById(tx, userId);
          if (!latestUser) {
            throw new AppError("User not found", 404);
          }

          return {
            redeemedPoints: retryTransaction.points,
            balance: latestUser.bonusPoints,
            idempotent: true
          };
        }

        const decremented = await this.bonusRepository.decrementBonusPointsIfEnough(
          tx,
          userId,
          REDEEM_POINTS
        );

        if (!decremented) {
          throw new AppError("At least 10 bonus points are required", 400);
        }

        const updatedUser = await this.bonusRepository.findUserById(tx, userId);
        if (!updatedUser) {
          throw new AppError("User not found", 404);
        }

        return {
          redeemedPoints: REDEEM_POINTS,
          balance: updatedUser.bonusPoints,
          idempotent: false
        };
      });
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }
}
