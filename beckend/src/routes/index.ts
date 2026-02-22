import { Router } from "express";

import healthRouter from "./health.route";
import v1Router from "./v1";

const rootRouter = Router();

rootRouter.use(healthRouter);
rootRouter.use("/api/v1", v1Router);

export default rootRouter;
