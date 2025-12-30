import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import "./ChangePassword.css";

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstLogin = (location.state as any)?.isFirstLogin || false;
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = (): boolean => {
    if (!formData.oldPassword) {
      setError("Eski şifrenizi giriniz");
      return false;
    }
    if (!formData.newPassword) {
      setError("Yeni şifrenizi giriniz");
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Yeni şifreler eşleşmiyor");
      return false;
    }
    if (formData.oldPassword === formData.newPassword) {
      setError("Yeni şifre eski şifre ile aynı olamaz");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      await authService.changePassword(
        formData.oldPassword,
        formData.newPassword
      );

      alert("Şifreniz başarıyla değiştirildi!");

      // İlk giriş ise logout yapıp login'e yönlendir
      if (isFirstLogin) {
        authService.logout();
        navigate("/login");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Şifre değiştirme hatası:", error);
      setError(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          "Şifre değiştirilemedi"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          {isFirstLogin ? (
            <>
              <h1>🔒 İlk Giriş - Şifre Değiştirme</h1>
              <p className="first-login-warning">
                Güvenliğiniz için lütfen şifrenizi değiştirin
              </p>
            </>
          ) : (
            <>
              <h1>🔒 Şifre Değiştir</h1>
              <p>Yeni şifrenizi belirleyin</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="oldPassword">
              Eski Şifre <span className="required">*</span>
            </label>
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleInputChange}
              placeholder="Mevcut şifrenizi giriniz"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">
              Yeni Şifre <span className="required">*</span>
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="En az 6 karakter"
              required
              minLength={6}
            />
            <small className="form-hint">Minimum 6 karakter</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Yeni Şifre (Tekrar) <span className="required">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Yeni şifrenizi tekrar giriniz"
              required
            />
          </div>

          <div className="form-actions">
            {!isFirstLogin && (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="cancel-button"
                disabled={loading}
              >
                İptal
              </button>
            )}
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
            </button>
          </div>

          {isFirstLogin && (
            <div className="first-login-notice">
              <p>⚠️ Şifrenizi değiştirmeden sistemi kullanamazsınız</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
