import { Router } from "express";

import adminRouter from "./admin/admin.routes";
import authRouter from "./auth/auth.routes";
import bonusRouter from "./bonus/bonus.routes";
import usersRouter from "./users/users.routes";
import productsRouter from "./products/products.routes";
import ordersRouter from "./orders/orders.routes";

const modulesRouter = Router();

modulesRouter.use("/admin", adminRouter);
modulesRouter.use("/auth", authRouter);
modulesRouter.use("/bonus", bonusRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use("/products", productsRouter);
modulesRouter.use("/orders", ordersRouter);

export default modulesRouter;
