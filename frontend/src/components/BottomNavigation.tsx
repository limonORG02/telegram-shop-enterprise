import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/catalog", key: "navigation.catalog" },
  { to: "/bonus", key: "navigation.bonus" },
  { to: "/orders", key: "navigation.orders" },
  { to: "/contacts", key: "navigation.contacts" }
];

export const BottomNavigation = () => {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "bottom-nav-link active" : "bottom-nav-link")}
        >
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  );
};
