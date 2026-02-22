import { BonusTransactionType, OrderStatus, Prisma, ProductStatus, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { AppError } from "../../shared/errors/app-error";
import { mapPrismaError } from "../../shared/errors/prisma-error";

import { CreateOrderDto, UpdateOrderStatusDto } from "./orders.validation";
import {
  DbClient,
  OrderDetailsRecord,
  OrderItemCreateRecord,
  OrdersRepository,
  ProductForOrderRecord
} from "./orders.repository";

interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  bonusPointsUsed: number;
  bonusPointsEarned: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string | null;
    skuSnapshot: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export class OrdersService {
  constructor(private readonly ordersRepository = new OrdersRepository()) {}

  async createOrder(userId: string, payload: CreateOrderDto): Promise<OrderResponse> {
    let orderId: string;
    try {
      orderId = await this.ordersRepository.runInTransaction(async (tx) => {
        const user = await this.ordersRepository.findActiveUserById(tx, userId);

        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
          throw new AppError("User is not allowed to create orders", 403);
        }

        const requestedItems = this.aggregateRequestedItems(payload.items);
        const productIds = requestedItems.map((item) => item.productId);
        const products = await this.ordersRepository.findProductsForOrder(tx, productIds);

        const productsById = new Map(products.map((product) => [product.id, product]));

        const orderCurrency = this.resolveOrderCurrency(products);
        const orderItemsToCreate: OrderItemCreateRecord[] = [];
        let subtotalAmount = 0;

        for (const requestedItem of requestedItems) {
          const product = productsById.get(requestedItem.productId);
          if (!product) {
            throw new AppError(`Product not found: ${requestedItem.productId}`, 404);
          }

          this.assertProductIsOrderable(product);
          this.assertProductHasStock(product, requestedItem.quantity);

          const reserved = await this.ordersRepository.reserveProductStock(
            tx,
            product.id,
            requestedItem.quantity
          );

          if (!reserved) {
            throw new AppError(`Insufficient stock for product ${product.id}`, 409);
          }

          const unitPrice = product.price;
          const lineTotal = this.toMoney(unitPrice.toNumber() * requestedItem.quantity);
          subtotalAmount += lineTotal.toNumber();

          orderItemsToCreate.push({
            productId: product.id,
            quantity: requestedItem.quantity,
            skuSnapshot: product.sku,
            nameSnapshot: product.name,
            unitPrice,
            lineTotal
          });
        }

        const subtotal = this.toMoney(subtotalAmount);
        const order = await this.createPendingOrderWithRetry(tx, {
          userId,
          orderNumber: this.generateOrderNumber(),
          currency: orderCurrency,
          subtotal,
          grandTotal: subtotal,
          notes: payload.notes
        });

        await this.ordersRepository.createOrderItems(tx, order.id, orderItemsToCreate);

        return order.id;
      });
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }

    const createdOrder = await this.ordersRepository.getOrderDetailsById(orderId);
    if (!createdOrder) {
      throw new AppError("Order not found after creation", 500);
    }

    return this.toOrderResponse(createdOrder);
  }

  async updateOrderStatus(orderId: string, payload: UpdateOrderStatusDto): Promise<OrderResponse> {
    try {
      await this.ordersRepository.runInTransaction(async (tx) => {
        const order = await this.ordersRepository.findOrderById(tx, orderId);
        if (!order) {
          throw new AppError("Order not found", 404);
        }

        if (order.status === payload.status) {
          return;
        }

        if (payload.status !== OrderStatus.COMPLETED) {
          await this.ordersRepository.updateOrderStatus(
            tx,
            orderId,
            payload.status as OrderStatus
          );
          return;
        }

        await this.ordersRepository.updateOrderStatus(tx, orderId, OrderStatus.COMPLETED);

        if (!order.userId) {
          return;
        }

        const existingEarnTransaction =
          await this.ordersRepository.findBonusTransactionByOrderAndType(
            tx,
            order.id,
            BonusTransactionType.EARN
          );

        if (existingEarnTransaction) {
          return;
        }

        try {
          await this.ordersRepository.createBonusTransaction(tx, {
            userId: order.userId,
            orderId: order.id,
            type: BonusTransactionType.EARN,
            points: 1,
            idempotencyKey: `order-completed:${order.id}`,
            metadata: {
              source: "ORDER_COMPLETION"
            }
          });
        } catch (error) {
          const isIdempotentConflict =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

          if (isIdempotentConflict) {
            return;
          }

          const prismaError = mapPrismaError(error);
          if (prismaError) {
            throw prismaError;
          }

          throw error;
        }

        await this.ordersRepository.incrementUserBonusPoints(tx, order.userId, 1);
      });
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }

    const updatedOrder = await this.ordersRepository.getOrderDetailsById(orderId);
    if (!updatedOrder) {
      throw new AppError("Order not found after update", 500);
    }

    return this.toOrderResponse(updatedOrder);
  }

  private aggregateRequestedItems(
    items: CreateOrderDto["items"]
  ): Array<{ productId: string; quantity: number }> {
    const quantityByProductId = new Map<string, number>();

    for (const item of items) {
      quantityByProductId.set(
        item.productId,
        (quantityByProductId.get(item.productId) ?? 0) + item.quantity
      );
    }

    return Array.from(quantityByProductId.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }));
  }

  private resolveOrderCurrency(products: ProductForOrderRecord[]): string {
    if (products.length === 0) {
      throw new AppError("Order must include at least one product", 400);
    }

    const currency = products[0].currency;

    const hasMixedCurrencies = products.some((product) => product.currency !== currency);
    if (hasMixedCurrencies) {
      throw new AppError("All products in an order must have the same currency", 400);
    }

    return currency;
  }

  private assertProductIsOrderable(product: ProductForOrderRecord): void {
    if (product.status !== ProductStatus.ACTIVE) {
      throw new AppError(`Product is not available: ${product.id}`, 400);
    }

    if (!product.inventory) {
      throw new AppError(`Inventory is not configured for product ${product.id}`, 409);
    }
  }

  private assertProductHasStock(product: ProductForOrderRecord, quantity: number): void {
    if (!product.inventory || product.inventory.quantity < quantity) {
      throw new AppError(`Insufficient stock for product ${product.id}`, 409);
    }
  }

  private async createPendingOrderWithRetry(
    tx: DbClient,
    data: {
      userId: string;
      orderNumber: string;
      currency: string;
      subtotal: Prisma.Decimal;
      grandTotal: Prisma.Decimal;
      notes?: string;
    }
  ) {
    let attempts = 0;
    let currentOrderNumber = data.orderNumber;

    while (attempts < 3) {
      try {
        return await this.ordersRepository.createPendingOrder(tx, {
          ...data,
          orderNumber: currentOrderNumber
        });
      } catch (error) {
        const isUniqueOrderNumberError =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";

        if (!isUniqueOrderNumberError) {
          const prismaError = mapPrismaError(error);
          if (prismaError) {
            throw prismaError;
          }

          throw error;
        }

        attempts += 1;
        currentOrderNumber = this.generateOrderNumber();
      }
    }

    throw new AppError("Failed to allocate unique order number", 500);
  }

  private toMoney(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value.toFixed(2));
  }

  private generateOrderNumber(): string {
    return `ORD-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
  }

  private toOrderResponse(order: OrderDetailsRecord): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      currency: order.currency,
      subtotal: order.subtotal.toNumber(),
      discountTotal: order.discountTotal.toNumber(),
      taxTotal: order.taxTotal.toNumber(),
      shippingTotal: order.shippingTotal.toNumber(),
      grandTotal: order.grandTotal.toNumber(),
      bonusPointsUsed: order.bonusPointsUsed,
      bonusPointsEarned: order.bonusPointsEarned,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        skuSnapshot: item.skuSnapshot,
        nameSnapshot: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        lineTotal: item.lineTotal.toNumber()
      }))
    };
  }
}
