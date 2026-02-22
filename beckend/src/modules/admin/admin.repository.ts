import { BonusTransactionType, OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";

export interface TopProductRecord {
  productId: string;
  name: string | null;
  sku: string | null;
  completedOrdersCount: number;
  totalQuantity: number;
}

export interface AdminStatsAggregateRecord {
  dailyRevenue: Prisma.Decimal;
  monthlyRevenue: Prisma.Decimal;
  totalUsers: number;
  activeUsers: number;
  topProducts: TopProductRecord[];
  totalOrders: number;
  totalCompletedOrders: number;
  totalBonusEarned: number;
  totalBonusSpent: number;
}

export class AdminRepository {
  async getStatsAggregate(input: {
    dayStart: Date;
    dayEnd: Date;
    monthStart: Date;
    monthEnd: Date;
  }): Promise<AdminStatsAggregateRecord> {
    const [
      dailyRevenueAggregate,
      monthlyRevenueAggregate,
      totalUsers,
      totalOrders,
      totalCompletedOrders,
      totalBonusEarnedAggregate,
      totalBonusSpentAggregate,
      activeUsersGroups,
      topProductsGroups
    ] = await prisma.$transaction([
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: input.dayStart,
            lt: input.dayEnd
          }
        },
        _sum: {
          grandTotal: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: input.monthStart,
            lt: input.monthEnd
          }
        },
        _sum: {
          grandTotal: true
        }
      }),
      prisma.user.count({
        where: {
          deletedAt: null
        }
      }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: OrderStatus.COMPLETED
        }
      }),
      prisma.bonusTransaction.aggregate({
        where: {
          type: BonusTransactionType.EARN
        },
        _sum: {
          points: true
        }
      }),
      prisma.bonusTransaction.aggregate({
        where: {
          type: BonusTransactionType.SPEND
        },
        _sum: {
          points: true
        }
      }),
      prisma.order.groupBy({
        by: ["userId"],
        where: {
          status: OrderStatus.COMPLETED,
          userId: {
            not: null
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          productId: {
            not: null
          },
          order: {
            status: OrderStatus.COMPLETED
          }
        },
        _count: {
          _all: true
        },
        _sum: {
          quantity: true
        },
        orderBy: [
          {
            _count: {
              _all: "desc"
            }
          },
          {
            _sum: {
              quantity: "desc"
            }
          }
        ],
        take: 5
      })
    ]);

    const topProductIds = topProductsGroups
      .map((group) => group.productId)
      .filter((productId): productId is string => Boolean(productId));

    const topProductRows =
      topProductIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: topProductIds
              }
            },
            select: {
              id: true,
              name: true,
              sku: true
            }
          })
        : [];

    const productById = new Map(topProductRows.map((product) => [product.id, product]));

    const topProducts: TopProductRecord[] = topProductsGroups
      .map((group) => {
        if (!group.productId) {
          return null;
        }

        const product = productById.get(group.productId);

        return {
          productId: group.productId,
          name: product?.name ?? null,
          sku: product?.sku ?? null,
          completedOrdersCount: group._count._all,
          totalQuantity: group._sum.quantity ?? 0
        };
      })
      .filter((value): value is TopProductRecord => Boolean(value));

    return {
      dailyRevenue: dailyRevenueAggregate._sum.grandTotal ?? new Prisma.Decimal(0),
      monthlyRevenue: monthlyRevenueAggregate._sum.grandTotal ?? new Prisma.Decimal(0),
      totalUsers,
      activeUsers: activeUsersGroups.length,
      topProducts,
      totalOrders,
      totalCompletedOrders,
      totalBonusEarned: totalBonusEarnedAggregate._sum.points ?? 0,
      totalBonusSpent: totalBonusSpentAggregate._sum.points ?? 0
    };
  }
}
