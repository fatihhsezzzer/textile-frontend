import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeRateService } from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import { formatNumber } from "../utils/formatters";
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
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Sol Bölüm - Menü Butonu ve Logo */}
        <div className="header-left">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="header-menu-btn"
              aria-label="Menüyü Aç"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          <div className="header-brand">
            <h1 className="header-title">FATOŞ EMPRİME</h1>
            <p className="header-subtitle">Sipariş Takip Sistemi</p>
          </div>
        </div>

        {/* Sağ Bölüm - Döviz, Kullanıcı, Çıkış */}
        <div className="header-right">
          {/* Döviz Kurları */}
          {!loading && (exchangeRates.usd || exchangeRates.eur) && (
            <div className="header-rates">
              {exchangeRates.usd && (
                <div className="rate-card rate-usd">
                  <div className="rate-icon">
                    <span>$</span>
                  </div>
                  <div className="rate-info">
                    <span className="rate-label">USD</span>
                    <span className="rate-value">
                      ₺{formatNumber(exchangeRates.usd)}
                    </span>
                  </div>
                </div>
              )}

              {exchangeRates.eur && (
                <div className="rate-card rate-eur">
                  <div className="rate-icon">
                    <span>€</span>
                  </div>
                  <div className="rate-info">
                    <span className="rate-label">EUR</span>
                    <span className="rate-value">
                      ₺{formatNumber(exchangeRates.eur)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kullanıcı Bilgisi */}
          {user && (
            <div className="header-user">
              <div className="user-avatar">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="user-info">
                <span className="user-greeting">Hoş geldin</span>
                <span className="user-name">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>
          )}

          {/* Çıkış Butonu */}
          <button
            onClick={handleLogout}
            className="header-logout-btn"
            aria-label="Çıkış Yap"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="logout-text">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
