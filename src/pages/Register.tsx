import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import "./Register.css";

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "Üretim", // Varsayılan rol
  });

  const [errors, setErrors] = useState<Partial<RegisterForm>>({});

  // Yetki kontrolü - Manager değilse anında yönlendir
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "Manager")) {
      navigate("/orders");
    }
  }, [user, isLoading, navigate]);

  // Yetki kontrolü - Manager değilse hiçbir şey render etme
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Yükleniyor...
      </div>
    );
  }

  if (!user || user.role !== "Manager") {
    return null; // Hiçbir şey gösterme
  }

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterForm> = {};

    if (!formData.email.trim()) {
      newErrors.email = "E-posta gereklidir";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Geçerli bir e-posta adresi giriniz";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Şifre gereklidir";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Ad gereklidir";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Soyad gereklidir";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof RegisterForm]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        isActive: true,
        createdBy: user?.userId || "unknown",
      };

      await authService.register(registerData);

      alert(
        `Kullanıcı "${formData.firstName} ${formData.lastName}" başarıyla oluşturuldu!`
      );

      // Formu temizle
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        role: "Üretim",
      });
    } catch (error: any) {
      console.error("❌ Kullanıcı oluşturma hatası:", error);
      alert(
        "Kullanıcı oluşturulamadı: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const userRoles = [
    { value: "Üretim", label: "Üretim" },
    { value: "Sekreterya", label: "Sekreterya" },
    { value: "Manager", label: "Manager" },
    { value: "Modelist", label: "Desinatör" },
  ];

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>👤 Yeni Kullanıcı Ekle</h1>
          <p>Sisteme yeni kullanıcı eklemek için aşağıdaki formu doldurunuz</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Ad *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? "error" : ""}
                placeholder="Adınızı giriniz"
                required
              />
              {errors.firstName && (
                <span className="error-message">{errors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Soyad *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? "error" : ""}
                placeholder="Soyadınızı giriniz"
                required
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">E-posta *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? "error" : ""}
              placeholder="E-posta adresini giriniz"
              required
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Şifre *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? "error" : ""}
                placeholder="Şifre (en az 6 karakter)"
                required
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Tekrar *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? "error" : ""}
                placeholder="Şifreyi tekrar giriniz"
                required
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Kullanıcı Rolü *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="role-select"
              required
            >
              {userRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="cancel-button"
              disabled={loading}
            >
              İptal
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
