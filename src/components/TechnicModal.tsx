import React, { useState, useEffect, useMemo } from "react";
import { Technic } from "../types";
import { technicService } from "../services/dataService";
import "./TechnicModal.css";

interface TechnicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTechnic: (technic: Technic) => void;
  selectedTechnics?: Technic[];
  onClearAll?: () => void;
}

const TechnicModal: React.FC<TechnicModalProps> = ({
  isOpen,
  onClose,
  onSelectTechnic,
  selectedTechnics = [],
  onClearAll,
}) => {
  const [technics, setTechnics] = useState<Technic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTechnic, setNewTechnic] = useState({
    name: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadTechnics();
      setSearchTerm("");
      setShowCreateForm(false);
    }
  }, [isOpen]);

  const loadTechnics = async () => {
    try {
      setLoading(true);
      const data = await technicService.getAll();
      setTechnics(data);
    } catch (error) {
      console.error("Teknikler yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechnic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdTechnic = await technicService.create(newTechnic);
      setTechnics([...technics, createdTechnic]);
      setNewTechnic({ name: "", description: "", category: "" });
      setShowCreateForm(false);
      // Yeni oluşturulan tekniği otomatik seç
      onSelectTechnic(createdTechnic);
    } catch (error) {
      console.error("Teknik oluşturulurken hata:", error);
    }
  };

  const isSelected = (technic: Technic) => {
    return selectedTechnics.some((st) => st.technicId === technic.technicId);
  };

  const filteredTechnics = useMemo(() => {
    if (!searchTerm.trim()) return technics;
    const term = searchTerm.toLowerCase();
    return technics.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.category?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
  }, [technics, searchTerm]);

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      // Eğer onClearAll prop'u yoksa, her seçili tekniği tek tek kaldır
      selectedTechnics.forEach((t) => onSelectTechnic(t));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="technic-modal-overlay" onClick={onClose}>
      <div className="technic-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="technic-modal-header">
          <h2>Teknik Seçimi</h2>
          <button className="technic-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Selected Summary */}
        {selectedTechnics.length > 0 && (
          <div className="technic-selected-summary">
            <div className="technic-selected-count">
              Seçili Teknikler: <span>{selectedTechnics.length}</span>
              <span
                style={{ marginLeft: 8, fontWeight: 400, color: "#6b7280" }}
              >
                ({selectedTechnics.map((t) => t.name).join(", ")})
              </span>
            </div>
            <button className="technic-clear-btn" onClick={handleClearAll}>
              Tümünü Temizle
            </button>
          </div>
        )}

        {/* Search */}
        <div className="technic-search-wrapper">
          <input
            type="text"
            className="technic-search-input"
            placeholder="Teknik ara... (isim, kategori veya açıklama)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="technic-modal-body">
          {loading ? (
            <div className="technic-loading">
              <div className="technic-loading-spinner"></div>
              <span>Teknikler yükleniyor...</span>
            </div>
          ) : filteredTechnics.length === 0 ? (
            <div className="technic-empty">
              <div className="technic-empty-icon">🔍</div>
              <p>
                {searchTerm
                  ? "Aramanızla eşleşen teknik bulunamadı"
                  : "Henüz teknik eklenmemiş"}
              </p>
            </div>
          ) : (
            <div className="technic-grid">
              {filteredTechnics.map((technic) => {
                const selected = isSelected(technic);
                return (
                  <div
                    key={technic.technicId}
                    className={`technic-card-item ${
                      selected ? "is-selected" : ""
                    }`}
                    onClick={() => onSelectTechnic(technic)}
                  >
                    <div className="technic-card-header">
                      <h4 className="technic-card-name">{technic.name}</h4>
                      <div className="technic-card-checkbox">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                    {technic.category && (
                      <span className="technic-card-category">
                        {technic.category}
                      </span>
                    )}
                    {technic.description && (
                      <p className="technic-card-description">
                        {technic.description}
                      </p>
                    )}
                    <span className="technic-card-status">
                      {selected ? "✓ Seçildi" : "+ Seç"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <form
              className="technic-create-form"
              onSubmit={handleCreateTechnic}
            >
              <h3>Yeni Teknik Oluştur</h3>
              <div className="technic-form-grid">
                <div className="technic-form-group">
                  <label>Teknik Adı *</label>
                  <input
                    type="text"
                    value={newTechnic.name}
                    onChange={(e) =>
                      setNewTechnic({ ...newTechnic, name: e.target.value })
                    }
                    placeholder="Örn: Dijital Baskı"
                    required
                  />
                </div>
                <div className="technic-form-group">
                  <label>Kategori</label>
                  <input
                    type="text"
                    value={newTechnic.category}
                    onChange={(e) =>
                      setNewTechnic({ ...newTechnic, category: e.target.value })
                    }
                    placeholder="Örn: Baskı Teknikleri"
                  />
                </div>
                <div className="technic-form-group full-width">
                  <label>Açıklama</label>
                  <textarea
                    value={newTechnic.description}
                    onChange={(e) =>
                      setNewTechnic({
                        ...newTechnic,
                        description: e.target.value,
                      })
                    }
                    placeholder="Teknik hakkında kısa bir açıklama..."
                  />
                </div>
              </div>
              <div className="technic-form-actions">
                <button
                  type="button"
                  className="technic-form-cancel"
                  onClick={() => setShowCreateForm(false)}
                >
                  İptal
                </button>
                <button type="submit" className="technic-form-submit">
                  Oluştur
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="technic-modal-footer">
          <button
            type="button"
            className="technic-add-new-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? (
              <>
                <span>✕</span> Formu Kapat
              </>
            ) : (
              <>
                <span>+</span> Yeni Teknik Ekle
              </>
            )}
          </button>
          <button type="button" className="technic-done-btn" onClick={onClose}>
            Tamam ({selectedTechnics.length} seçili)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicModal;
