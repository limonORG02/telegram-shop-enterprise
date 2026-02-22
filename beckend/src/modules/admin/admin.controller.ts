import { Request, Response } from "express";

import { AdminService } from "./admin.service";

export class AdminController {
  constructor(private readonly adminService = new AdminService()) {}

  getStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.adminService.getStats();

    res.status(200).json({
      status: "success",
      data: stats
    });
  };
}
