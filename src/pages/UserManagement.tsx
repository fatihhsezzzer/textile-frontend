import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { userService, workshopService } from "../services/dataService";
import { authService } from "../services/authService";
import { User, Workshop } from "../types";
import "./UserManagement.css";

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    workshopId: "",
    isActive: true,
    password: "",
  });

  const roles = [
    { value: "Manager", label: "Müdür" },
    { value: "Sekreterya", label: "Sekreterya" },
    { value: "Modelist", label: "Modelist" },
    { value: "Üretim", label: "Üretim" },
    { value: "Muhasebe", label: "Muhasebe" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, workshopsData] = await Promise.all([
        userService.getAll(),
        workshopService.getAll(),
      ]);
      setUsers(usersData);
      setWorkshops(workshopsData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      workshopId: user.workshopId || "",
      isActive: user.isActive,
      password: "",
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setIsAddModalOpen(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      workshopId: "",
      isActive: true,
      password: "",
    });
  };

  const handleAddUser = () => {
    setIsAddModalOpen(true);
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      workshopId: "",
      isActive: true,
      password: "",
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || formData.password.trim().length < 6) {
      alert("Şifre en az 6 karakter olmalıdır");
      return;
    }

    try {
      const createData = {
        username: formData.email, // Email'i username olarak kullan
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        workshopId: formData.workshopId || undefined,
        isActive: true,
        createdBy: currentUser?.userId || "unknown",
      };

      await authService.register(createData);
      alert(
        `Kullanıcı "${formData.firstName} ${formData.lastName}" başarıyla oluşturuldu!`
      );
      handleCancel();
      loadData();
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(
        "Kullanıcı oluşturulamadı: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Sadece gerekli alanları gönder
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      };

      // WorkshopId varsa ekle
      if (formData.workshopId) {
        updateData.workshopId = formData.workshopId;
      }

      // Şifre girilmişse ekle (en az 6 karakter olmalı)
      if (formData.password && formData.password.trim().length >= 6) {
        updateData.password = formData.password.trim();
      }

      console.log("Update data being sent:", updateData);
      await userService.update(editingUser.userId, updateData);
      alert("Kullanıcı başarıyla güncellendi");
      handleCancel();
      loadData();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Kullanıcı güncellenirken hata oluştu");
    }
  };

  const getRoleLabel = (role: string) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getWorkshopName = (workshopId: string | null | undefined) => {
    if (!workshopId) return "-";
    const workshop = workshops.find((w) => w.workshopId === workshopId);
    return workshop ? workshop.name : "-";
  };

  const isManager = currentUser?.role === "Manager";

  if (loading) {
    return <div className="user-management-loading">Yükleniyor...</div>;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>Kullanıcı Yönetimi</h1>
        {!editingUser && !isAddModalOpen && (
          <button onClick={handleAddUser} className="btn-add-user">
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
            Yeni Kullanıcı Ekle
          </button>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yeni Kullanıcı Ekle</h2>
              <button className="modal-close" onClick={handleCancel}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ad *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Soyad *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="">Seçiniz</option>
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Atölye{" "}
                    {(formData.role === "Üretim" ||
                      formData.role === "Modelist") &&
                      "*"}
                  </label>
                  <select
                    value={formData.workshopId}
                    onChange={(e) =>
                      setFormData({ ...formData, workshopId: e.target.value })
                    }
                    required={
                      formData.role === "Üretim" || formData.role === "Modelist"
                    }
                  >
                    <option value="">Atölye Yok</option>
                    {workshops.map((workshop) => (
                      <option
                        key={workshop.workshopId}
                        value={workshop.workshopId}
                      >
                        {workshop.name}
                      </option>
                    ))}
                  </select>
                  {(formData.role === "Üretim" ||
                    formData.role === "Modelist") && (
                    <small>Bu rol için atölye seçimi zorunludur</small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Şifre *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="En az 6 karakter"
                />
                <small>Şifre en az 6 karakter olmalıdır</small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-cancel"
                >
                  İptal
                </button>
                <button type="submit" className="btn-save">
                  Kullanıcı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="user-management-content">
        {editingUser ? (
          <div className="user-edit-form">
            <h2>Kullanıcı Düzenle</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Ad *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Soyad *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    disabled={!isManager}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {!isManager && <small>Sadece müdür rol değiştirebilir</small>}
                </div>

                <div className="form-group">
                  <label>Atölye</label>
                  <select
                    value={formData.workshopId}
                    onChange={(e) =>
                      setFormData({ ...formData, workshopId: e.target.value })
                    }
                  >
                    <option value="">Atölye Yok</option>
                    {workshops.map((workshop) => (
                      <option
                        key={workshop.workshopId}
                        value={workshop.workshopId}
                      >
                        {workshop.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isManager && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                    />
                    Aktif
                  </label>
                  {!formData.isActive && (
                    <small style={{ color: "#dc3545" }}>
                      Kullanıcı pasif yapıldığında sisteme giriş yapamaz
                    </small>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Yeni Şifre (opsiyonel)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Değiştirmek istemiyorsanız boş bırakın"
                />
                <small>
                  Şifre değiştirmek istemiyorsanız bu alanı boş bırakın
                </small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-cancel"
                >
                  İptal
                </button>
                <button type="submit" className="btn-save">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="users-list">
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Atölye</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className={!user.isActive ? "inactive-user" : ""}
                  >
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{getRoleLabel(user.role)}</td>
                    <td>{getWorkshopName(user.workshopId)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          user.isActive ? "active" : "inactive"
                        }`}
                      >
                        {user.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn-edit"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
