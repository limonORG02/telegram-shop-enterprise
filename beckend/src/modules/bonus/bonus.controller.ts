import { Request, Response } from "express";

import { getAuthUser } from "../../shared/auth/auth-context";

import { BonusService } from "./bonus.service";
import { RedeemBonusDto } from "./bonus.validation";

export class BonusController {
  constructor(private readonly bonusService = new BonusService()) {}

  redeemBonus = async (req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(req);
    const result = await this.bonusService.redeemBonus(authUser.id, req.body as RedeemBonusDto);

    res.status(200).json({
      status: "success",
      data: result
    });
  };
}
