import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CostCategory, CalculationType } from "../types";
import { costService } from "../services/dataService";
import "./CostItemForm.css";

interface CostItemFormProps {}

// Hesaplama tipi açıklamaları
const calculationTypeLabels: Record<CalculationType, string> = {
  [CalculationType.Simple]: "Basit (Miktar × Birim Fiyat)",
  [CalculationType.TwoDimensional]:
    "İki Boyutlu (Miktar × Miktar2 × Birim Fiyat)",
  [CalculationType.PieceFitting]: "Varak/Sticker Sığdırma",
  [CalculationType.MeterBased]: "Metre Bazlı",
  [CalculationType.AreaBased]: "Alan Bazlı (m²)",
  [CalculationType.PaintBased]: "Boya Hesaplama",
};

// Hesaplama tipine göre parametre sayısı ve varsayılan başlıklar
// Not: Sipariş adedi otomatik olarak siparişten alınır, bu yüzden parametre olarak girilmez
const calculationTypeConfig: Record<
  CalculationType,
  {
    paramCount: number;
    defaultLabels: string[];
    description: string;
    needsMaterialDimensions?: boolean;
    usesOrderQuantity?: boolean; // Sipariş adedini otomatik kullanır mı?
  }
> = {
  [CalculationType.Simple]: {
    paramCount: 1,
    defaultLabels: ["Miktar"],
    description: "Basit hesaplama: Miktar × Birim Fiyat",
  },
  [CalculationType.TwoDimensional]: {
    paramCount: 2,
    defaultLabels: ["En", "Boy"],
    description:
      "Çift boyutlu: Miktar1 × Miktar2 × Birim Fiyat (örn: en × boy)",
  },
  [CalculationType.PieceFitting]: {
    paramCount: 2,
    defaultLabels: ["En (cm)", "Boy (cm)"],
    description:
      "Varak/Sticker sığdırma: Parça boyutlarına göre malzemeye kaç adet sığdığını hesaplar. Sipariş adedi otomatik alınır.",
    needsMaterialDimensions: true,
    usesOrderQuantity: true,
  },
  [CalculationType.MeterBased]: {
    paramCount: 1,
    defaultLabels: ["Metre"],
    description:
      "Metre bazlı: Metre × Sipariş Adedi şeklinde hesaplama yapar. Sipariş adedi otomatik alınır.",
    usesOrderQuantity: true,
  },
  [CalculationType.AreaBased]: {
    paramCount: 2,
    defaultLabels: ["En (m)", "Boy (m)"],
    description:
      "Alan bazlı: En × Boy × Sipariş Adedi (m² cinsinden) hesaplama yapar. Sipariş adedi otomatik alınır.",
    usesOrderQuantity: true,
  },
  [CalculationType.PaintBased]: {
    paramCount: 2,
    defaultLabels: ["Litre", "Çeşit Sayısı"],
    description: "Boya hesaplama: Litre × Çeşit Sayısı × Fire.",
  },
};

