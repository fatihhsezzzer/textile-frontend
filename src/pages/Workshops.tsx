import React, { useState, useEffect } from "react";
import { Workshop } from "../types";
import { workshopService } from "../services/dataService";
import { useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import "./Workshops.css";

const Workshops: React.FC = () => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    contactPerson: "",
    phone: "",
  });

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setLoading(true);
      const data = await workshopService.getAll();
      setWorkshops(data);
    } catch (error) {
      console.error("❌ Failed to load workshops:", error);
      alert("Atölyeler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingWorkshop(null);
    setFormData({
      name: "",
      description: "",
      location: "",
      contactPerson: "",
      phone: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setFormData({
      name: workshop.name,
      description: workshop.description || "",
      location: workshop.location || "",
      contactPerson: workshop.contactPerson || "",
      phone: workshop.phone || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWorkshop(null);
    setFormData({
      name: "",
      description: "",
      location: "",
      contactPerson: "",
      phone: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Atölye adı zorunludur!");
      return;
    }

    try {
      setLoading(true);

      const workshopData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      };

      if (editingWorkshop) {
        // Update
        await workshopService.update(editingWorkshop.workshopId, {
          ...workshopData,
          workshopId: editingWorkshop.workshopId,
        });
        alert("Atölye başarıyla güncellendi!");
      } else {
        // Create
        await workshopService.create(workshopData);
        alert("Atölye başarıyla oluşturuldu!");
      }

      closeModal();
      loadWorkshops();
    } catch (error: any) {
      console.error("❌ Failed to save workshop:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Atölye kaydedilemedi!";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workshop: Workshop) => {
    if (
      !window.confirm(
        `"${workshop.name}" atölyesini silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await workshopService.delete(workshop.workshopId);
      alert("Atölye başarıyla silindi!");
      loadWorkshops();
    } catch (error: any) {
      console.error("❌ Failed to delete workshop:", error);
      alert("Atölye silinemedi!");
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkshops = workshops.filter(
    (workshop) =>
      workshop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && workshops.length === 0) {
    return <PageLoader message="Atölyeler yükleniyor..." />;
  }

  return (
    <div className="workshops-container">
      <div className="workshops-header">
        <div className="workshops-header-content">
          <h1>
            <div className="workshops-header-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-4zm0 16.7c-4.8-1-8-5.1-8-9.4V8.5l8-3.2 8 3.2v1.8c0 4.3-3.2 8.4-8 9.4z" />
              </svg>
            </div>
            Atölye Yönetimi
          </h1>
          <p className="workshops-subtitle">
            Toplam {workshops.length} atölye kayıtlı
          </p>
        </div>

        <button className="workshops-add-button" onClick={openAddModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          Yeni Atölye Ekle
        </button>
      </div>

      <div className="workshops-search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a0aec0">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Atölye adı, lokasyon veya ilgili kişi ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="workshops-grid">
        {filteredWorkshops.map((workshop) => (
          <div key={workshop.workshopId} className="workshop-card">
            <div className="workshop-card-header">
              <div>
                <h3>{workshop.name}</h3>
                {workshop.location && (
                  <div className="workshop-location">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    {workshop.location}
                  </div>
                )}
              </div>
            </div>

            {workshop.description && (
              <div className="workshop-detail">
                <div className="workshop-detail-icon">📝</div>
                <div className="workshop-detail-content">
                  <span className="workshop-detail-label">Açıklama</span>
                  <span className="workshop-detail-value">
                    {workshop.description}
                  </span>
                </div>
              </div>
            )}

            {workshop.contactPerson && (
              <div className="workshop-detail">
                <div className="workshop-detail-icon">👤</div>
                <div className="workshop-detail-content">
                  <span className="workshop-detail-label">İlgili Kişi</span>
                  <span className="workshop-detail-value">
                    {workshop.contactPerson}
                  </span>
                </div>
              </div>
            )}

            {workshop.phone && (
              <div className="workshop-detail">
                <div className="workshop-detail-icon">📞</div>
                <div className="workshop-detail-content">
                  <span className="workshop-detail-label">Telefon</span>
                  <span className="workshop-detail-value">
                    {workshop.phone}
                  </span>
                </div>
              </div>
            )}

            <div className="workshop-card-actions">
              <button
                className="workshop-action-button workshop-action-cost"
                onClick={() =>
                  navigate(`/workshops/${workshop.workshopId}/costs`)
                }
                title="Maliyet Yönetimi"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
                Maliyet
              </button>
              <button
                className="workshop-action-button workshop-action-edit"
                onClick={() => openEditModal(workshop)}
                title="Düzenle"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Düzenle
              </button>
              <button
                className="workshop-action-button workshop-action-delete"
                onClick={() => handleDelete(workshop)}
                title="Sil"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkshops.length === 0 && (
        <div className="workshops-empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-4zm0 16.7c-4.8-1-8-5.1-8-9.4V8.5l8-3.2 8 3.2v1.8c0 4.3-3.2 8.4-8 9.4z" />
          </svg>
          <h3>Atölye bulunamadı</h3>
          <p>
            {searchTerm
              ? "Arama kriteri ile eşleşen atölye bulunamadı."
              : "Henüz hiç atölye eklenmemiş. Yeni atölye ekleyerek başlayın."}
          </p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="workshops-modal-overlay" onClick={closeModal}>
          <div
            className="workshops-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="workshops-modal-header">
              <h2>{editingWorkshop ? "Atölye Düzenle" : "Yeni Atölye Ekle"}</h2>
              <button className="workshops-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="workshops-modal-form">
              <div className="workshops-form-group">
                <label>Atölye Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Örn: Ana Üretim Atölyesi"
                  required
                />
              </div>

              <div className="workshops-form-group">
                <label>Lokasyon</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Örn: İstanbul, Türkiye"
                />
              </div>

              <div className="workshops-form-row">
                <div className="workshops-form-group">
                  <label>İlgili Kişi</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: e.target.value,
                      })
                    }
                    placeholder="Örn: Ahmet Yılmaz"
                  />
                </div>

                <div className="workshops-form-group">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Örn: 0555 123 45 67"
                  />
                </div>
              </div>

              <div className="workshops-form-group">
                <label>Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Atölye hakkında detaylı bilgi"
                  rows={3}
                />
              </div>

              <div className="workshops-modal-actions">
                <button
                  type="button"
                  className="workshops-cancel-button"
                  onClick={closeModal}
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="workshops-save-button"
                  disabled={loading}
                >
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workshops;
