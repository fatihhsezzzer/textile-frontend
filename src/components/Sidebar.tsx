import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isManager = user && user.role === "Manager";
  const isModelist = user && user.role === "Modelist";

  // Gruplandırılmış menü yapısı
  const menuGroups = [
    {
      groupId: "siparis",
      groupTitle: "Sipariş Yönetimi",
      items: [
        {
          id: "orders",
          title: "Siparişler",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          ),
          path: "/orders",
          description: "Sipariş yönetimi ve takibi",
        },
        {
          id: "modelist-job-list",
          title: "Desinatör İş Listesi",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#27ae60"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M8 6h8"></path>
              <path d="M8 10h8"></path>
              <path d="M8 14h6"></path>
            </svg>
          ),
          path: "/modelist-job-list",
          description: "Desinatörlerin yaptığı işlerin listesi",
        },
        {
          id: "modelist-job-tracker",
          title: "Desinatör İş Takibi",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M8 6h8"></path>
              <path d="M8 10h8"></path>
              <path d="M8 14h6"></path>
            </svg>
          ),
          path: "/modelist-job-tracker",
          description: "Desinatörlerin iş takibi ve fotoğraf ekleme",
        },
        {
          id: "modelist-orders",
          title: "Modelist Siparişlerim",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e74c3c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                opacity="0.5"
              ></path>
            </svg>
          ),
          path: "/modelist-orders",
          description: "Size atanan siparişlerin listesi ve durum takibi",
        },
      ],
    },
    {
      groupId: "atolye",
      groupTitle: "Atölye Yönetimi",
      items: [
        {
          id: "workshops",
          title: "Atölyeler",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          ),
          path: "/workshops",
          description: "Atölye yönetimi ve ayarları",
        },
        {
          id: "workshop-kanban",
          title: "Atölye Kanban",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          ),
          path: "/workshop-kanban",
          description: "Atölye bazlı sipariş panosu",
        },
      ],
    },
    {
      groupId: "maliyet",
      groupTitle: "Maliyet & Raporlar",
      items: [
        {
          id: "cost",
          title: "Maliyet Yönetimi",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
              <path d="M12 2v20"></path>
              <path d="M2 12h20"></path>
            </svg>
          ),
          path: "/cost",
          description: "Maliyet kategorileri ve hesaplamaları",
        },
        {
          id: "model-costs",
          title: "Model Maliyetleri",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M12 18h0"></path>
              <path d="M12 14h0"></path>
              <path d="M12 10h0"></path>
            </svg>
          ),
          path: "/models",
          description: "Model bazlı maliyet hesaplamaları",
        },
        {
          id: "reports",
          title: "Mali Raporlar",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          ),
          path: "/reports",
          description: "Model maliyetleri raporu",
        },
      ],
    },
  ];

  // Item görünürlük kontrolü
  const isItemVisible = (itemId: string): boolean => {
    // workshops, cost, model-costs, reports ve workshop-kanban sadece Manager'a göster
    if (
      itemId === "workshops" ||
      itemId === "cost" ||
      itemId === "model-costs" ||
      itemId === "reports" ||
      itemId === "workshop-kanban"
    ) {
      return isManager || false;
    }
    // modelist-job-list sadece Manager'a göster
    if (itemId === "modelist-job-list") {
      return isManager || false;
    }
    // modelist-job-tracker sadece Modelist'e göster
    if (itemId === "modelist-job-tracker") {
      return isModelist || false;
    }
    // modelist-orders sadece Modelist'e göster
    if (itemId === "modelist-orders") {
      return isModelist || false;
    }
    // orders ekranını Modelist kullanıcılarına gösterme
    if (itemId === "orders") {
      return !isModelist;
    }
    return true;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose(); // Mobile'da sidebar'ı kapat
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div className="logo-text-container">
              <span className="logo-text">Tekstil Yönetim</span>
              <span className="logo-subtitle">Sipariş Takip Sistemi</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group) => {
            // Gruptaki görünür itemları filtrele
            const visibleItems = group.items.filter((item) => {
              // Modelist rolü için sadece modelist ile ilgili sayfaları göster
              if (isModelist) {
                return (
                  item.id === "modelist-job-tracker" ||
                  item.id === "modelist-orders"
                );
              }
              return isItemVisible(item.id);
            });

            // Eğer grupta görünür item yoksa grubu gösterme
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.groupId} className="nav-group">
                <div className="nav-section-title">{group.groupTitle}</div>
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${
                      location.pathname === item.path ? "nav-item-active" : ""
                    }`}
                    onClick={() => handleNavigate(item.path)}
                    title={item.description}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-title">{item.title}</span>
                    <span className="nav-arrow">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {/* Yönetim bölümü - Modelist için gizle */}
          {!isModelist && (
            <>
              <div className="nav-section-title">Yönetim</div>
              {/* Register button - sadece Manager için */}
              {isManager && (
                <button
                  className={`nav-item register-button ${
                    location.pathname === "/register" ? "nav-item-active" : ""
                  }`}
                  onClick={() => handleNavigate("/register")}
                  title="Yeni kullanıcı ekle"
                >
                  <span className="nav-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </span>
                  <span className="nav-title">Kullanıcı Ekle</span>
                </button>
              )}
            </>
          )}

          <button className="logout-button" onClick={handleLogout}>
            <span className="nav-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            <span className="nav-title">Çıkış Yap</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
