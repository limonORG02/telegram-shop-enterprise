import { Request, Response } from "express";

import { getAuthUser } from "../../shared/auth/auth-context";

import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "./orders.validation";

export class OrdersController {
  constructor(private readonly ordersService = new OrdersService()) {}

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(req);
    const order = await this.ordersService.createOrder(authUser.id, req.body as CreateOrderDto);

    res.status(201).json({
      status: "success",
      data: order
    });
  };

  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const order = await this.ordersService.updateOrderStatus(
      req.params.id,
      req.body as UpdateOrderStatusDto
    );

    res.status(200).json({
      status: "success",
      data: order
    });
  };
}
