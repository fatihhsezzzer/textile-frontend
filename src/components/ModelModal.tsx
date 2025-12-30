import React, { useState, useEffect } from "react";
import { Model, Firm } from "../types";
import { modelService } from "../services/dataService";
import "./ModelModal.css";

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: Model) => void;
  firmId?: string;
  selectedFirm?: Firm | null;
}

const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  firmId,
  selectedFirm,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newModel, setNewModel] = useState({
    modelCode: "",
    modelName: "",
    patternCode: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    try {
      const data = await modelService.getAll();
      // Eğer firmId varsa sadece o firmaya ait modelleri göster
      const filteredData = firmId
        ? data.filter((model) => model.firmId === firmId)
        : data;
      setModels(filteredData);
    } catch (error) {
      console.error("Modeller yüklenemedi:", error);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const modelData: any = {
        modelCode: newModel.modelCode,
        // Model adı sorulmuyor; girilmemişse modelCode kullanılacak
        modelName: newModel.modelName || newModel.modelCode,
        patternCode: newModel.patternCode || undefined,
        description: newModel.description || undefined,
        firmId: firmId, // Otomatik seçili firma
      };

      const created = await modelService.create(modelData);
      setModels([...models, created]);
      setShowAddForm(false);
      setNewModel({
        modelCode: "",
        modelName: "",
        patternCode: "",
        description: "",
      });
      onSelect(created);
      onClose();
    } catch (error: any) {
      alert("Model eklenemedi: " + (error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Model Seç</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {!showAddForm ? (
            <>
              {selectedFirm && (
                <div
                  className="firm-info"
                  style={{
                    background:
                      "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    border: "1px solid #90caf9",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#0d47a1",
                  }}
                >
                  Firma: {selectedFirm.firmName} ({selectedFirm.firmCode})
                </div>
              )}
              <button
                className="add-new-button"
                onClick={() => setShowAddForm(true)}
              >
                + Yeni Model Ekle
              </button>

              <div className="items-list">
                {models.map((model) => (
                  <div
                    key={model.modelId}
                    className="item-card"
                    onClick={() => {
                      onSelect(model);
                      onClose();
                    }}
                  >
                    <div className="item-code">{model.modelCode}</div>
                    <div className="item-name">{model.modelName}</div>
                    {model.patternCode && (
                      <div className="item-detail">
                        Desen: {model.patternCode}
                      </div>
                    )}
                    {model.category && (
                      <div className="item-detail">
                        Kategori: {model.category}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleAddModel} className="add-form">
              {selectedFirm && (
                <div
                  className="firm-info"
                  style={{
                    background:
                      "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    border: "1px solid #81c784",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#2e7d32",
                  }}
                >
                  <div>Firma: {selectedFirm.firmName}</div>
                  <div
                    style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}
                  >
                    Model bu firmaya otomatik atanacak
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Model Kodu *</label>
                  <input
                    type="text"
                    value={newModel.modelCode}
                    onChange={(e) =>
                      setNewModel({ ...newModel, modelCode: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Desen Kodu</label>
                <input
                  type="text"
                  value={newModel.patternCode}
                  onChange={(e) =>
                    setNewModel({ ...newModel, patternCode: e.target.value })
                  }
                  maxLength={100}
                  placeholder="Desen kodu (opsiyonel)"
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={newModel.description}
                  onChange={(e) =>
                    setNewModel({ ...newModel, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="cancel-button"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-button"
                >
                  {loading ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelModal;
