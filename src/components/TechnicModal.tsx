import React, { useState, useEffect } from "react";
import { Technic } from "../types";
import { technicService } from "../services/dataService";

interface TechnicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTechnic: (technic: Technic) => void;
  selectedTechnics?: Technic[];
}

const TechnicModal: React.FC<TechnicModalProps> = ({
  isOpen,
  onClose,
  onSelectTechnic,
  selectedTechnics = [],
}) => {
  const [technics, setTechnics] = useState<Technic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTechnic, setNewTechnic] = useState({
    name: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadTechnics();
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
    } catch (error) {
      console.error("Teknik oluşturulurken hata:", error);
    }
  };

  const isSelected = (technic: Technic) => {
    return selectedTechnics.some((st) => st.technicId === technic.technicId);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Teknik Seç</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div>Teknikler yükleniyor...</div>
          ) : (
            <>
              <div className="technics-grid">
                {technics.map((technic) => (
                  <div
                    key={technic.technicId}
                    className={`technic-card ${
                      isSelected(technic) ? "selected" : ""
                    }`}
                    onClick={() => onSelectTechnic(technic)}
                  >
                    <h3>{technic.name}</h3>
                    {technic.category && (
                      <p className="technic-category">
                        Kategori: {technic.category}
                      </p>
                    )}
                    {technic.description && (
                      <p className="technic-description">
                        {technic.description}
                      </p>
                    )}
                    {isSelected(technic) && (
                      <div className="selected-indicator">✓ Seçildi</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="btn-secondary"
                >
                  {showCreateForm ? "İptal" : "Yeni Teknik Ekle"}
                </button>
              </div>

              {showCreateForm && (
                <form onSubmit={handleCreateTechnic} className="create-form">
                  <h3>Yeni Teknik Oluştur</h3>
                  <div className="form-group">
                    <label>Teknik Adı:</label>
                    <input
                      type="text"
                      value={newTechnic.name}
                      onChange={(e) =>
                        setNewTechnic({ ...newTechnic, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Kategori:</label>
                    <input
                      type="text"
                      value={newTechnic.category}
                      onChange={(e) =>
                        setNewTechnic({
                          ...newTechnic,
                          category: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Açıklama:</label>
                    <textarea
                      value={newTechnic.description}
                      onChange={(e) =>
                        setNewTechnic({
                          ...newTechnic,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Oluştur
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicModal;
