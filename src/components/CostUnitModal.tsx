import React, { useState } from "react";
import { costService } from "../services/dataService";
import "./ModelModal.css";

interface CostUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CostUnitModal: React.FC<CostUnitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unitCode: "",
    unitName: "",
    description: "",
    displayOrder: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unitCode.trim()) {
      alert("Birim kodu zorunludur!");
      return;
    }

    if (!formData.unitName.trim()) {
      alert("Birim adı zorunludur!");
      return;
    }

    setLoading(true);

    try {
      const unitData = {
        unitCode: formData.unitCode.toUpperCase().trim(),
        unitName: formData.unitName.trim(),
        description: formData.description.trim() || undefined,
        displayOrder: formData.displayOrder,
        isActive: true,
      };

      await costService.createCostUnit(unitData);
      alert("Birim başarıyla oluşturuldu!");

      // Reset form
      setFormData({
        unitCode: "",
        unitName: "",
        description: "",
        displayOrder: 1,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("❌ Failed to create unit:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Birim oluşturulamadı!";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      unitCode: "",
      unitName: "",
      description: "",
      displayOrder: 1,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Yeni Birim Ekle</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Birim Kodu *</label>
              <input
                type="text"
                value={formData.unitCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitCode: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Örn: KG, ADET, MT"
                maxLength={10}
                required
              />
              <small>
                Kısa ve benzersiz kod (otomatik büyük harfe çevrilir)
              </small>
            </div>

            <div className="form-group">
              <label>Birim Adı *</label>
              <input
                type="text"
                value={formData.unitName}
                onChange={(e) =>
                  setFormData({ ...formData, unitName: e.target.value })
                }
                placeholder="Örn: Kilogram, Adet, Metre"
                maxLength={50}
                required
              />
            </div>

            <div className="form-group">
              <label>Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Birim hakkında detaylı açıklama (opsiyonel)"
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>Sıralama</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 1,
                  })
                }
                min={1}
                max={999}
              />
              <small>Listeleme sırasını belirler (küçükten büyüğe)</small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={handleClose}
                disabled={loading}
              >
                İptal
              </button>
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CostUnitModal;
