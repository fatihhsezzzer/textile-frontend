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
  const isAccountant = user && user.role === "Muhasebeci";
  const isProduction = user && user.role === "Üretim";
  const isSecretary = user && user.role === "Sekreterya";

  // Gruplandırılmış menü yapısı
  const menuGroups = [
    {
      groupId: "siparis",
      groupTitle: "Sipariş Yönetimi",
      items: [
        {
          id: "new-order",
          title: "Yeni Sipariş",
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          ),
          path: "/orders/new",
          description: "Yeni sipariş oluştur",
        },
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
          id: "modelist-my-orders",
          title: "Üzerinizdeki İşler",
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
            </svg>
          ),
          path: "/modelist-my-orders",
          description: "Size atanan siparişler",
        },
        {
          id: "accounting-orders",
          title: "Fatura Yönetimi",
          icon: (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f39c12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="12" y1="9" x2="12" y2="9"></line>
            </svg>
          ),
          path: "/accounting-orders",
          description: "Fatura bilgisi ekleme",
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
      groupId: "tanim",
      groupTitle: "Tanımlamalar",
      items: [
        {
          id: "firms",
          title: "Firma Yönetimi",
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
          path: "/firms",
          description: "Firma ekleme, düzenleme ve yönetimi",
        },
        {
          id: "settings",
          title: "Sistem Ayarları",
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
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m10-9h-6M7 12H1m15.4-6.4l-4.2 4.2m0 4.4l4.2 4.2M6.6 6.6l4.2 4.2m0 4.4l-4.2 4.2"></path>
            </svg>
          ),
          path: "/settings",
          description: "Kar marjı ve genel gider ayarları",
        },
        {
          id: "user-management",
          title: "Kullanıcı Yönetimi",
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
          path: "/user-management",
          description: "Kullanıcıları görüntüle ve düzenle",
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
          path: "/model-costs",
          description: "Firma bazlı model maliyet hesaplamaları",
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
    // new-order - Sadece Manager ve Sekreterya görebilir
    if (itemId === "new-order") {
      return isManager || isSecretary || false;
    }
    // firms - Manager ve Muhasebeci görebilir
    if (itemId === "firms") {
      return isManager || isAccountant || false;
    }
    // settings, workshops, cost, model-costs, reports, user-management sadece Manager'a göster
    if (
      itemId === "settings" ||
      itemId === "workshops" ||
      itemId === "cost" ||
      itemId === "model-costs" ||
      itemId === "reports" ||
      itemId === "user-management"
    ) {
      return isManager || false;
    }
    // modelist-my-orders sadece Modelist'e göster
    if (itemId === "modelist-my-orders") {
      return isModelist || false;
    }
    // accounting-orders Manager ve Muhasebeci görebilir
    if (itemId === "accounting-orders") {
      return isManager || isAccountant || false;
    }
    // orders ekranını Manager, Modelist ve Üretim rolü görebilir (Muhasebeci görmez)
    if (itemId === "orders") {
      return isManager || isModelist || isProduction || false;
    }
    // workshop-kanban sadece Manager'a göster
    if (itemId === "workshop-kanban") {
      return isManager || false;
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
