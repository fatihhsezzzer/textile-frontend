import React, { useState, useEffect } from "react";
import { Model } from "../types";
import { modelService } from "../services/dataService";
import "./ModelModal.css";

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: Model) => void;
}

const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newModel, setNewModel] = useState({
    modelCode: "",
    modelName: "",
    description: "",
    category: "",
    season: "",
    color: "",
    size: "",
    fabric: "",
    estimatedPrice: "",
    estimatedProductionTime: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    try {
      const data = await modelService.getAll();
      setModels(data);
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
        description: newModel.description || undefined,
        category: newModel.category || undefined,
        season: newModel.season || undefined,
        color: newModel.color || undefined,
        size: newModel.size || undefined,
        fabric: newModel.fabric || undefined,
        estimatedPrice: newModel.estimatedPrice
          ? parseFloat(newModel.estimatedPrice)
          : undefined,
        estimatedProductionTime: newModel.estimatedProductionTime
          ? parseInt(newModel.estimatedProductionTime)
          : undefined,
      };

      const created = await modelService.create(modelData);
      setModels([...models, created]);
      setShowAddForm(false);
      setNewModel({
        modelCode: "",
        modelName: "",
        description: "",
        category: "",
        season: "",
        color: "",
        size: "",
        fabric: "",
        estimatedPrice: "",
        estimatedProductionTime: "",
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
                    {model.category && (
                      <div className="item-detail">
                        Kategori: {model.category}
                      </div>
                    )}
                    {model.season && (
                      <div className="item-detail">Sezon: {model.season}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleAddModel} className="add-form">
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

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <input
                    type="text"
                    value={newModel.category}
                    onChange={(e) =>
                      setNewModel({ ...newModel, category: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Sezon</label>
                  <input
                    type="text"
                    value={newModel.season}
                    onChange={(e) =>
                      setNewModel({ ...newModel, season: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Renk</label>
                  <input
                    type="text"
                    value={newModel.color}
                    onChange={(e) =>
                      setNewModel({ ...newModel, color: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Beden</label>
                  <input
                    type="text"
                    value={newModel.size}
                    onChange={(e) =>
                      setNewModel({ ...newModel, size: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Kumaş</label>
                <input
                  type="text"
                  value={newModel.fabric}
                  onChange={(e) =>
                    setNewModel({ ...newModel, fabric: e.target.value })
                  }
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

              <div className="form-row">
                <div className="form-group">
                  <label>Tahmini Fiyat</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newModel.estimatedPrice}
                    onChange={(e) =>
                      setNewModel({
                        ...newModel,
                        estimatedPrice: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Tahmini Üretim Süresi (gün)</label>
                  <input
                    type="number"
                    value={newModel.estimatedProductionTime}
                    onChange={(e) =>
                      setNewModel({
                        ...newModel,
                        estimatedProductionTime: e.target.value,
                      })
                    }
                  />
                </div>
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
