import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { User } from "../types";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Location state'inden veya sessionStorage'dan redirect URL'ini al
  const fromLocation = (location.state as any)?.from;
  const fromPath = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ""}`
    : sessionStorage.getItem("redirectAfterLogin") || "/orders";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login({ email, password });

      console.log("Login response:", response);

      // Backend'den gelen response formatına göre user objesi oluştur
      let user: User;
      if (response.user) {
        // Eğer user objesi varsa direkt kullan
        user = response.user;
      } else {
        // Backend'den düz alanlar geliyorsa user objesi oluştur
        user = {
          userId: response.userId || response.email,
          email: response.email || email,
          firstName: response.firstName || "User",
          lastName: response.lastName || "",
          role: response.role || "User",
          workshopId: response.workshopId,
          workshop: response.workshop,
          isActive: true,
        };
      }

      // Her durumda login fonksiyonunu çağır (AuthContext'i güncelle)
      login(response.token, user);

      // İlk giriş kontrolü
      if (response.isFirstLogin === true) {
        setLoading(false);
        // Şifre değiştirme ekranına yönlendir
        navigate("/change-password", {
          state: { isFirstLogin: true },
          replace: true,
        });
        return;
      }

      // sessionStorage'ı temizle
      sessionStorage.removeItem("redirectAfterLogin");

      // Redirect: kullanıcının gitmek istediği sayfaya yönlendir
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      let errorMessage = "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";

      if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("ERR_EMPTY_RESPONSE")
      ) {
        errorMessage =
          "Sunucuya bağlanılamıyor. Lütfen sunucunun çalıştığından emin olun.";
      } else if (err.response?.data) {
        errorMessage = err.response.data;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/Images/logo-siyah.png" alt="Logo" className="login-logo" />
        <h2>Giriş Yap</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
