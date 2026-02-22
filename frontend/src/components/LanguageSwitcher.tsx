import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  return (
    <div className="language-switcher" role="group" aria-label={t("common.switchLanguage")}>
      <button
        type="button"
        className={i18n.language === "ru" ? "lang-btn active" : "lang-btn"}
        onClick={() => void i18n.changeLanguage("ru")}
      >
        RU
      </button>
      <button
        type="button"
        className={i18n.language === "uz" ? "lang-btn active" : "lang-btn"}
        onClick={() => void i18n.changeLanguage("uz")}
      >
        UZ
      </button>
    </div>
  );
};
