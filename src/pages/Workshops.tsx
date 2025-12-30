import React, { useState, useEffect } from "react";
import { Workshop } from "../types";
import { workshopService } from "../services/dataService";
import { turkishIncludes } from "../utils/formatters";
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

  // Connection modal states
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [selectedWorkshopForConnections, setSelectedWorkshopForConnections] =
    useState<Workshop | null>(null);
  const [workshopConnections, setWorkshopConnections] = useState<any[]>([]);
  const [availableWorkshops, setAvailableWorkshops] = useState<Workshop[]>([]);
  const [selectedTargetWorkshopId, setSelectedTargetWorkshopId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    displayOrder: 0,
  });

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setLoading(true);
      const data = await workshopService.getAll();
      // Backend zaten sıralı döndürüyor ama emin olmak için:
      const sortedData = [...data].sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, "tr");
      });
      setWorkshops(sortedData);
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
      location: "",
      displayOrder: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setFormData({
      name: workshop.name,
      location: workshop.location || "",
      displayOrder: workshop.displayOrder || 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWorkshop(null);
    setFormData({
      name: "",
      location: "",
      displayOrder: 0,
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
        location: formData.location.trim() || undefined,
        displayOrder: formData.displayOrder || 0,
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

  const openConnectionModal = async (workshop: Workshop) => {
    setSelectedWorkshopForConnections(workshop);
    setIsConnectionModalOpen(true);
    setSelectedTargetWorkshopId("");
    await loadWorkshopConnections(workshop.workshopId);
  };

  const closeConnectionModal = () => {
    setIsConnectionModalOpen(false);
    setSelectedWorkshopForConnections(null);
    setWorkshopConnections([]);
    setAvailableWorkshops([]);
    setSelectedTargetWorkshopId("");
  };

  const loadWorkshopConnections = async (workshopId: string) => {
    try {
      setLoading(true);
      const connections = await workshopService.getConnections(workshopId);
      console.log("📡 Is array:", Array.isArray(connections));
      setWorkshopConnections(connections || []);

      // Mevcut bağlantıları filtrele ve kullanılabilir atölyeleri belirle
      const connectedWorkshopIds = (connections || [])
        .filter((c: any) => c?.targetWorkshop) // Null check
        .map((c: any) => c.targetWorkshop.workshopId);
      const available = workshops.filter(
        (w) =>
          w.workshopId !== workshopId &&
          !connectedWorkshopIds.includes(w.workshopId)
      );
      setAvailableWorkshops(available);
    } catch (error) {
      console.error("❌ Failed to load connections:", error);
      console.error("❌ Error details:", error);
      setWorkshopConnections([]);
      setAvailableWorkshops(
        workshops.filter((w) => w.workshopId !== workshopId)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async () => {
    if (!selectedTargetWorkshopId || !selectedWorkshopForConnections) {
      alert("Lütfen bir atölye seçiniz!");
      return;
    }

    try {
      setLoading(true);
      await workshopService.addConnection(
        selectedWorkshopForConnections.workshopId,
        {
          targetWorkshopId: selectedTargetWorkshopId,
          notes: "",
        }
      );
      alert("Bağlantı başarıyla eklendi!");
      setSelectedTargetWorkshopId("");
      await loadWorkshopConnections(selectedWorkshopForConnections.workshopId);
    } catch (error: any) {
      console.error("❌ Failed to add connection:", error);
      const errorMessage =
        error.response?.data || error.message || "Bağlantı eklenemedi!";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!selectedWorkshopForConnections) return;

    if (
      !window.confirm("Bu bağlantıyı kaldırmak istediğinizden emin misiniz?")
    ) {
      return;
    }

    try {
      setLoading(true);
      await workshopService.removeConnection(
        selectedWorkshopForConnections.workshopId,
        connectionId
      );
      alert("Bağlantı başarıyla kaldırıldı!");
      await loadWorkshopConnections(selectedWorkshopForConnections.workshopId);
    } catch (error) {
      console.error("❌ Failed to remove connection:", error);
      alert("Bağlantı kaldırılamadı!");
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkshops = workshops.filter(
    (workshop) =>
      turkishIncludes(workshop.name, searchTerm) ||
      turkishIncludes(workshop.location || "", searchTerm) ||
      turkishIncludes(workshop.contactPerson || "", searchTerm)
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
                <h3>
                  {workshop.displayOrder !== undefined &&
                    workshop.displayOrder !== 0 && (
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#667eea",
                          fontWeight: "600",
                          marginRight: "8px",
                          background: "#e9ecff",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        #{workshop.displayOrder}
                      </span>
                    )}
                  {workshop.name}
                </h3>
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
                className="workshop-action-button workshop-action-connection"
                onClick={() => openConnectionModal(workshop)}
                title="Bağlantılar"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                </svg>
                Bağlantılar
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

              <div className="workshops-form-group">
                <label>Sıralama (DisplayOrder)</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                />
                <small
                  style={{
                    color: "#666",
                    fontSize: "12px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Küçük değerler önce görünür. Varsayılan: 0
                </small>
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

      {/* Connection Modal */}
      {isConnectionModalOpen && selectedWorkshopForConnections && (
        <div className="workshops-modal-overlay" onClick={closeConnectionModal}>
          <div
            className="workshops-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="workshops-modal-header">
              <h2>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                >
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                </svg>
                {selectedWorkshopForConnections.name} - Bağlantılar
              </h2>
              <button
                className="workshops-modal-close"
                onClick={closeConnectionModal}
              >
                ×
              </button>
            </div>

            <div className="workshops-modal-form" style={{ padding: "20px" }}>
              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "8px",
                    background: "#f0f0f0",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                >
                  <div>
                    Connections state length: {workshopConnections?.length || 0}
                  </div>
                  <div>
                    Available workshops: {availableWorkshops?.length || 0}
                  </div>
                </div>
              )}

              {/* Yeni Bağlantı Ekle */}
              <div
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  background: "#f7fafc",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    marginBottom: "12px",
                    color: "#2d3748",
                  }}
                >
                  Yeni Bağlantı Ekle
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "14px",
                        color: "#4a5568",
                      }}
                    >
                      Hedef Atölye
                    </label>
                    <select
                      value={selectedTargetWorkshopId}
                      onChange={(e) =>
                        setSelectedTargetWorkshopId(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        fontSize: "14px",
                      }}
                      disabled={availableWorkshops.length === 0}
                    >
                      <option value="">
                        {availableWorkshops.length === 0
                          ? "Tüm atölyeler zaten bağlı"
                          : "Atölye Seçiniz"}
                      </option>
                      {availableWorkshops.map((w) => (
                        <option key={w.workshopId} value={w.workshopId}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {availableWorkshops.length === 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#718096",
                          marginTop: "4px",
                        }}
                      >
                        Tüm atölyeler bu atölyeye zaten bağlı
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddConnection}
                    disabled={!selectedTargetWorkshopId || loading}
                    style={{
                      padding: "10px 20px",
                      background: "#48bb78",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: selectedTargetWorkshopId
                        ? "pointer"
                        : "not-allowed",
                      opacity: selectedTargetWorkshopId ? 1 : 0.6,
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Mevcut Bağlantılar */}
              <div>
                <h3
                  style={{
                    fontSize: "16px",
                    marginBottom: "12px",
                    color: "#2d3748",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Mevcut Bağlantılar
                  <span
                    style={{
                      background: "#667eea",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {
                      workshopConnections.filter((c: any) => c.TargetWorkshop)
                        .length
                    }
                  </span>
                </h3>

                {/* Debug panel - development only */}
                {process.env.NODE_ENV === "development" && (
                  <details
                    style={{
                      marginBottom: "16px",
                      padding: "12px",
                      background: "#fff3cd",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontWeight: "600",
                        marginBottom: "8px",
                      }}
                    >
                      🐛 Debug Info
                    </summary>
                    <div style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      <div>Total connections: {workshopConnections.length}</div>
                      <div>
                        After filter:{" "}
                        {
                          workshopConnections.filter(
                            (c: any) => c.targetWorkshop
                          ).length
                        }
                      </div>
                      <pre
                        style={{
                          background: "#fff",
                          padding: "8px",
                          overflow: "auto",
                          maxHeight: "200px",
                          marginTop: "8px",
                        }}
                      >
                        {JSON.stringify(workshopConnections, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}

                {workshopConnections.filter((c: any) => c.targetWorkshop)
                  .length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "#718096",
                    }}
                  >
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      style={{ margin: "0 auto 12px", opacity: 0.5 }}
                    >
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                    </svg>
                    <p>Henüz bağlantı eklenmemiş</p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {workshopConnections
                      .filter((conn: any) => conn.targetWorkshop) // Null check
                      .map((conn: any) => (
                        <div
                          key={conn.connectionId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: "500",
                                color: "#2d3748",
                                marginBottom: "4px",
                              }}
                            >
                              {conn.targetWorkshop?.name || "Bilinmeyen Atölye"}
                            </div>
                            {conn.targetWorkshop?.location && (
                              <div
                                style={{ fontSize: "13px", color: "#718096" }}
                              >
                                📍 {conn.targetWorkshop.location}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveConnection(conn.connectionId)
                            }
                            style={{
                              padding: "6px 12px",
                              background: "#fc8181",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                            title="Bağlantıyı Kaldır"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button
                  onClick={closeConnectionModal}
                  style={{
                    padding: "10px 24px",
                    background: "#667eea",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workshops;
