import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Orders from "./pages/Orders";
import OrderForm from "./pages/OrderForm";
import OrderDetail from "./pages/OrderDetail";
import Kanban from "./pages/Kanban";
import WorkshopKanban from "./pages/WorkshopKanban";
import Firms from "./pages/Firms";
import Models from "./pages/Models";
import Workshops from "./pages/Workshops";
import Operators from "./pages/Operators";
import Technics from "./pages/Technics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./App.css";

// Role-based home page redirect component
const HomeRedirect: React.FC = () => {
  // Artık herkes Orders sayfasına erişebilir
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            path="/kanban"
            element={
              <PrivateRoute>
                <Layout>
                  <Kanban />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/workshop-kanban"
            element={
              <PrivateRoute>
                <Layout>
                  <WorkshopKanban />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/firms"
            element={
              <PrivateRoute>
                <Layout>
                  <Firms />
                </Layout>
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
              <PrivateRoute>
                <Layout>
                  <Workshops />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operators"
            element={
              <PrivateRoute>
                <Layout>
                  <Operators />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/technics"
            element={
              <PrivateRoute>
                <Layout>
                  <Technics />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <Reports />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Layout>
                  <Settings />
                </Layout>
              </PrivateRoute>
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