const CostItemForm: React.FC<CostItemFormProps> = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id && id !== "new");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CostCategory[]>([]);

  const [formData, setFormData] = useState({
    itemName: "",
    unitPrice: 0,
    currency: "TRY",
    costCategoryId: "",
    supplier: "",
    wastagePercentage: 0, // Fire yüzdesi (0-100)
    isActive: true,
    // Yeni hesaplama tipi alanları
    calculationType: CalculationType.Simple,
    materialWidth: 0, // Malzeme eni (Varak: 150, Sticker: 59)
    materialHeight: 0, // Malzeme boyu per metre (100)
    quantity1Label: "", // 1. miktar başlığı
    quantity2Label: "", // 2. miktar başlığı
    quantity3Label: "", // 3. miktar başlığı
  });

  useEffect(() => {
    loadCategories();
    if (isEditing && id) {
      loadCostItem(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  const loadCategories = async () => {
    try {
      const data = await costService.getCostCategories();
      setCategories(data);
    } catch (error) {
      console.error("❌ Failed to load categories:", error);
      alert("Kategoriler yüklenemedi!");
    }
  };

  const loadCostItem = async (itemId: string) => {
    try {
      setLoading(true);
      const data = await costService.getCostItemById(itemId);

      setFormData({
        itemName: data.itemName,
        unitPrice: data.unitPrice,
        currency: data.currency,
        costCategoryId: data.costCategoryId,
        supplier: data.supplier || "",
        wastagePercentage: data.wastagePercentage || 0,
        isActive: data.isActive,
        // Yeni hesaplama tipi alanları
        calculationType: data.calculationType ?? CalculationType.Simple,
        materialWidth: data.materialWidth || 0,
        materialHeight: data.materialHeight || 0,
        quantity1Label: data.quantity1Label || "",
        quantity2Label: data.quantity2Label || "",
        quantity3Label: data.quantity3Label || "",
      });
    } catch (error) {
      console.error("❌ Failed to load cost item:", error);
      alert("Maliyet kalemi yüklenemedi!");
      navigate("/cost");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.itemName.trim()) {
      alert("Kalem adı zorunludur!");
      return;
    }

    if (!formData.costCategoryId) {
      alert("Kategori seçimi zorunludur!");
      return;
    }

    if (formData.unitPrice <= 0) {
      alert("Birim fiyat sıfırdan büyük olmalıdır!");
      return;
    }

    try {
      setSaving(true);

      const itemData = {
        ...formData,
        wastagePercentage: formData.wastagePercentage || 0, // Fire yüdesi
        supplier: formData.supplier || undefined,
        // Hesaplama tipi alanları
        calculationType: formData.calculationType,
        materialWidth: formData.materialWidth || undefined,
        materialHeight: formData.materialHeight || undefined,
        quantity1Label: formData.quantity1Label || undefined,
        quantity2Label: formData.quantity2Label || undefined,
        quantity3Label: formData.quantity3Label || undefined,
      };

      if (isEditing && id) {
        // Backend'de full update endpoint'i yok - sadece fiyat güncellenebilir
        alert(
          "⚠️ Maliyet kalemi düzenleme şu anda desteklenmiyor.\n\nSadece fiyat güncellemesi yapabilirsiniz veya yeni bir kayıt oluşturabilirsiniz."
        );
        navigate("/cost");
        return;
      } else {
        // Create new item
        await costService.createCostItem(itemData);
        alert("Maliyet kalemi başarıyla oluşturuldu!");
      }

      navigate("/cost");
    } catch (error) {
      console.error("❌ Failed to save cost item:", error);
      alert("Maliyet kalemi kaydedilemedi!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !id) return;

    if (
      !window.confirm("Bu maliyet kalemini silmek istediğinizden emin misiniz?")
    ) {
      return;
    }

    try {
      await costService.deleteCostItem(id);
      alert("Maliyet kalemi başarıyla silindi!");
      navigate("/cost");
    } catch (error) {
      console.error("❌ Failed to delete cost item:", error);
      alert(
        "Maliyet kalemi silinemedi! Bu kaleme bağlı model maliyetleri olabilir."
      );
    }
  };

  const currencies = ["TRY", "USD", "EUR"];

  if (loading) {
    return (
      <div className="cost-item-form-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="cost-item-form-container">
      <div className="cost-item-form-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate("/cost")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z" />
            </svg>
            Geri
          </button>
          <h1>
            {isEditing ? "Maliyet Kalemini Düzenle" : "Yeni Maliyet Kalemi"}
          </h1>
        </div>
        <div className="header-actions">
          {isEditing && (
            <button className="delete-button" onClick={handleDelete}>
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
          )}
        </div>
      </div>

      <div className="cost-item-form-content">
        <div className="form-section">
          <h2>Temel Bilgiler</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Kalem Adı *</label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                placeholder="Örn: Pamuk İplik, Polyester Kumaş"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Hesaplama Ayarları</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Hesaplama Tipi *</label>
              <select
                value={formData.calculationType}
                onChange={(e) => {
                  const newType = parseInt(e.target.value) as CalculationType;
                  const config = calculationTypeConfig[newType];
                  // Hesaplama tipi değiştiğinde varsayılan başlıkları ayarla
                  setFormData({
                    ...formData,
                    calculationType: newType,
                    quantity1Label: config.defaultLabels[0] || "",
                    quantity2Label: config.defaultLabels[1] || "",
                    quantity3Label: config.defaultLabels[2] || "",
                  });
                }}
              >
                {Object.entries(calculationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {calculationTypeConfig[formData.calculationType]?.description}
              </span>
            </div>

            {/* Varak/Sticker için malzeme boyutları */}
            {calculationTypeConfig[formData.calculationType]
              ?.needsMaterialDimensions && (
              <>
                <div className="form-group">
                  <label>Malzeme Eni (cm) *</label>
                  <input
                    type="number"
                    value={formData.materialWidth || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        materialWidth: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Örn: 150 (Varak), 59 (Sticker)"
                    min="0"
                    step="0.1"
                  />
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    Malzeme rulo/levha eni
                  </span>
                </div>
                <div className="form-group">
                  <label>Malzeme Boyu per Metre (cm) *</label>
                  <input
                    type="number"
                    value={formData.materialHeight || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        materialHeight: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Örn: 100"
                    min="0"
                    step="0.1"
                  />
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    1 metre malzemede kullanılabilir boy
                  </span>
                </div>
              </>
            )}

            {/* Dinamik Parametre Başlıkları */}
            <div
              className="form-group full-width"
              style={{ marginTop: "16px" }}
            >
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    {
                      calculationTypeConfig[formData.calculationType]
                        ?.paramCount
                    }{" "}
                    Parametre
                  </span>
                  Miktar Giriş Alanları
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {/* 1. Parametre - Her zaman göster */}
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      1. Parametre Başlığı
                    </label>
                    <input
                      type="text"
                      value={formData.quantity1Label}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity1Label: e.target.value,
                        })
                      }
                      placeholder={
                        calculationTypeConfig[formData.calculationType]
                          ?.defaultLabels[0] || "Miktar"
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* 2. Parametre - paramCount >= 2 ise göster */}
                  {calculationTypeConfig[formData.calculationType]
                    ?.paramCount >= 2 && (
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        2. Parametre Başlığı
                      </label>
                      <input
                        type="text"
                        value={formData.quantity2Label}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity2Label: e.target.value,
                          })
                        }
                        placeholder={
                          calculationTypeConfig[formData.calculationType]
                            ?.defaultLabels[1] || "Miktar 2"
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  {/* 3. Parametre - paramCount >= 3 ise göster */}
                  {calculationTypeConfig[formData.calculationType]
                    ?.paramCount >= 3 && (
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        3. Parametre Başlığı
                      </label>
                      <input
                        type="text"
                        value={formData.quantity3Label}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity3Label: e.target.value,
                          })
                        }
                        placeholder={
                          calculationTypeConfig[formData.calculationType]
                            ?.defaultLabels[2] || "Miktar 3"
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}
                </div>
                <div
                  style={{ fontSize: "11px", color: "#888", marginTop: "8px" }}
                >
                  Bu başlıklar transfer modalında miktar girişlerinde
                  görünecektir.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Kategori Bilgileri</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Kategori *</label>
              <select
                value={formData.costCategoryId}
                onChange={(e) =>
                  setFormData({ ...formData, costCategoryId: e.target.value })
                }
                required
              >
                <option value="">Kategori seçiniz</option>
                {categories.map((category) => (
                  <option
                    key={category.costCategoryId}
                    value={category.costCategoryId}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Fiyat Bilgileri</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Birim Fiyat *</label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: parseFloat(e.target.value) || 0,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                  }
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Döviz *</label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                required
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Fire Yüzdesi (%)
                <span
                  style={{ fontSize: "12px", color: "#666", marginLeft: "4px" }}
                >
                  (Opsiyonel)
                </span>
              </label>
              <input
                type="number"
                value={formData.wastagePercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    wastagePercentage: parseFloat(e.target.value) || 0,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                  }
                }}
                placeholder="Örn: 10 (%10 fire)"
                min="0"
                max="100"
                step="0.1"
                style={{
                  borderColor: "#ff9800",
                }}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Tedarikçi Bilgileri</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Tedarikçi</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                placeholder="Tedarikçi firma adı"
              />
            </div>

            <div className="form-group">
              <label>Durum</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  <span className="checkbox-text">Aktif</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Alt Aksiyon Butonları */}
        <div className="form-actions">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostItemForm;
