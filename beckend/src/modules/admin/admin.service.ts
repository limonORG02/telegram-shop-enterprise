import { mapPrismaError } from "../../shared/errors/prisma-error";

import { AdminRepository } from "./admin.repository";

export interface AdminStatsResponse {
  dailyRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  topProducts: Array<{
    productId: string;
    name: string | null;
    sku: string | null;
    completedOrdersCount: number;
    totalQuantity: number;
  }>;
  totalOrders: number;
  totalCompletedOrders: number;
  totalBonusEarned: number;
  totalBonusSpent: number;
}

const getDayStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const getNextDayStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);

const getMonthStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const getNextMonthStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);

export class AdminService {
  constructor(private readonly adminRepository = new AdminRepository()) {}

  async getStats(): Promise<AdminStatsResponse> {
    const now = new Date();

    try {
      const stats = await this.adminRepository.getStatsAggregate({
        dayStart: getDayStart(now),
        dayEnd: getNextDayStart(now),
        monthStart: getMonthStart(now),
        monthEnd: getNextMonthStart(now)
      });

      return {
        dailyRevenue: stats.dailyRevenue.toNumber(),
        monthlyRevenue: stats.monthlyRevenue.toNumber(),
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        topProducts: stats.topProducts,
        totalOrders: stats.totalOrders,
        totalCompletedOrders: stats.totalCompletedOrders,
        totalBonusEarned: stats.totalBonusEarned,
        totalBonusSpent: stats.totalBonusSpent
      };
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }
}
