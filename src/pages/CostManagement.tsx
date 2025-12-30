import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CostCategory, CostItem } from "../types";
import { costService } from "../services/dataService";
import { formatCurrency } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./CostManagement.css";

interface CostManagementProps {}

const CostManagement: React.FC<CostManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<"categories" | "items">(
    "categories"
  );
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    } else if (activeTab === "items") {
      loadCostItems();
      loadCategories(); // Kategori filtresi için kategorileri de yükle
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await costService.getCostCategories();
      setCategories(data);
    } catch (error) {
      console.error("❌ Failed to load categories:", error);
      alert("Kategoriler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const loadCostItems = async () => {
    try {
      setLoading(true);
      const data = await costService.getCostItems();
      setCostItems(data);
    } catch (error) {
      console.error("❌ Failed to load cost items:", error);
      alert("Maliyet kalemleri yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  // Kategori adını bul
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.costCategoryId === categoryId);
    return category?.categoryName || "-";
  };

  const handleEditItem = (item: CostItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedItem: CostItem) => {
    if (!editingItem) return;

    try {
      setLoading(true);
      await costService.updateCostItem(editingItem.costItemId, updatedItem);
      alert("Maliyet kalemi başarıyla güncellendi!");
      setEditModalOpen(false);
      setEditingItem(null);
      loadCostItems();
    } catch (error) {
      console.error("Failed to update cost item:", error);
      alert("Maliyet kalemi güncellenemedi!");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Maliyet verileri yükleniyor..." />;
  }

  return (
    <div className="cost-management-container">
      <div className="cost-management-header">
        <div className="header-content">
          <div className="header-top">
            <h1>Maliyet Yönetimi</h1>
            <p className="header-subtitle">
              Kategori, kalem ve birim tanımlamaları
            </p>
          </div>
        </div>
        <div className="tab-navigation">
          <button
            className={`tab-button ${
              activeTab === "categories" ? "active" : ""
            }`}
            onClick={() => setActiveTab("categories")}
          >
            Kategoriler
          </button>
          <button
            className={`tab-button ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            Maliyet Kalemleri
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === "categories" && (
          <div className="categories-section">
            <div className="section-header">
              <h2>Maliyet Kategorileri</h2>
              <button
                className="create-button"
                onClick={() => navigate("/cost/categories/new")}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
                Yeni Kategori
              </button>
            </div>

            <div className="categories-grid">
              {categories.map((category) => (
                <div key={category.costCategoryId} className="category-card">
                  <div className="category-header">
                    <h3>{category.categoryName}</h3>
                  </div>
                  {category.description && (
                    <p className="category-description">
                      {category.description}
                    </p>
                  )}
                  <div className="category-actions">
                    <button
                      className="view-button"
                      onClick={() =>
                        navigate(`/cost/categories/${category.costCategoryId}`)
                      }
                    >
                      Görüntüle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "items" && (
          <div className="items-section">
            <div className="section-header">
              <h2>Maliyet Kalemleri</h2>
              <div className="section-header-actions">
                <div className="category-filter">
                  <label>Kategori:</label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    {categories.map((cat) => (
                      <option
                        key={cat.costCategoryId}
                        value={cat.costCategoryId}
                      >
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="create-button"
                  onClick={() => navigate("/cost/items/new")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                  Yeni Maliyet Kalemi
                </button>
              </div>
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Kalem Adı</th>
                    <th>Kategori</th>
                    <th>Birim Fiyat</th>
                    <th>Döviz</th>
                    <th>Fire %</th>
                    <th>Tedarikçi</th>
                    <th>Son Güncelleme</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {costItems
                    .filter((item) =>
                      selectedCategoryFilter
                        ? item.costCategoryId === selectedCategoryFilter
                        : true
                    )
                    .map((item) => {
                      return (
                        <tr key={item.costItemId}>
                          <td>
                            <div className="item-name">
                              <strong>{item.itemName}</strong>
                              {item.description && (
                                <span className="item-description">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="category-badge">
                              {item.costCategory?.categoryName ||
                                getCategoryName(item.costCategoryId)}
                            </span>
                          </td>
                          <td className="price-cell">
                            {formatCurrency(item.unitPrice, item.currency)}
                            {item.discountPercentage && (
                              <span className="discount-badge">
                                -%{item.discountPercentage}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="currency-badge">
                              {item.currency}
                            </span>
                          </td>
                          <td>
                            {item.wastagePercentage ? (
                              <span
                                style={{ color: "#ff9800", fontWeight: "500" }}
                              >
                                %{item.wastagePercentage}
                              </span>
                            ) : (
                              <span style={{ color: "#ccc" }}>-</span>
                            )}
                          </td>
                          <td>{item.supplier || "-"}</td>
                          <td>{formatDate(item.lastPriceUpdate)}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleEditItem(item)}
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
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Düzenle
                              </button>

                              <button
                                className="action-btn delete-btn"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `"${item.itemName}" maliyet kalemini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`
                                    )
                                  ) {
                                    return;
                                  }

                                  try {
                                    await costService.deleteCostItem(
                                      item.costItemId
                                    );
                                    alert("Maliyet kalemi başarıyla silindi!");
                                    loadCostItems(); // Listeyi yenile
                                  } catch (error) {
                                    console.error(
                                      "Failed to delete cost item:",
                                      error
                                    );
                                    alert(
                                      "Maliyet kalemi silinemedi! Bu kalem kullanımda olabilir."
                                    );
                                  }
                                }}
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
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingItem && (
        <EditCostItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setEditModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

interface EditCostItemModalProps {
  item: CostItem;
  categories: CostCategory[];
  onClose: () => void;
  onSave: (item: CostItem) => void;
}

const EditCostItemModal: React.FC<EditCostItemModalProps> = ({
  item,
  categories,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<CostItem>({ ...item });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Maliyet Kalemini Düzenle</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Kalem Adı *</label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) =>
                setFormData({ ...formData, itemName: e.target.value })
              }
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kategori *</label>
              <select
                value={formData.costCategoryId}
                onChange={(e) =>
                  setFormData({ ...formData, costCategoryId: e.target.value })
                }
                required
              >
                <option value="">Seçiniz</option>
                {categories.map((cat) => (
                  <option key={cat.costCategoryId} value={cat.costCategoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Birim Fiyat *</label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: parseFloat(e.target.value),
                  })
                }
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
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tedarikçi</label>
              <input
                type="text"
                value={formData.supplier || ""}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Fire %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.wastagePercentage || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    wastagePercentage: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Açıklama</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              İptal
            </button>
            <button type="submit" className="btn-primary">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CostManagement;
