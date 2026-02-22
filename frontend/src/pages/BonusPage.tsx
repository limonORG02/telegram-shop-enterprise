import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { bonusService } from "@/services/bonus/bonus.service";
import { usersService } from "@/services/users/users.service";
import { useAuthStore } from "@/store/auth.store";

const BONUS_TARGET = 10;

export const BonusPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [bonusPoints, setBonusPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const progress = useMemo(() => Math.min(bonusPoints / BONUS_TARGET, 1), [bonusPoints]);
  const canRedeem = bonusPoints >= BONUS_TARGET && !redeeming;

  const loadBonus = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const profile = await usersService.getUserById(user.id);
      setBonusPoints(profile.bonusPoints ?? 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("bonus.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, user?.id]);

  useEffect(() => {
    void loadBonus();
  }, [loadBonus]);

  const handleRedeem = async () => {
    if (!canRedeem) {
      return;
    }

    setRedeeming(true);
    setMessage(null);

    try {
      const result = await bonusService.redeemBonus({
        idempotencyKey: generateIdempotencyKey()
      });
      setBonusPoints(result.balance);
      setMessage(t("bonus.redeemSuccess"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("bonus.redeemError"));
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <section>
      <h2>{t("bonus.title")}</h2>
      <p>
        {t("bonus.currentPoints")}: {bonusPoints}
      </p>
      <progress max={1} value={progress} className="bonus-progress" />
      <p>
        {t("bonus.progressLabel", { current: Math.min(bonusPoints, BONUS_TARGET), target: BONUS_TARGET })}
      </p>
      <button type="button" className="btn-primary" disabled={!canRedeem} onClick={handleRedeem}>
        {redeeming ? t("bonus.redeeming") : t("bonus.redeem")}
      </button>
      {!canRedeem ? <p>{t("bonus.minRequirement")}</p> : null}
      {message ? <p>{message}</p> : null}
    </section>
  );
};

const generateIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `redeem:${crypto.randomUUID()}`;
  }

  return `redeem:${Date.now()}`;
};
