import React, { useState, useEffect } from "react";
import { Firm } from "../types";
import { firmService } from "../services/dataService";
import "./ModelModal.css"; // FirmModal için aynı CSS'i kullanıyoruz

interface FirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFirmSelect: (firm: Firm) => void;
  selectedFirmId?: string;
}

const FirmModal: React.FC<FirmModalProps> = ({
  isOpen,
  onClose,
  onFirmSelect,
  selectedFirmId,
}) => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newFirm, setNewFirm] = useState({
    firmName: "",
    description: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadFirms();
    }
  }, [isOpen]);

  const loadFirms = async () => {
    try {
      setLoading(true);
      const data = await firmService.getFirms();
      setFirms(data);
    } catch (error) {
      console.error("Firmalar yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  // Otomatik firma kodu oluştur
  const generateFirmCode = (firmName: string): string => {
    // Firma adının ilk 3 harfini al (Türkçe karakterleri düzelt)
    const cleanName = firmName
      .toUpperCase()
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ş/g, "S")
      .replace(/İ/g, "I")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/[^A-Z0-9]/g, ""); // Sadece harf ve rakam

    const prefix = cleanName.substring(0, 3).padEnd(3, "X");

    // Mevcut firma kodlarını kontrol et
    const existingCodes = firms
      .filter((f) => f.firmCode.startsWith(prefix))
      .map((f) => f.firmCode);

    // Benzersiz numara bul
    let counter = 1;
    let firmCode = `${prefix}${counter.toString().padStart(3, "0")}`;

    while (existingCodes.includes(firmCode)) {
      counter++;
      firmCode = `${prefix}${counter.toString().padStart(3, "0")}`;
    }

    return firmCode;
  };

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Otomatik firma kodu oluştur
      const firmCode = generateFirmCode(newFirm.firmName);

      const createdFirm = await firmService.createFirm({
        ...newFirm,
        firmCode,
      });

      setFirms([...firms, createdFirm]);
      setShowCreateForm(false);
      setNewFirm({
        firmName: "",
        description: "",
        address: "",
        contactPerson: "",
        phone: "",
        email: "",
      });
      onFirmSelect(createdFirm);
    } catch (error) {
      console.error("Firma oluşturulurken hata:", error);
      alert("Firma oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const filteredFirms = firms.filter(
    (firm) =>
      firm.firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.firmCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content firm-modal">
        <div className="modal-header">
          <h2>Firma Seç</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              placeholder="Firma ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-secondary"
            >
              {showCreateForm ? "İptal" : "Yeni Firma"}
            </button>
          </div>

          {showCreateForm && (
            <div className="create-form">
              <h3>Yeni Firma Oluştur</h3>
              <form onSubmit={handleCreateFirm}>
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Firma Adı*"
                      value={newFirm.firmName}
                      onChange={(e) =>
                        setNewFirm({ ...newFirm, firmName: e.target.value })
                      }
                      required
                    />
                    <small style={{ color: "#6c757d", fontSize: "12px" }}>
                      Firma kodu otomatik oluşturulacak
                    </small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="İletişim Kişisi"
                      value={newFirm.contactPerson}
                      onChange={(e) =>
                        setNewFirm({
                          ...newFirm,
                          contactPerson: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Telefon"
                      value={newFirm.phone}
                      onChange={(e) =>
                        setNewFirm({ ...newFirm, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="email"
                      placeholder="E-posta"
                      value={newFirm.email}
                      onChange={(e) =>
                        setNewFirm({ ...newFirm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      placeholder="Açıklama"
                      value={newFirm.description}
                      onChange={(e) =>
                        setNewFirm({ ...newFirm, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <textarea
                    placeholder="Adres"
                    value={newFirm.address}
                    onChange={(e) =>
                      setNewFirm({ ...newFirm, address: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newFirm.firmName || loading}
                  className="btn-primary"
                >
                  {loading ? "Oluşturuluyor..." : "Firma Oluştur"}
                </button>
              </form>
            </div>
          )}

          <div className="firms-list">
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : (
              filteredFirms.map((firm) => (
                <div
                  key={firm.firmId}
                  onClick={() => onFirmSelect(firm)}
                  className={`firm-item ${
                    selectedFirmId === firm.firmId ? "selected" : ""
                  }`}
                >
                  <div className="firm-info">
                    <div className="firm-main">
                      <div className="firm-name">{firm.firmName}</div>
                      <div className="firm-code">Kod: {firm.firmCode}</div>
                      {firm.contactPerson && (
                        <div className="contact-person">
                          İletişim: {firm.contactPerson}
                        </div>
                      )}
                    </div>
                    <div className="firm-contact">
                      {firm.phone && <div className="phone">{firm.phone}</div>}
                      {firm.email && <div className="email">{firm.email}</div>}
                    </div>
                  </div>
                  {selectedFirmId === firm.firmId && (
                    <div className="selected-indicator">✓ Seçildi</div>
                  )}
                </div>
              ))
            )}
          </div>

          {!loading && filteredFirms.length === 0 && searchTerm && (
            <div className="no-data">"{searchTerm}" için firma bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirmModal;
