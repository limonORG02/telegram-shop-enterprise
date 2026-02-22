import { Router } from "express";

import modulesRouter from "../../modules";

const v1Router = Router();

v1Router.use(modulesRouter);

export default v1Router;
