import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useExchangeRates } from "../context/ExchangeRateContext";
import { formatNumber } from "../utils/formatters";
import "./Header.css";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { usdRate, eurRate, loading } = useExchangeRates();
  const navigate = useNavigate();

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
            <img
              src="/Images/logo-siyah.png"
              alt="Logo"
              className="header-logo"
            />
          </div>
        </div>

        {/* Sağ Bölüm - Döviz, Kullanıcı, Çıkış */}
        <div className="header-right">
          {/* Döviz Kurları */}
          {!loading && (usdRate || eurRate) && (
            <div className="header-rates">
              {usdRate && (
                <div className="rate-card rate-usd">
                  <div className="rate-icon">
                    <span>$</span>
                  </div>
                  <div className="rate-info">
                    <span className="rate-label">USD</span>
                    <span className="rate-value">₺{formatNumber(usdRate)}</span>
                  </div>
                </div>
              )}

              {eurRate && (
                <div className="rate-card rate-eur">
                  <div className="rate-icon">
                    <span>€</span>
                  </div>
                  <div className="rate-info">
                    <span className="rate-label">EUR</span>
                    <span className="rate-value">₺{formatNumber(eurRate)}</span>
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
        </div>
      </div>
    </header>
  );
};

export default Header;
