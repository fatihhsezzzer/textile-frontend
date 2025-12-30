import React, { useState, useEffect } from "react";
import { firmService } from "../services/dataService";
import { Firm } from "../types";
import PageLoader from "../components/PageLoader";
import { turkishIncludes } from "../utils/formatters";
import "./Firms.css";

interface FirmFormData {
  firmCode: string;
  firmName: string;
  description: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  taxOffice: string;
}

const Firms: React.FC = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [formData, setFormData] = useState<FirmFormData>({
    firmCode: "",
    firmName: "",
    description: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
    taxNumber: "",
    taxOffice: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<FirmFormData>>({});

  useEffect(() => {
    loadFirms();
  }, []);

  const loadFirms = async () => {
    try {
      setLoading(true);
      const data = await firmService.getFirms();
      setFirms(data);
    } catch (error) {
      console.error("❌ Firmalar yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (firm?: Firm) => {
    if (firm) {
      setEditingFirm(firm);
      setFormData({
        firmCode: firm.firmCode,
        firmName: firm.firmName,
        description: firm.description || "",
        address: firm.address || "",
        contactPerson: firm.contactPerson || "",
        phone: firm.phone || "",
        email: firm.email || "",
        taxNumber: firm.taxNumber || "",
        taxOffice: firm.taxOffice || "",
      });
    } else {
      setEditingFirm(null);
      setFormData({
        firmCode: "",
        firmName: "",
        description: "",
        address: "",
        contactPerson: "",
        phone: "",
        email: "",
        taxNumber: "",
        taxOffice: "",
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFirm(null);
    setFormData({
      firmCode: "",
      firmName: "",
      description: "",
      address: "",
      contactPerson: "",
      phone: "",
      email: "",
      taxNumber: "",
      taxOffice: "",
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<FirmFormData> = {};

    if (!formData.firmCode.trim()) {
      errors.firmCode = "Firma kodu zorunludur";
    }

    if (!formData.firmName.trim()) {
      errors.firmName = "Firma adı zorunludur";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingFirm) {
        // Güncelleme
        await firmService.updateFirm(editingFirm.firmId, {
          ...editingFirm,
          ...formData,
        });
        console.log("✅ Firma güncellendi");
      } else {
        // Yeni firma oluşturma
        await firmService.createFirm(formData as any);
        console.log("✅ Yeni firma oluşturuldu");
      }

      handleCloseModal();
      loadFirms();
    } catch (error: any) {
      console.error("❌ Firma kaydedilirken hata:", error);
      alert(error.response?.data || "Firma kaydedilirken bir hata oluştu.");
    }
  };

  const handleDelete = async (firm: Firm) => {
    if (
      !window.confirm(
        `"${firm.firmName}" firmasını silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      await firmService.deleteFirm(firm.firmId);
      console.log("✅ Firma silindi");
      loadFirms();
    } catch (error: any) {
      console.error("❌ Firma silinirken hata:", error);
      alert(error.response?.data || "Firma silinirken bir hata oluştu.");
    }
  };

  const filteredFirms = firms.filter(
    (firm) =>
      turkishIncludes(firm.firmName, searchTerm) ||
      turkishIncludes(firm.firmCode, searchTerm) ||
      turkishIncludes(firm.contactPerson || "", searchTerm) ||
      turkishIncludes(firm.phone || "", searchTerm) ||
      turkishIncludes(firm.email || "", searchTerm)
  );

  if (loading) {
    return <PageLoader message="Firmalar yükleniyor..." />;
  }

  return (
    <div className="firms-container">
      {/* Header */}
      <div className="firms-header">
        <div className="header-content">
          <h1>
            <span className="icon">🏢</span>
            Firma Yönetimi
          </h1>
          <p className="subtitle">
            Firmalarınızı ekleyin, düzenleyin ve yönetin
          </p>
        </div>
        <button className="add-button" onClick={() => handleOpenModal()}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Yeni Firma Ekle
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          placeholder="Firma adı, kodu veya yetkili ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Firms Table */}
      <div className="firms-table-container">
        {filteredFirms.length === 0 ? (
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <p>
              {searchTerm
                ? "Arama kriterlerine uygun firma bulunamadı"
                : "Henüz firma eklenmemiş"}
            </p>
          </div>
        ) : (
          <table className="firms-table">
            <thead>
              <tr>
                <th>Firma Kodu</th>
                <th>Firma Adı</th>
                <th>Yetkili Kişi</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>Vergi No</th>
                <th>Vergi Dairesi</th>
                <th className="actions-column">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredFirms.map((firm) => (
                <tr key={firm.firmId}>
                  <td data-label="Firma Kodu">
                    <span className="firm-code-badge">{firm.firmCode}</span>
                  </td>
                  <td data-label="Firma Adı">
                    <strong>{firm.firmName}</strong>
                    {firm.description && (
                      <div className="firm-description">{firm.description}</div>
                    )}
                  </td>
                  <td data-label="Yetkili Kişi">{firm.contactPerson || "-"}</td>
                  <td data-label="Telefon">{firm.phone || "-"}</td>
                  <td data-label="E-posta">{firm.email || "-"}</td>
                  <td data-label="Vergi No">{firm.taxNumber || "-"}</td>
                  <td data-label="Vergi Dairesi">{firm.taxOffice || "-"}</td>
                  <td className="actions-column" data-label="İşlemler">
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleOpenModal(firm)}
                        title="Düzenle"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Düzenle
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(firm)}
                        title="Sil"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFirm ? "Firma Düzenle" : "Yeni Firma Ekle"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Firma Kodu <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firmCode}
                      onChange={(e) =>
                        setFormData({ ...formData, firmCode: e.target.value })
                      }
                      placeholder="Örn: FRM001"
                      className={formErrors.firmCode ? "error" : ""}
                    />
                    {formErrors.firmCode && (
                      <span className="error-message">
                        {formErrors.firmCode}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Firma Adı <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firmName}
                      onChange={(e) =>
                        setFormData({ ...formData, firmName: e.target.value })
                      }
                      placeholder="Firma adını girin"
                      className={formErrors.firmName ? "error" : ""}
                    />
                    {formErrors.firmName && (
                      <span className="error-message">
                        {formErrors.firmName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Firma hakkında açıklama"
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Yetkili Kişi</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: e.target.value,
                        })
                      }
                      placeholder="Yetkili adı"
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefon</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="firma@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Adres</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Firma adresi"
                    rows={2}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Vergi Numarası</label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, taxNumber: e.target.value })
                      }
                      placeholder="Vergi numarası"
                    />
                  </div>

                  <div className="form-group">
                    <label>Vergi Dairesi</label>
                    <input
                      type="text"
                      value={formData.taxOffice}
                      onChange={(e) =>
                        setFormData({ ...formData, taxOffice: e.target.value })
                      }
                      placeholder="Vergi dairesi"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                >
                  İptal
                </button>
                <button type="submit" className="btn-primary">
                  {editingFirm ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Firms;
