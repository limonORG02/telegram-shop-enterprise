import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/store/auth.store";

export const ProtectedRoute = () => {
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  if (status === "idle" || status === "loading") {
    return <AuthStateMessage message={t("auth.connecting")} />;
  }

  if (status !== "authenticated") {
    return (
      <AuthStateMessage
        message={error ?? t("auth.failed")}
        actionLabel={t("common.retry")}
        onAction={() => void initializeAuth()}
      />
    );
  }

  return <Outlet />;
};

interface AuthStateMessageProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const AuthStateMessage = ({ message, actionLabel, onAction }: AuthStateMessageProps) => {
  return (
    <div className="screen-center">
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
