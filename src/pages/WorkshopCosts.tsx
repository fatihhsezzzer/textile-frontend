import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { WorkshopCostItem, Workshop, CostItem, CostCategory } from "../types";
import { costService, workshopService } from "../services/dataService";
import { formatCurrency, turkishIncludes } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./WorkshopCosts.css";

const WorkshopCosts: React.FC = () => {
  const { workshopId } = useParams<{ workshopId: string }>();
  const navigate = useNavigate();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [workshopCosts, setWorkshopCosts] = useState<WorkshopCostItem[]>([]);
  const [availableCostItems, setAvailableCostItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkshopCostItem | null>(null);

  const [formData, setFormData] = useState({
    costItemId: "",
    notes: "",
  });

  // Arama ve filtreleme için state'ler
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    if (workshopId) {
      loadWorkshop();
      loadWorkshopCosts();
      loadAvailableCostItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId]);

  const loadWorkshop = async () => {
    try {
      const data = await workshopService.getAll();
      const found = data.find((w) => w.workshopId === workshopId);
      setWorkshop(found || null);
    } catch (error) {
      console.error("❌ Failed to load workshop:", error);
    }
  };

  const loadWorkshopCosts = async () => {
    if (!workshopId) return;
    try {
      setLoading(true);
      const data = await costService.getWorkshopCostItems(workshopId);
      setWorkshopCosts(data);
    } catch (error) {
      console.error("❌ Failed to load workshop costs:", error);
      alert("Atölye maliyetleri yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCostItems = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        costService.getCostItems(),
        costService.getCostCategories(),
      ]);
      setAvailableCostItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("❌ Failed to load cost items:", error);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      costItemId: "",
      notes: "",
    });
    setSearchTerm("");
    setSelectedCategory("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: WorkshopCostItem) => {
    setEditingItem(item);
    setFormData({
      costItemId: item.costItemId,
      notes: item.notes || "",
    });
    setSearchTerm("");
    setSelectedCategory("");
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
    setFormData({
      costItemId: "",
      notes: "",
    });
    setSearchTerm("");
    setSelectedCategory("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopId) return;

    if (!formData.costItemId || formData.costItemId.trim() === "") {
      alert("Maliyet kalemi seçimi zorunludur!");
      console.error("❌ Validation failed - costItemId is empty");
      return;
    }

    try {
      setLoading(true);

      const itemData = {
        workshopId,
        costItemId: formData.costItemId,
        isPreferred: false,
        notes: formData.notes.trim() || undefined,
        isActive: true,
      };

      if (editingItem) {
        // Update
        await costService.updateWorkshopItem(
          editingItem.workshopCostItemId,
          itemData
        );
        alert("Maliyet ilişkisi başarıyla güncellendi!");
      } else {
        // Create
        await costService.createWorkshopItem(itemData);
        alert("Maliyet kalemi başarıyla eklendi!");
      }

      closeModal();
      loadWorkshopCosts();
    } catch (error: any) {
      console.error("❌ Failed to save workshop cost:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "İşlem başarısız oldu!";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: WorkshopCostItem) => {
    if (
      !window.confirm(
        `"${item.costItem?.itemName}" maliyet kalemini bu atölyeden kaldırmak istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await costService.deleteWorkshopItem(item.workshopCostItemId);
      alert("Maliyet kalemi başarıyla kaldırıldı!");
      loadWorkshopCosts();
    } catch (error: any) {
      console.error("❌ Failed to delete workshop cost:", error);
      alert("Maliyet kalemi kaldırılamadı!");
    } finally {
      setLoading(false);
    }
  };

  if (loading && workshopCosts.length === 0) {
    return <PageLoader message="Maliyet kalemleri yükleniyor..." />;
  }

  return (
    <div className="workshop-costs-container">
      <div className="workshop-costs-header">
        <div className="header-content">
          <button
            className="back-button"
            onClick={() => navigate("/workshops")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z" />
            </svg>
            Geri
          </button>
          <h1>{workshop?.name || "Atölye"} - Maliyet Yönetimi</h1>
          <p className="subtitle">
            Toplam {workshopCosts.length} maliyet kalemi
          </p>
        </div>

        <button className="add-button" onClick={openAddModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          Maliyet Kalemi Ekle
        </button>
      </div>

      {workshopCosts.length === 0 ? (
        <div className="workshop-costs-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#cbd5e1">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          <h3>Henüz maliyet kalemi eklenmemiş</h3>
          <p>Bu atölyeye maliyet kalemi ekleyerek başlayın.</p>
        </div>
      ) : (
        <div className="workshop-costs-table-container">
          <table className="workshop-costs-table">
            <thead>
              <tr>
                <th>Maliyet Kalemi</th>
                <th>Kategori</th>
                <th>Birim</th>
                <th>Standart Fiyat</th>
                <th>Atölye Fiyatı</th>
                <th>Efektif Fiyat</th>
                <th>Tercih</th>
                <th>Not</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {workshopCosts.map((item) => {
                return (
                  <tr key={item.workshopCostItemId}>
                    <td>
                      <div className="item-name">
                        <strong>{item.costItemName}</strong>
                        {item.costItemDescription && (
                          <span className="item-description">
                            {item.costItemDescription}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">
                        {item.categoryName}
                      </span>
                    </td>
                    <td>
                      {item.unitName ? (
                        <span>
                          {item.unitName}
                          <span
                            style={{
                              marginLeft: "4px",
                              color: "#64748b",
                              fontSize: "0.9em",
                            }}
                          >
                            ({item.unitCode})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>
                          {item.unitCode || "-"}
                        </span>
                      )}
                    </td>
                    <td className="price-cell">
                      {item.standardPrice !== undefined
                        ? formatCurrency(
                            item.standardPrice,
                            item.standardCurrency
                          )
                        : "-"}
                    </td>
                    <td className="price-cell">
                      {item.workshopSpecificPrice ? (
                        <span className="workshop-price">
                          {formatCurrency(
                            item.workshopSpecificPrice,
                            item.workshopCurrency
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="price-cell">
                      <span className="effective-price">
                        {item.effectivePrice !== undefined
                          ? formatCurrency(
                              item.effectivePrice,
                              item.effectiveCurrency
                            )
                          : "-"}
                      </span>
                    </td>
                    <td>
                      {item.isPreferred && (
                        <span className="preferred-badge">⭐ Tercih</span>
                      )}
                    </td>
                    <td>
                      {item.notes && (
                        <span className="notes-cell" title={item.notes}>
                          {item.notes.substring(0, 30)}
                          {item.notes.length > 30 ? "..." : ""}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => openEditModal(item)}
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(item)}
                          title="Kaldır"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="workshop-add-modal-overlay" onClick={closeModal}>
          <div
            className="workshop-add-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="workshop-add-modal-header">
              <h2>
                {editingItem
                  ? "Maliyet Kalemini Düzenle"
                  : "Yeni Maliyet Kalemi Ekle"}
              </h2>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Maliyet Kalemi *</label>
                <div className="searchable-select-container">
                  {/* Arama ve Kategori Filtre Satırı */}
                  <div className="select-filters">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="🔍 Ara..."
                      disabled={!!editingItem}
                      className="filter-search"
                    />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={!!editingItem}
                      className="filter-category"
                    >
                      <option value="">📁 Tüm Kategoriler</option>
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
                  {/* Maliyet Kalemleri Listesi */}
                  <select
                    value={formData.costItemId}
                    onChange={(e) => {
                      setFormData({ ...formData, costItemId: e.target.value });
                    }}
                    required
                    disabled={!!editingItem}
                    className="cost-item-select"
                    size={6}
                  >
                    <option value="" disabled>
                      -- Maliyet kalemi seçin --
                    </option>
                    {availableCostItems
                      .filter((item) => {
                        // Seçili item her zaman görünsün
                        if (formData.costItemId === item.costItemId) {
                          return true;
                        }

                        if (
                          selectedCategory &&
                          item.costCategoryId !== selectedCategory
                        ) {
                          return false;
                        }
                        if (searchTerm) {
                          return (
                            turkishIncludes(item.itemName, searchTerm) ||
                            turkishIncludes(
                              item.costCategory?.categoryName || "",
                              searchTerm
                            ) ||
                            turkishIncludes(item.description || "", searchTerm)
                          );
                        }
                        return true;
                      })
                      .map((item) => (
                        <option key={item.costItemId} value={item.costItemId}>
                          {item.itemName} - {item.costCategory?.categoryName} (
                          {formatCurrency(item.unitPrice, item.currency)}/
                          {item.unit})
                        </option>
                      ))}
                  </select>
                  <span className="select-count">
                    {
                      availableCostItems.filter((item) => {
                        if (
                          selectedCategory &&
                          item.costCategoryId !== selectedCategory
                        )
                          return false;
                        if (searchTerm) {
                          return (
                            turkishIncludes(item.itemName, searchTerm) ||
                            turkishIncludes(
                              item.costCategory?.categoryName || "",
                              searchTerm
                            ) ||
                            turkishIncludes(item.description || "", searchTerm)
                          );
                        }
                        return true;
                      }).length
                    }{" "}
                    kalem listeleniyor
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Ek bilgiler veya notlar"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopCosts;
