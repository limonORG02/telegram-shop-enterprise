import { BonusTransactionType, OrderStatus, Prisma, ProductStatus, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";

export type DbClient = Prisma.TransactionClient;

export interface ActiveUserRecord {
  id: string;
  status: UserStatus;
  bonusPoints: number;
  deletedAt: Date | null;
}

export interface ProductForOrderRecord {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  currency: string;
  price: Prisma.Decimal;
  inventory: {
    quantity: number;
  } | null;
}

export interface OrderItemCreateRecord {
  productId: string;
  quantity: number;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: OrderStatus;
  currency: string;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  shippingTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  bonusPointsUsed: number;
  bonusPointsEarned: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetailsRecord extends OrderRecord {
  items: Array<{
    id: string;
    productId: string | null;
    skuSnapshot: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
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

const orderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  currency: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  shippingTotal: true,
  grandTotal: true,
  bonusPointsUsed: true,
  bonusPointsEarned: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

const orderDetailsSelect = {
  ...orderSelect,
  items: {
    select: {
      id: true,
      productId: true,
      skuSnapshot: true,
      nameSnapshot: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true
    }
  }
};

export class OrdersRepository {
  async runInTransaction<T>(callback: (tx: DbClient) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => callback(tx as DbClient));
  }

  async findActiveUserById(tx: DbClient, userId: string): Promise<ActiveUserRecord | null> {
    const user = await tx.user.findUnique({
      where: { id: userId } as never,
      select: {
        id: true,
        status: true,
        bonusPoints: true,
        deletedAt: true
      } as never
    });

    return (user as ActiveUserRecord | null) ?? null;
  }

  async findProductsForOrder(
    tx: DbClient,
    productIds: string[]
  ): Promise<ProductForOrderRecord[]> {
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null
      } as never,
      select: {
        id: true,
        sku: true,
        name: true,
        status: true,
        currency: true,
        price: true,
        inventory: {
          select: {
            quantity: true
          }
        }
      } as never
    });

    return products as unknown as ProductForOrderRecord[];
  }

  async reserveProductStock(
    tx: DbClient,
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const result = await tx.inventory.updateMany({
      where: {
        productId,
        quantity: {
          gte: quantity
        }
      } as never,
      data: {
        quantity: {
          decrement: quantity
        },
        reserved: {
          increment: quantity
        }
      } as never
    });

    return result.count > 0;
  }

  async createPendingOrder(
    tx: DbClient,
    data: {
      orderNumber: string;
      userId: string;
      currency: string;
      subtotal: Prisma.Decimal;
      grandTotal: Prisma.Decimal;
      notes?: string;
    }
  ): Promise<OrderRecord> {
    const order = await tx.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: data.userId,
        status: OrderStatus.PENDING,
        currency: data.currency,
        subtotal: data.subtotal,
        grandTotal: data.grandTotal,
        discountTotal: new Prisma.Decimal(0),
        taxTotal: new Prisma.Decimal(0),
        shippingTotal: new Prisma.Decimal(0),
        bonusPointsUsed: 0,
        bonusPointsEarned: 0,
        notes: data.notes
      } as never,
      select: orderSelect as never
    });

    return order as unknown as OrderRecord;
  }

  async createOrderItems(
    tx: DbClient,
    orderId: string,
    items: OrderItemCreateRecord[]
  ): Promise<void> {
    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        skuSnapshot: item.skuSnapshot,
        nameSnapshot: item.nameSnapshot,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      })) as never
    });
  }

  async findOrderById(tx: DbClient, id: string): Promise<OrderRecord | null> {
    const order = await tx.order.findUnique({
      where: { id } as never,
      select: orderSelect as never
    });

    return (order as OrderRecord | null) ?? null;
  }

  async updateOrderStatus(
    tx: DbClient,
    orderId: string,
    status: OrderStatus
  ): Promise<OrderRecord> {
    const order = await tx.order.update({
      where: { id: orderId } as never,
      data: { status } as never,
      select: orderSelect as never
    });

    return order as unknown as OrderRecord;
  }

  async findBonusTransactionByOrderAndType(
    tx: DbClient,
    orderId: string,
    type: BonusTransactionType
  ): Promise<BonusTransactionRecord | null> {
    const transaction = await tx.bonusTransaction.findFirst({
      where: {
        orderId,
        type
      } as never,
      select: {
        id: true,
        userId: true,
        orderId: true,
        type: true,
        points: true,
        idempotencyKey: true,
        createdAt: true
      } as never
    });

    return (transaction as BonusTransactionRecord | null) ?? null;
  }

  async createBonusTransaction(
    tx: DbClient,
    data: {
      userId: string;
      orderId?: string;
      type: BonusTransactionType;
      points: number;
      idempotencyKey?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ): Promise<BonusTransactionRecord> {
    const transaction = await tx.bonusTransaction.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        type: data.type,
        points: data.points,
        idempotencyKey: data.idempotencyKey,
        metadata: data.metadata
      } as never,
      select: {
        id: true,
        userId: true,
        orderId: true,
        type: true,
        points: true,
        idempotencyKey: true,
        createdAt: true
      } as never
    });

    return transaction as unknown as BonusTransactionRecord;
  }

  async incrementUserBonusPoints(
    tx: DbClient,
    userId: string,
    points: number
  ): Promise<void> {
    await tx.user.update({
      where: { id: userId } as never,
      data: {
        bonusPoints: {
          increment: points
        }
      } as never
    });
  }

  async getOrderDetailsById(orderId: string): Promise<OrderDetailsRecord | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId } as never,
      select: orderDetailsSelect as never
    });

    return (order as OrderDetailsRecord | null) ?? null;
  }
}
