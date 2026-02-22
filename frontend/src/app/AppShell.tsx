import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BottomNavigation } from "@/components/BottomNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const AppShell = () => {
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};
