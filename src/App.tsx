import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ExchangeRateProvider } from "./context/ExchangeRateContext";
import ModelistMyOrders from "./pages/ModelistMyOrders";
import AccountingOrders from "./pages/AccountingOrders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import UserManagement from "./pages/UserManagement";
import Orders from "./pages/Orders";
import OrderForm from "./pages/OrderForm";
import OrderDetail from "./pages/OrderDetail";
import OrderQRDetail from "./pages/OrderQRDetail";
import WorkshopKanban from "./pages/WorkshopKanban";
import Firms from "./pages/Firms";
import Models from "./pages/Models";
import ModelCosts from "./pages/ModelCosts";
import Workshops from "./pages/Workshops";
import WorkshopCosts from "./pages/WorkshopCosts";
import Operators from "./pages/Operators";
import Technics from "./pages/Technics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CostManagement from "./pages/CostManagement";
import CategoryForm from "./pages/CategoryForm";
import CostItemForm from "./pages/CostItemForm";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./App.css";

// Role-based home page redirect component
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();

  // Modelist kullanıcıları kendi siparişleri sayfasına yönlendir
  if (user?.role === "Modelist") {
    return <Navigate to="/modelist-my-orders" replace />;
  }

  // Muhasebeci kullanıcıları fatura yönetimi sayfasına yönlendir
  if (user?.role === "Muhasebeci") {
    return <Navigate to="/accounting-orders" replace />;
  }

  // Diğer kullanıcılar Orders sayfasına
  return <Navigate to="/orders" replace />;
};

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>; // Basit loading göstergesi
  }

  if (!isAuthenticated) {
    // Kullanıcının gitmek istediği URL'i hem state'e hem sessionStorage'a kaydet
    const redirectPath = `${location.pathname}${location.search}`;
    sessionStorage.setItem("redirectAfterLogin", redirectPath);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Manager-only route component
const ManagerRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user || user.role !== "Manager") {
    return <Navigate to="/orders" />;
  }

  return children;
};

// Manager or Accountant route component
const ManagerOrAccountantRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user || (user.role !== "Manager" && user.role !== "Muhasebeci")) {
    return <Navigate to="/orders" />;
  }

  return children;
};

// Route component that blocks Modelist users from certain pages
const ModelistRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Modelist kullanıcıları kendi siparişleri sayfasına yönlendir
  if (user?.role === "Modelist") {
    return <Navigate to="/modelist-my-orders" />;
  }

  return children;
};

// Accountant-only route component
const AccountantRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user || user.role !== "Muhasebeci") {
    return <Navigate to="/orders" />;
  }

  return children;
};

// Layout component with sidebar
const Layout: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="main-content">
        {/* Header Component with menu button */}
        <div className="header-container">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>

        <div className="content-container">{children}</div>
      </div>
    </div>
  );
};

// Full width layout for Kanban (no content-container wrapper)
const FullWidthLayout: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area - full width */}
      <div className="main-content" style={{ overflow: "visible" }}>
        {/* Header Component with menu button */}
        <div className="header-container">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ExchangeRateProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/modelist-my-orders"
              element={
                <PrivateRoute>
                  <Layout>
                    <ModelistMyOrders />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/accounting-orders"
              element={
                <ManagerOrAccountantRoute>
                  <Layout>
                    <AccountingOrders />
                  </Layout>
                </ManagerOrAccountantRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route
              path="/change-password"
              element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              }
            />

            {/* QR Code Route - Authentication required for redirect to work */}
            <Route
              path="/orderdetail/:orderId"
              element={
                <PrivateRoute>
                  <OrderQRDetail />
                </PrivateRoute>
              }
            />

            <Route
              path="/register"
              element={
                <ManagerRoute>
                  <Layout>
                    <Register />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <ManagerRoute>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <Layout>
                    <Orders />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/new"
              element={
                <PrivateRoute>
                  <Layout>
                    <OrderForm />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/edit/:orderId"
              element={
                <PrivateRoute>
                  <Layout>
                    <OrderForm />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/detail/:orderId"
              element={
                <PrivateRoute>
                  <Layout>
                    <OrderDetail />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/workshop-kanban"
              element={
                <PrivateRoute>
                  <FullWidthLayout>
                    <WorkshopKanban />
                  </FullWidthLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/firms"
              element={
                <ManagerOrAccountantRoute>
                  <Layout>
                    <Firms />
                  </Layout>
                </ManagerOrAccountantRoute>
              }
            />
            <Route
              path="/models"
              element={
                <PrivateRoute>
                  <Layout>
                    <Models />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/workshops"
              element={
                <ManagerRoute>
                  <Layout>
                    <Workshops />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/workshops/:workshopId/costs"
              element={
                <ManagerRoute>
                  <Layout>
                    <WorkshopCosts />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/models"
              element={
                <ManagerRoute>
                  <Layout>
                    <Models />
                  </Layout>
                </ManagerRoute>
              }
            />
            {/* Model Costs - Firma Listesi */}
            <Route
              path="/model-costs"
              element={
                <ManagerRoute>
                  <Layout>
                    <ModelCosts />
                  </Layout>
                </ManagerRoute>
              }
            />
            {/* Model Costs - Firma Modelleri */}
            <Route
              path="/model-costs/firm/:firmId"
              element={
                <ManagerRoute>
                  <Layout>
                    <ModelCosts />
                  </Layout>
                </ManagerRoute>
              }
            />
            {/* Model Costs - Model Detay */}
            <Route
              path="/model-costs/model/:modelId"
              element={
                <ManagerRoute>
                  <Layout>
                    <ModelCosts />
                  </Layout>
                </ManagerRoute>
              }
            />
            {/* Eski route - geriye uyumluluk için */}
            <Route
              path="/models/:modelId/costs"
              element={
                <ManagerRoute>
                  <Layout>
                    <ModelCosts />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/operators"
              element={
                <PrivateRoute>
                  <ModelistRoute>
                    <Layout>
                      <Operators />
                    </Layout>
                  </ModelistRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/technics"
              element={
                <PrivateRoute>
                  <ModelistRoute>
                    <Layout>
                      <Technics />
                    </Layout>
                  </ModelistRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <ModelistRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ModelistRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ManagerRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/cost"
              element={
                <ManagerRoute>
                  <Layout>
                    <CostManagement />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/cost/categories/new"
              element={
                <ManagerRoute>
                  <Layout>
                    <CategoryForm />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/cost/categories/:id"
              element={
                <ManagerRoute>
                  <Layout>
                    <CategoryForm />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/cost/items/new"
              element={
                <ManagerRoute>
                  <Layout>
                    <CostItemForm />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/cost/items/:id/edit"
              element={
                <ManagerRoute>
                  <Layout>
                    <CostItemForm />
                  </Layout>
                </ManagerRoute>
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <HomeRedirect />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ExchangeRateProvider>
    </AuthProvider>
  );
}

export default App;
