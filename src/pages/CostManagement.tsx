import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CostCategory, CostItem, CostUnit } from "../types";
import { costService } from "../services/dataService";
import CostUnitModal from "../components/CostUnitModal";
import { formatCurrency } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./CostManagement.css";

interface CostManagementProps {}

const CostManagement: React.FC<CostManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<"categories" | "items" | "units">(
    "categories"
  );
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [units, setUnits] = useState<CostUnit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    } else if (activeTab === "items") {
      loadCostItems();
      loadCategories(); // Kategori filtresi için kategorileri de yükle
      loadUnits(); // Birim adlarını göstermek için birimleri de yükle
    } else if (activeTab === "units") {
      loadUnits();
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

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await costService.getCostUnits();
      setUnits(data);
    } catch (error) {
      console.error("❌ Failed to load units:", error);
      alert("Birimler yüklenemedi!");
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

  // Birim bilgisini bul
  const getUnitInfo = (
    unitId?: string
  ): { unitName: string; unitCode: string } | null => {
    if (!unitId) return null;
    const unit = units.find((u) => u.costUnitId === unitId);
    console.log("🔍 getUnitInfo called:", {
      unitId,
      foundUnit: unit,
      allUnits: units.length,
    });
    return unit ? { unitName: unit.unitName, unitCode: unit.unitCode } : null;
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
          <button
            className={`tab-button ${activeTab === "units" ? "active" : ""}`}
            onClick={() => setActiveTab("units")}
          >
            Birimler
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
                    <th>Birim 1</th>
                    <th>Birim 2</th>
                    <th>3. Birim (Ref)</th>
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
                      console.log("🔍 Cost item:", {
                        itemName: item.itemName,
                        costUnitId: item.costUnitId,
                        costUnit: item.costUnit,
                        unit: item.unit,
                        unitName: item.unitName,
                        category: item.costCategory?.categoryName,
                        fullItem: item,
                      });

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
                          <td>
                            {item.quantity1Label ||
                              (() => {
                                const unit1 =
                                  item.costUnit || getUnitInfo(item.costUnitId);
                                if (unit1) {
                                  return (
                                    <>
                                      {unit1.unitName}
                                      <span
                                        style={{
                                          fontSize: "0.85em",
                                          color: "#666",
                                          marginLeft: "4px",
                                        }}
                                      >
                                        ({unit1.unitCode})
                                      </span>
                                    </>
                                  );
                                }
                                return item.unit || item.unitName || "-";
                              })()}
                          </td>
                          <td>
                            {item.quantity2Label ||
                              (() => {
                                const unit2 =
                                  item.costUnit2 ||
                                  getUnitInfo(item.costUnitId2);
                                if (unit2) {
                                  return (
                                    <>
                                      {unit2.unitName}
                                      <span
                                        style={{
                                          fontSize: "0.85em",
                                          color: "#666",
                                          marginLeft: "4px",
                                        }}
                                      >
                                        ({unit2.unitCode})
                                      </span>
                                    </>
                                  );
                                }
                                return <span style={{ color: "#ccc" }}>-</span>;
                              })()}
                          </td>
                          <td>
                            {(() => {
                              const unit3 =
                                item.costUnit3 || getUnitInfo(item.costUnitId3);
                              if (unit3) {
                                return (
                                  <span
                                    style={{
                                      color: "#856404",
                                      fontSize: "0.9em",
                                    }}
                                  >
                                    {unit3.unitName}
                                    <span
                                      style={{
                                        fontSize: "0.85em",
                                        color: "#999",
                                        marginLeft: "4px",
                                      }}
                                    >
                                      ({unit3.unitCode})
                                    </span>
                                  </span>
                                );
                              }
                              return <span style={{ color: "#ccc" }}>-</span>;
                            })()}
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
                                className="edit-button"
                                onClick={() => {
                                  alert(
                                    "⚠️ Maliyet kalemi düzenleme backend tarafından desteklenmiyor.\n\nSadece fiyat güncellemesi yapabilirsiniz."
                                  );
                                }}
                                title="Düzenleme desteklenmiyor - Sadece fiyat güncelleyebilirsiniz"
                                style={{ opacity: 0.5, cursor: "not-allowed" }}
                              >
                                ✏️
                              </button>
                              <button
                                className="price-update-button"
                                onClick={async () => {
                                  const newPriceStr = prompt(
                                    `"${item.itemName}" için yeni fiyat girin:\n\nMevcut fiyat: ${item.unitPrice} ${item.currency}`,
                                    item.unitPrice.toString()
                                  );

                                  if (newPriceStr === null) return; // İptal

                                  const newPrice = parseFloat(newPriceStr);
                                  if (isNaN(newPrice) || newPrice < 0) {
                                    alert("Geçersiz fiyat!");
                                    return;
                                  }

                                  try {
                                    await costService.updateCostItemPrice(
                                      item.costItemId,
                                      newPrice
                                    );
                                    alert("Fiyat başarıyla güncellendi!");
                                    loadCostItems(); // Listeyi yenile
                                  } catch (error) {
                                    console.error(
                                      "Failed to update price:",
                                      error
                                    );
                                    alert("Fiyat güncellenemedi!");
                                  }
                                }}
                                title="Fiyat Güncelle"
                              >
                                💰
                              </button>
                              <button
                                className="delete-button"
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
          </div>
        )}

        {activeTab === "units" && (
          <div className="units-section">
            <div className="section-header">
              <h2>Birimler</h2>
              <button
                className="create-button"
                onClick={() => setIsUnitModalOpen(true)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
                Yeni Birim
              </button>
            </div>

            <div className="units-grid">
              {units.map((unit) => (
                <div key={unit.costUnitId} className="unit-card">
                  <div className="unit-header">
                    <h3>{unit.unitName}</h3>
                    <span className="unit-code">{unit.unitCode}</span>
                  </div>
                  {unit.description && (
                    <p className="unit-description">{unit.description}</p>
                  )}
                  <div className="unit-footer">
                    <span className="unit-order">
                      Sıra: #{unit.displayOrder}
                    </span>
                    <span
                      className={`status-badge ${
                        unit.isActive ? "active" : "inactive"
                      }`}
                    >
                      {unit.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CostUnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={loadUnits}
      />
    </div>
  );
};

export default CostManagement;
