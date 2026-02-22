import { Router } from "express";

import authRouter from "./auth/auth.routes";
import usersRouter from "./users/users.routes";
import productsRouter from "./products/products.routes";
import ordersRouter from "./orders/orders.routes";

const modulesRouter = Router();

modulesRouter.use("/auth", authRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use("/products", productsRouter);
modulesRouter.use("/orders", ordersRouter);

export default modulesRouter;
