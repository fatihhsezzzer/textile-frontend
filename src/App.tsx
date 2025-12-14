import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ModelistJobList from "./pages/ModelistJobList";
import ModelistJobTracker from "./pages/ModelistJobTracker";
import ModelistOrders from "./pages/ModelistOrders";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
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

  // Modelist kullanıcıları modelist orders sayfasına yönlendir
  if (user?.role === "Modelist") {
    return <Navigate to="/modelist-orders" replace />;
  }

  // Diğer kullanıcılar Orders sayfasına
  return <Navigate to="/orders" replace />;
};

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>; // Basit loading göstergesi
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
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

// Route component that blocks Modelist users
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

  // Modelist kullanıcıları kendi ekranlarına yönlendir
  if (user?.role === "Modelist") {
    return <Navigate to="/modelist-job-tracker" />;
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
      <BrowserRouter>
        <Routes>
          <Route
            path="/modelist-job-list"
            element={
              <ManagerRoute>
                <Layout>
                  <ModelistJobList />
                </Layout>
              </ManagerRoute>
            }
          />
          <Route
            path="/modelist-job-tracker"
            element={
              <PrivateRoute>
                <Layout>
                  <ModelistJobTracker />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/modelist-orders"
            element={
              <PrivateRoute>
                <Layout>
                  <ModelistOrders />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Login />} />

          {/* Public QR Code Route - No authentication required */}
          <Route path="/orderdetail/:orderId" element={<OrderQRDetail />} />

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
            path="/orders"
            element={
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <Orders />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/new"
            element={
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <OrderForm />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/edit/:orderId"
            element={
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <OrderForm />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/detail/:orderId"
            element={
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <OrderDetail />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/workshop-kanban"
            element={
              <ManagerRoute>
                <FullWidthLayout>
                  <WorkshopKanban />
                </FullWidthLayout>
              </ManagerRoute>
            }
          />
          <Route
            path="/firms"
            element={
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <Firms />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
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
              <PrivateRoute>
                <ModelistRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ModelistRoute>
              </PrivateRoute>
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
    </AuthProvider>
  );
}

export default App;
