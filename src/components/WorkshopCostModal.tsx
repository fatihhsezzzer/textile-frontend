import React, { useState, useEffect } from "react";
import { WorkshopCostItem, OrderWorkshopCost } from "../types";
import { costService } from "../services/dataService";
import { formatCurrency } from "../utils/formatters";
import "./WorkshopCostModal.css";

interface WorkshopCostModalProps {
  isOpen: boolean;
  orderId: string;
  workshopId: string;
  workshopName: string;
  onClose: () => void;
  onSave: (
    costs: Omit<
      OrderWorkshopCost,
      | "orderWorkshopCostId"
      | "createdAt"
      | "createdBy"
      | "updatedAt"
      | "updatedBy"
      | "order"
      | "workshop"
      | "costItem"
    >[]
  ) => Promise<void>;
}

interface CostItemInput {
  costItemId: string;
  costItem?: WorkshopCostItem["costItem"];
  quantityUsed: number;
  actualPrice: number;
  currency: string;
  notes: string;
}

const WorkshopCostModal: React.FC<WorkshopCostModalProps> = ({
  isOpen,
  orderId,
  workshopId,
  workshopName,
  onClose,
  onSave,
}) => {
  const [workshopCostItems, setWorkshopCostItems] = useState<
    WorkshopCostItem[]
  >([]);
  const [selectedCosts, setSelectedCosts] = useState<
    Map<string, CostItemInput>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && workshopId) {
      loadWorkshopCostItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workshopId]);

  const loadWorkshopCostItems = async () => {
    try {
      setLoading(true);
      const items = await costService.getWorkshopCostItems(workshopId);
      // Sadece aktif ve tercih edilen veya priority'si olan itemları göster
      const filteredItems = items
        .filter((item) => item.isActive && item.costItem?.isActive)
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
      setWorkshopCostItems(filteredItems);
    } catch (error) {
      console.error("❌ Failed to load workshop cost items:", error);
      alert("Atölye maliyet kalemleri yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const toggleCostItem = (item: WorkshopCostItem, checked: boolean) => {
    const newSelected = new Map(selectedCosts);

    if (checked) {
      newSelected.set(item.costItemId, {
        costItemId: item.costItemId,
        costItem: item.costItem,
        quantityUsed: 1,
        actualPrice: item.effectivePrice,
        currency: item.costItem?.currency || "TRY",
        notes: "",
      });
    } else {
      newSelected.delete(item.costItemId);
    }

    setSelectedCosts(newSelected);
  };

  const updateCostItemInput = (
    costItemId: string,
    field: keyof CostItemInput,
    value: any
  ) => {
    const newSelected = new Map(selectedCosts);
    const item = newSelected.get(costItemId);
    if (item) {
      newSelected.set(costItemId, { ...item, [field]: value });
      setSelectedCosts(newSelected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCosts.size === 0) {
      alert("En az bir maliyet kalemi seçmelisiniz!");
      return;
    }

    // Validation
    for (const [, input] of Array.from(selectedCosts.entries())) {
      if (input.quantityUsed <= 0) {
        alert("Miktar sıfırdan büyük olmalıdır!");
        return;
      }
      if (input.actualPrice < 0) {
        alert("Birim fiyat negatif olamaz!");
        return;
      }
    }

    try {
      setSaving(true);

      const costsToSave = Array.from(selectedCosts.values()).map((input) => ({
        orderId,
        workshopId,
        costItemId: input.costItemId,
        quantityUsed: input.quantityUsed,
        actualPrice: input.actualPrice,
        currency: input.currency,
        totalCost: input.quantityUsed * input.actualPrice,
        notes: input.notes.trim() || undefined,
        isActive: true,
      }));

      await onSave(costsToSave);
      setSelectedCosts(new Map());
      onClose();
    } catch (error: any) {
      console.error("❌ Failed to save costs:", error);
      alert(error.message || "Maliyetler kaydedilemedi!");
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalCost = (): number => {
    return Array.from(selectedCosts.values()).reduce(
      (sum, item) => sum + item.quantityUsed * item.actualPrice,
      0
    );
  };

  if (!isOpen) return null;

  return (
    <div className="workshop-cost-modal-overlay" onClick={onClose}>
      <div
        className="workshop-cost-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workshop-cost-modal-header">
          <div>
            <h2>Atölye Maliyetleri</h2>
            <p className="workshop-name">{workshopName}</p>
          </div>
          <button className="close-button" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Maliyet kalemleri yükleniyor...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="workshop-cost-modal-body">
              {workshopCostItems.length === 0 ? (
                <div className="empty-state">
                  <p>Bu atölye için kayıtlı maliyet kalemi bulunmuyor.</p>
                  <small>
                    Atölye maliyet kalemlerini Atölyeler sayfasından
                    ekleyebilirsiniz.
                  </small>
                </div>
              ) : (
                <>
                  <div className="instruction-text">
                    <p>
                      Bu sipariş için kullanılan maliyet kalemlerini seçin ve
                      miktarlarını girin:
                    </p>
                  </div>

                  <div className="cost-items-list">
                    {workshopCostItems.map((item) => {
                      const isSelected = selectedCosts.has(item.costItemId);
                      const input = selectedCosts.get(item.costItemId);

                      return (
                        <div
                          key={item.workshopCostItemId}
                          className={`cost-item-row ${
                            isSelected ? "selected" : ""
                          }`}
                        >
                          <div className="cost-item-header">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  toggleCostItem(item, e.target.checked)
                                }
                              />
                              <div className="cost-item-info">
                                <strong>{item.costItem?.itemName}</strong>
                                {item.isPreferred && (
                                  <span className="preferred-badge">
                                    ⭐ Tercih Edilen
                                  </span>
                                )}
                                <div className="cost-item-details">
                                  <span className="category-badge">
                                    {item.costItem?.costCategory?.categoryName}
                                  </span>
                                  <span className="price-info">
                                    {formatCurrency(
                                      item.effectivePrice,
                                      item.costItem?.currency
                                    )}{" "}
                                    / {item.costItem?.unit}
                                  </span>
                                  {item.priority && (
                                    <span className="priority-badge">
                                      Öncelik: #{item.priority}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>

                          {isSelected && input && (
                            <div className="cost-item-inputs">
                              <div className="input-group">
                                <label>Kullanılan Miktar</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={input.quantityUsed}
                                  onChange={(e) =>
                                    updateCostItemInput(
                                      item.costItemId,
                                      "quantityUsed",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  required
                                />
                                <span className="input-unit">
                                  {item.costItem?.unit}
                                </span>
                              </div>

                              <div className="input-group">
                                <label>Birim Fiyat</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={input.actualPrice}
                                  onChange={(e) =>
                                    updateCostItemInput(
                                      item.costItemId,
                                      "actualPrice",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  required
                                />
                                <span className="input-currency">
                                  {input.currency}
                                </span>
                              </div>

                              <div className="input-group">
                                <label>Toplam</label>
                                <div className="calculated-total">
                                  {formatCurrency(
                                    input.quantityUsed * input.actualPrice,
                                    input.currency
                                  )}
                                </div>
                              </div>

                              <div className="input-group full-width">
                                <label>Not (Opsiyonel)</label>
                                <input
                                  type="text"
                                  value={input.notes}
                                  onChange={(e) =>
                                    updateCostItemInput(
                                      item.costItemId,
                                      "notes",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ek bilgi veya açıklama"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedCosts.size > 0 && (
                    <div className="total-summary">
                      <div className="summary-row">
                        <span>Seçili Kalem:</span>
                        <strong>{selectedCosts.size} adet</strong>
                      </div>
                      <div className="summary-row total">
                        <span>Toplam Maliyet:</span>
                        <strong className="total-amount">
                          {formatCurrency(calculateTotalCost())}
                        </strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="workshop-cost-modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                İptal
              </button>
              <button
                type="submit"
                className="save-button"
                disabled={saving || selectedCosts.size === 0 || loading}
              >
                {saving
                  ? "Kaydediliyor..."
                  : `${selectedCosts.size} Kalemi Kaydet`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WorkshopCostModal;
