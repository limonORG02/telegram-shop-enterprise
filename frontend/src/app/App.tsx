import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BonusPage } from "@/pages/BonusPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { useAuthStore } from "@/store/auth.store";

export const App = () => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useAuthStore((state) => state.status);

  return (
    <BrowserRouter>
      <AuthBootstrap onInitialize={initializeAuth} />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/bonus" element={<BonusPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

interface AuthBootstrapProps {
  onInitialize: () => Promise<void>;
}

const AuthBootstrap = ({ onInitialize }: AuthBootstrapProps) => {
  useAuthStore((state) => state.status);

  // Single initialization for Telegram auth session.
  const hasInitializedRef = useHasInitializedRef();

  if (!hasInitializedRef.current) {
    hasInitializedRef.current = true;
    void onInitialize();
  }

  return null;
};

const useHasInitializedRef = () => {
  const ref = { current: false };
  return ref;
};
