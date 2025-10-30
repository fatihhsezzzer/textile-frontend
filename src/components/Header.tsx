import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeRateService } from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

interface ExchangeRates {
  usd: number | null;
  eur: number | null;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    usd: null,
    eur: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const rates = await exchangeRateService.getLatest();

        const usdRate = rates.find((rate) => rate.currencyCode === "USD");
        const eurRate = rates.find((rate) => rate.currencyCode === "EUR");

        setExchangeRates({
          usd: usdRate ? usdRate.banknoteSelling : null,
          eur: eurRate ? eurRate.banknoteSelling : null,
        });
      } catch (error) {
        console.error("Kur bilgisi yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
    // Her 5 dakikada bir güncelle
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="header">
      <div className="header-content">
        {/* Sol taraf - Menü butonu + Logo / Başlık */}
        <div className="header-left">
          {/* Menu Button */}
          {onMenuClick && (
            <button onClick={onMenuClick} className="menu-button">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "50px",
                height: "50px",
                background: "#1a5490",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(26, 84, 144, 0.15)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#1a5490",
                  letterSpacing: "-0.3px",
                  lineHeight: "1.2",
                }}
              >
                FATOŞ EMPRİME
              </h1>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "500",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                }}
              >
                Sipariş Takip Sistemi
              </p>
            </div>
          </div>
        </div>

        {/* Sağ taraf - Döviz kurları, kullanıcı, çıkış */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Döviz Kurları */}
          {!loading && (
            <div style={{ display: "flex", gap: "10px" }}>
              {/* USD */}
              {exchangeRates.usd && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f8fafc",
                    color: "#1e293b",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    border: "1px solid #e2e8f0",
                    minWidth: "110px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#dcfce7",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                      }}
                    >
                      USD
                    </span>
                    <span
                      style={{
                        fontWeight: "700",
                        fontSize: "15px",
                        color: "#1e293b",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      ₺{exchangeRates.usd.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* EUR */}
              {exchangeRates.eur && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f8fafc",
                    color: "#1e293b",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    border: "1px solid #e2e8f0",
                    minWidth: "110px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#dbeafe",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                      }}
                    >
                      EUR
                    </span>
                    <span
                      style={{
                        fontWeight: "700",
                        fontSize: "15px",
                        color: "#1e293b",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      ₺{exchangeRates.eur.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kullanıcı Bilgisi */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#1e293b",
                padding: "8px 16px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  background: "#1a5490",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(26, 84, 144, 0.15)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  Hoş geldin
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1e293b",
                  }}
                >
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>
          )}

          {/* Çıkış Butonu */}
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(220, 38, 38, 0.2)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#b91c1c";
              e.currentTarget.style.boxShadow =
                "0 4px 10px rgba(220, 38, 38, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.boxShadow =
                "0 2px 6px rgba(220, 38, 38, 0.2)";
            }}
          >
            <svg
              width="18"
              height="18"
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
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
