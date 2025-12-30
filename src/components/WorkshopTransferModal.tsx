import React, { useState, useEffect } from "react";
import {
  WorkshopCostItem,
  OrderWorkshopCost,
  User,
  CalculationType,
} from "../types";
import { costService } from "../services/dataService";
import { formatNumber } from "../utils/formatters";
import "./WorkshopTransferModal.css";

// Hesaplama tipine göre parametre sayısı (sipariş adedi hariç)
const getParamCount = (calcType?: CalculationType): number => {
  switch (calcType) {
    case CalculationType.CustomCost:
      return 0; // CustomCost için parametre yok, direkt totalCost girilir
    case CalculationType.Simple:
    case CalculationType.MeterBased:
      return 1;
    case CalculationType.TwoDimensional:
    case CalculationType.PieceFitting:
    case CalculationType.AreaBased:
    case CalculationType.PaintBased:
      return 2;
    default:
      return 1;
  }
};

// Sipariş adedini otomatik kullanan hesaplama tipleri
const usesOrderQuantity = (calcType?: CalculationType): boolean => {
  return (
    calcType === CalculationType.PieceFitting ||
    calcType === CalculationType.MeterBased ||
    calcType === CalculationType.AreaBased
  );
};

interface WorkshopTransferModalProps {
  isOpen: boolean;
  orderId: string;
  orderQuantity?: number; // Sipariş adedi (order'dan gelen)
  oldWorkshopId: string | null;
  oldWorkshopName: string;
  newWorkshopId: string | null;
  newWorkshopName: string;
  users: User[];
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  onClose: () => void;
  onSave: (
    userId: string,
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
  calculationType?: CalculationType; // Hesaplama tipi
  quantityUsed: number;
  totalCost?: number; // CustomCost için direkt toplam tutar
  quantity2?: number; // İkinci boyut (opsiyonel)
  quantity3?: number; // Üçüncü boyut (opsiyonel, referans)
  unit?: string; // Ana birim adı
  unit2?: string; // İkinci birim adı
  unit3?: string; // Üçüncü birim adı (opsiyonel, referans)
  costUnitId3?: string; // Üçüncü birim ID (opsiyonel, referans)
  // Özel miktar başlıkları
  quantity1Label?: string;
  quantity2Label?: string;
  quantity3Label?: string;
  actualPrice: number;
  currency: string;
  notes: string;
}

const WorkshopTransferModal: React.FC<WorkshopTransferModalProps> = ({
  isOpen,
  orderId,
  orderQuantity,
  oldWorkshopId,
  oldWorkshopName,
  newWorkshopId,
  newWorkshopName,
  users,
  selectedUserId,
  onUserChange,
  onClose,
  onSave,
}) => {
  const [workshopCostItems, setWorkshopCostItems] = useState<
    WorkshopCostItem[]
  >([]);
  const [selectedCosts, setSelectedCosts] = useState<
    Map<string, CostItemInput>
  >(new Map());
  const [completedCosts, setCompletedCosts] = useState<
    Map<string, CostItemInput>
  >(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCostList, setShowCostList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<"user" | "costs">("user");
  const [userListTab, setUserListTab] = useState<"workshop" | "all">(
    "workshop"
  );
  const [editingCostItem, setEditingCostItem] = useState<{
    item: WorkshopCostItem;
    input: CostItemInput | null;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Modal açıldığında step'i sıfırla
      setCurrentStep("user");
      setUserListTab("workshop");
      setSelectedCosts(new Map());
      setCompletedCosts(new Map());
      setEditingCostItem(null);
      setSearchTerm("");
      setSelectedCategory("all");
      setShowCostList(true); // Başlangıçta tüm kalemleri göster
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && oldWorkshopId && currentStep === "costs") {
      loadWorkshopCostItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, oldWorkshopId, currentStep]);

  const loadWorkshopCostItems = async () => {
    if (
      !oldWorkshopId ||
      oldWorkshopId === "null" ||
      oldWorkshopId === "undefined"
    ) {
      setWorkshopCostItems([]);
      return;
    }

    try {
      setLoading(true);
      const items = await costService.getWorkshopCostItems(oldWorkshopId);
      const filteredItems = items
        .filter((item) => {
          // isActive undefined ise true kabul et (API'den gelmiyor)
          const isActiveCheck = item.isActive === undefined || item.isActive;
          // costItemId varlığını kontrol et (her zaman olmalı)
          const hasCostItemId = !!item.costItemId;
          return isActiveCheck && hasCostItemId;
        })
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
      setWorkshopCostItems(filteredItems);
    } catch (error) {
      console.error("❌ Failed to load workshop cost items:", error);
      setWorkshopCostItems([]);
      // Sessizce devam et, kullanıcıyı rahatsız etme
    } finally {
      setLoading(false);
    }
  };

  const handleUserNext = () => {
    if (!selectedUserId) {
      alert("Lütfen bir kullanıcı seçin!");
      return;
    }

    // Eğer "Atanmamış İşler" atölyesinden çıkıyorsa, maliyet girişini atla
    if (oldWorkshopName === "Atanmamış İşler") {
      handleFinalSave();
      return;
    }

    // Diğer durumlarda maliyetler adımına geç
    setCurrentStep("costs");
  };

  const toggleCostItem = (item: WorkshopCostItem, checked: boolean) => {
    if (checked) {
      // Hesaplama tipini al
      const calcType =
        item.calculationType ??
        item.costItem?.calculationType ??
        CalculationType.Simple;
      const paramCount = getParamCount(calcType);
      const needsOrderQty = usesOrderQuantity(calcType);

      // Özel label'ları al
      const qty1Label = item.quantity1Label || item.costItem?.quantity1Label;
      const qty2Label = item.quantity2Label || item.costItem?.quantity2Label;

      const newCostInput: CostItemInput = {
        costItemId: item.costItemId,
        costItem: item.costItem,
        calculationType: calcType,
        quantityUsed: "" as any, // Başlangıçta boş
        quantity2: paramCount >= 2 ? ("" as any) : undefined,
        quantity3: needsOrderQty ? orderQuantity || 0 : undefined,
        unit: item.unitName || item.unitCode || "Birim",
        unit2: paramCount >= 2 ? item.unitName2 || "Birim 2" : undefined,
        unit3: needsOrderQty ? "Sipariş Adedi" : undefined,
        costUnitId3: item.costUnitId3,
        quantity1Label: qty1Label,
        quantity2Label: qty2Label,
        quantity3Label: needsOrderQty ? "Sipariş Adedi" : undefined,
        actualPrice: item.effectivePrice,
        currency: item.effectiveCurrency || item.standardCurrency || "TRY",
        notes: "",
      };

      // Düzenleme modalını aç
      setEditingCostItem({ item, input: newCostInput });
    } else {
      // Kaldır
      const newSelected = new Map(selectedCosts);
      newSelected.delete(item.costItemId);
      setSelectedCosts(newSelected);
      if (editingCostItem?.item.costItemId === item.costItemId) {
        setEditingCostItem(null);
      }
    }
  };

  const handleEditCompletedCost = (costItemId: string) => {
    // Tamamlanmış kalemden verisini al
    const completedItem = completedCosts.get(costItemId);
    if (!completedItem) return;

    // İlgili WorkshopCostItem'ı bul
    const workshopItem = workshopCostItems.find(
      (item) => item.costItemId === costItemId
    );
    if (!workshopItem) return;

    // Düzenleme modalını aç
    setEditingCostItem({ item: workshopItem, input: completedItem });
  };

  const handleSaveCostItemInput = () => {
    if (!editingCostItem || !editingCostItem.input) return;

    const input = editingCostItem.input;

    // CustomCost için özel validasyon
    if (input.calculationType === CalculationType.CustomCost) {
      if (!input.totalCost || input.totalCost <= 0) {
        alert("Toplam tutar sıfırdan büyük olmalıdır!");
        return;
      }
    } else {
      // Diğer hesaplama tipleri için mevcut validasyon
      if (input.quantityUsed < 0) {
        alert("Miktar sıfırdan küçük olamaz!");
        return;
      }

      const paramCount = getParamCount(input.calculationType);
      if (
        paramCount >= 2 &&
        (input.quantity2 === undefined || input.quantity2 < 0)
      ) {
        alert(`${input.unit2 || "İkinci birim"} miktarı girmeniz gerekiyor!`);
        return;
      }

      if (
        input.unit3 &&
        (input.quantity3 === undefined || input.quantity3 < 0)
      ) {
        alert(`${input.unit3} miktarı girmeniz gerekiyor!`);
        return;
      }
    }

    // Tamamlanmışlara ekle
    const newCompleted = new Map(completedCosts);
    newCompleted.set(editingCostItem.item.costItemId, input);
    setCompletedCosts(newCompleted);

    console.log("✅ Cost item saved to completedCosts:", {
      costItemId: editingCostItem.item.costItemId,
      input: input,
    });

    // Modalı kapat
    setEditingCostItem(null);
  };

  const handleCancelCostItemInput = () => {
    setEditingCostItem(null);
  };

  const updateEditingCostItemInput = (
    field: keyof CostItemInput,
    value: any
  ) => {
    if (!editingCostItem || !editingCostItem.input) return;

    setEditingCostItem({
      ...editingCostItem,
      input: { ...editingCostItem.input, [field]: value },
    });
  };

  const handleFinalSave = async () => {
    if (!selectedUserId) {
      alert("Lütfen bir kullanıcı seçin!");
      return;
    }

    // Eğer şu anda düzenlenen bir kalem varsa uyar
    if (editingCostItem) {
      alert("Lütfen mevcut kalemi tamamlayın veya kaldırın!");
      return;
    }

    // Maliyet girişi opsiyonel - zorunlu değil

    // Onay mesajı
    const selectedUser = users.find((u) => u.userId === selectedUserId);
    const userFullName = selectedUser
      ? `${selectedUser.firstName} ${selectedUser.lastName}`
      : "Seçili kullanıcı";
    const costCount = completedCosts.size;
    const confirmMessage = oldWorkshopId
      ? `${oldWorkshopName} atölyesinden ${newWorkshopName} atölyesine transfer edilecek.\n\nKullanıcı: ${userFullName}\nMaliyet Kalemi: ${costCount} adet\n\nOnaylıyor musunuz?`
      : `${newWorkshopName} atölyesine atama yapılacak.\n\nKullanıcı: ${userFullName}\n\nOnaylıyor musunuz?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setSaving(true);

      const costsToSave = Array.from(completedCosts.values()).map((input) => {
        // CustomCost tipinde totalCost direkt kullanılır
        const isCustomCost =
          input.calculationType === CalculationType.CustomCost;

        console.log("🔍 Input data:", {
          costItemId: input.costItemId,
          calculationType: input.calculationType,
          isCustomCost,
          totalCost: input.totalCost,
          quantityUsed: input.quantityUsed,
          actualPrice: input.actualPrice,
        });

        const costData = {
          orderId,
          workshopId: oldWorkshopId || "",
          costItemId: input.costItemId,
          quantityUsed: isCustomCost ? 0 : input.quantityUsed, // CustomCost'ta quantity kullanılmaz
          quantity2: isCustomCost ? undefined : input.quantity2,
          quantity3: isCustomCost ? undefined : input.quantity3,
          unit: input.unit || "Birim",
          unit2: isCustomCost ? undefined : input.unit2,
          unit3: isCustomCost ? undefined : input.unit3,
          costUnitId3: isCustomCost ? undefined : input.costUnitId3,
          actualPrice: isCustomCost ? 0 : input.actualPrice, // CustomCost'ta birim fiyat kullanılmaz
          currency: input.currency,
          totalCost: isCustomCost
            ? input.totalCost || 0
            : input.quantityUsed * (input.quantity2 || 1) * input.actualPrice,
          notes: input.notes.trim() || undefined,
          isActive: true,
        };

        console.log("📤 Cost data to save:", costData);

        return costData;
      });

      await onSave(selectedUserId, costsToSave);

      // Başarılı, state'i temizle
      setSelectedCosts(new Map());
      setCompletedCosts(new Map());
      setEditingCostItem(null);
      setCurrentStep("user");
    } catch (error: any) {
      console.error("❌ Failed to save:", error);
      alert(error.message || "İşlem başarısız oldu!");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep("user");
  };

  if (!isOpen) return null;

  return (
    <div className="workshop-transfer-modal-overlay">
      <div
        className="workshop-transfer-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workshop-transfer-modal-header">
          <div>
            <h2>
              {currentStep === "user"
                ? "🏭 Atölye Transferi"
                : "💰 Atölye Maliyetleri"}
            </h2>
            <p className="workshop-transfer-info">
              {oldWorkshopName} → {newWorkshopName}
            </p>
          </div>
          <button className="close-button" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <div className="workshop-transfer-modal-body">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div
              className={`step ${
                currentStep === "user" ? "active" : "completed"
              }`}
            >
              <div className="step-number">1</div>
              <span>Kullanıcı Seçimi</span>
            </div>
            {oldWorkshopId && (
              <>
                <div className="step-line"></div>
                <div
                  className={`step ${currentStep === "costs" ? "active" : ""}`}
                >
                  <div className="step-number">2</div>
                  <span>Maliyet Girişi</span>
                </div>
              </>
            )}
          </div>

          {/* Step 1: User Selection */}
          {currentStep === "user" && (
            <div className="operator-selection">
              <h3>
                Kullanıcı Seçin: <span style={{ color: "#d32f2f" }}>*</span>
              </h3>

              {/* Tab Buttons */}
              <div
                className="user-list-tabs"
                style={{ display: "flex", gap: "10px", marginBottom: "15px" }}
              >
                <button
                  type="button"
                  onClick={() => setUserListTab("workshop")}
                  style={{
                    flex: 1,
                    padding: "10px 15px",
                    border: "2px solid",
                    borderColor:
                      userListTab === "workshop" ? "#2196F3" : "#ddd",
                    backgroundColor:
                      userListTab === "workshop" ? "#e3f2fd" : "white",
                    color: userListTab === "workshop" ? "#2196F3" : "#666",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: userListTab === "workshop" ? "600" : "normal",
                    transition: "all 0.2s",
                  }}
                >
                  Atölyedeki Kullanıcılar (
                  {users.filter((u) => u.workshopId === oldWorkshopId).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserListTab("all")}
                  style={{
                    flex: 1,
                    padding: "10px 15px",
                    border: "2px solid",
                    borderColor: userListTab === "all" ? "#2196F3" : "#ddd",
                    backgroundColor:
                      userListTab === "all" ? "#e3f2fd" : "white",
                    color: userListTab === "all" ? "#2196F3" : "#666",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: userListTab === "all" ? "600" : "normal",
                    transition: "all 0.2s",
                  }}
                >
                  Tüm Kullanıcılar ({users.length})
                </button>
              </div>

              {/* User List */}
              <div className="operators-grid">
                {(userListTab === "workshop"
                  ? users.filter((u) => u.workshopId === oldWorkshopId)
                  : users
                ).map((user) => (
                  <div
                    key={user.userId}
                    className={`operator-card ${
                      selectedUserId === user.userId ? "selected" : ""
                    }`}
                    onClick={() => onUserChange(user.userId)}
                  >
                    <div className="operator-avatar">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>
                    <div className="operator-info">
                      <strong>
                        {user.firstName} {user.lastName}
                      </strong>
                      <span className="specialization">{user.role}</span>
                    </div>
                    {selectedUserId === user.userId && (
                      <div className="check-icon">✓</div>
                    )}
                  </div>
                ))}
                {(userListTab === "workshop"
                  ? users.filter((u) => u.workshopId === oldWorkshopId).length
                  : users.length) === 0 && (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                    }}
                  >
                    {userListTab === "workshop"
                      ? "Bu atölyede henüz kullanıcı bulunmuyor."
                      : "Sistemde kayıtlı kullanıcı bulunmuyor."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Cost Entry */}
          {currentStep === "costs" && (
            <div className="cost-entry">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Maliyet kalemleri yükleniyor...</p>
                </div>
              ) : workshopCostItems.length === 0 ? (
                <div className="empty-state">
                  <p>Bu atölye için kayıtlı maliyet kalemi bulunmuyor.</p>
                  <small>Maliyet girmeden devam edebilirsiniz.</small>
                </div>
              ) : (
                <>
                  <div className="instruction-text">
                    <p>
                      <strong>{oldWorkshopName}</strong> atölyesinde kullanılan
                      maliyet kalemlerini seçin:
                    </p>
                  </div>
                  {/* Filtreleme Araçları */}
                  <div
                    className="cost-filters"
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "20px",
                      padding: "16px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="🔍 Maliyet kalemi ara..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (e.target.value) setShowCostList(true);
                        }}
                        onFocus={() => setShowCostList(true)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #e0e0e0",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setShowCostList(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #e0e0e0",
                          borderRadius: "6px",
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        <option value="all">📁 Tüm Kategoriler</option>
                        {Array.from(
                          new Set(
                            workshopCostItems
                              .map((item) => item.categoryName)
                              .filter(Boolean)
                          )
                        )
                          .sort()
                          .map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  {/* Tamamlanan Maliyetler */}
                  {completedCosts.size > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "16px",
                        padding: "12px",
                        background: "#f0fff4",
                        borderRadius: "8px",
                        border: "2px solid #4caf50",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#4caf50",
                          marginBottom: "4px",
                        }}
                      >
                        ✓ Tamamlanan Maliyetler ({completedCosts.size})
                      </div>
                      {Array.from(completedCosts.entries()).map(
                        ([costItemId, costInput]) => {
                          const item = workshopCostItems.find(
                            (i) => i.costItemId === costItemId
                          );
                          if (!item) return null;

                          return (
                            <div
                              key={costItemId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                background: "white",
                                border: "2px solid #4caf50",
                                borderRadius: "20px",
                                fontSize: "13px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onClick={() =>
                                handleEditCompletedCost(costItemId)
                              }
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f0fff4";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                              }}
                            >
                              <span
                                style={{ color: "#4caf50", fontSize: "14px" }}
                              >
                                ✓
                              </span>
                              <span
                                style={{ fontWeight: "500", color: "#333" }}
                              >
                                {item.costItemName}
                              </span>
                              <span style={{ color: "#666", fontSize: "12px" }}>
                                {costInput.calculationType ===
                                CalculationType.CustomCost
                                  ? `(${formatNumber(
                                      costInput.totalCost || 0
                                    )} ${costInput.currency})`
                                  : `(${costInput.quantityUsed}${
                                      costInput.quantity2
                                        ? ` × ${costInput.quantity2}`
                                        : ""
                                    })`}
                              </span>
                              <span
                                style={{
                                  color: "#4caf50",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                📝 Düzenle
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                  {/* Filtrelenmiş Sonuç Sayısı */}
                  {(searchTerm || selectedCategory !== "all") && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#e3f2fd",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#1976d2",
                        marginBottom: "12px",
                      }}
                    >
                      {
                        workshopCostItems.filter((item) => {
                          const matchesSearch =
                            !searchTerm ||
                            item.costItemName
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase());
                          const matchesCategory =
                            selectedCategory === "all" ||
                            item.categoryName === selectedCategory;
                          return matchesSearch && matchesCategory;
                        }).length
                      }{" "}
                      sonuç bulundu
                    </div>
                  )}{" "}
                  {/* Maliyet Kalemi Listesi */}
                  <div
                    style={{
                      minHeight: "400px",
                    }}
                  >
                    {/* Maliyet Listesi */}
                    <div
                      style={{
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        padding: "12px",
                        overflowY: "auto",
                        maxHeight: "500px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          marginBottom: "12px",
                          color: "#666",
                        }}
                      >
                        Maliyet Kalemleri
                      </div>
                      {!showCostList ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "60px 20px",
                            color: "#999",
                          }}
                        >
                          <div
                            style={{ fontSize: "48px", marginBottom: "16px" }}
                          >
                            🔍
                          </div>
                          <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                            Maliyet kalemi aramak için
                            <br />
                            yukarıdaki arama kutusunu
                            <br />
                            veya kategori filtresini kullanın
                          </div>
                        </div>
                      ) : (
                        workshopCostItems
                          .filter((item) => {
                            const matchesSearch =
                              !searchTerm ||
                              item.costItemName
                                ?.toLowerCase()
                                .includes(searchTerm.toLowerCase());
                            const matchesCategory =
                              selectedCategory === "all" ||
                              item.categoryName === selectedCategory;
                            return matchesSearch && matchesCategory;
                          })
                          .map((item) => {
                            const isSelected = selectedCosts.has(
                              item.costItemId
                            );
                            const isCompleted = completedCosts.has(
                              item.costItemId
                            );

                            // Tamamlanmış kalemleri listede gösterme, yukarıda gösteriliyor
                            if (isCompleted) return null;

                            return (
                              <div
                                key={item.workshopCostItemId}
                                style={{
                                  padding: "10px",
                                  marginBottom: "8px",
                                  border: `2px solid ${
                                    isCompleted
                                      ? "#4caf50"
                                      : isSelected
                                      ? "#667eea"
                                      : "#e0e0e0"
                                  }`,
                                  borderRadius: "6px",
                                  background: isSelected ? "#f0f4ff" : "white",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onClick={() => {
                                  toggleCostItem(item, !isSelected);
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleCostItem(item, e.target.checked);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {item.costItemName}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#666",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {item.categoryName}
                                      {item.isPreferred && " ⭐"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="workshop-transfer-modal-footer">
          {currentStep === "user" ? (
            <>
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                İptal
              </button>
              <button
                type="button"
                className="next-button"
                onClick={handleUserNext}
                disabled={!selectedUserId || saving}
              >
                {oldWorkshopName === "Atanmamış İşler"
                  ? "Kaydet"
                  : oldWorkshopId
                  ? "İleri →"
                  : "Kaydet"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="back-button"
                onClick={handleBack}
                disabled={saving}
              >
                ← Geri
              </button>
              <button
                type="button"
                className="save-button"
                onClick={handleFinalSave}
                disabled={
                  saving || (completedCosts.size === 0 && !editingCostItem)
                }
              >
                {saving
                  ? "Kaydediliyor..."
                  : completedCosts.size > 0
                  ? `${completedCosts.size} Kalemi Kaydet`
                  : "Kaydet"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Maliyet Kalemi Düzenleme Modalı */}
      {editingCostItem && (
        <div
          className="cost-item-input-modal-overlay"
          onClick={handleCancelCostItemInput}
        >
          <div
            className="cost-item-input-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cost-item-input-modal-header">
              <h3>{editingCostItem.item.costItemName}</h3>
              <button
                className="cost-item-input-modal-close"
                onClick={handleCancelCostItemInput}
                title="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="cost-item-input-modal-body">
              {/* CustomCost için Toplam Tutar */}
              {editingCostItem.input?.calculationType ===
              CalculationType.CustomCost ? (
                <>
                  <div className="cost-input-field">
                    <div
                      style={{
                        background: "#fff3cd",
                        border: "2px solid #ffc107",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="#ff9800"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <strong style={{ color: "#856404" }}>
                          Özel Maliyet (Fason/Sabit Tutar)
                        </strong>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "#856404",
                        }}
                      >
                        Bu hesaplama tipinde toplam maliyet tutarı direkt
                        girilir. Miktar ve birim fiyat kullanılmaz.
                      </p>
                    </div>
                    <label>
                      Toplam Tutar ({editingCostItem.input?.currency || "TRY"})
                      <span className="required-star">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingCostItem.input?.totalCost ?? ""}
                      onChange={(e) =>
                        updateEditingCostItemInput(
                          "totalCost",
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      placeholder="Toplam maliyet tutarını girin"
                      required
                      autoFocus
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Ana Miktar */}
                  <div className="cost-input-field">
                    <label>
                      {editingCostItem.input?.quantity1Label || "Miktar"} (
                      {editingCostItem.item.unitName ||
                        editingCostItem.item.unitCode ||
                        "Birim"}
                      )<span className="required-star">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingCostItem.input?.quantityUsed ?? ""}
                      onChange={(e) =>
                        updateEditingCostItemInput(
                          "quantityUsed",
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      placeholder="Miktar girin"
                      required
                      autoFocus
                    />
                  </div>

                  {/* İkinci Boyut */}
                  {editingCostItem.input?.unit2 && (
                    <div className="cost-input-field">
                      <label>
                        {editingCostItem.input?.quantity2Label ||
                          editingCostItem.input?.unit2}
                        <span className="required-star">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingCostItem.input?.quantity2 ?? ""}
                        onChange={(e) =>
                          updateEditingCostItemInput(
                            "quantity2",
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        placeholder="Miktar girin"
                        required
                      />
                      <div className="cost-total-info">
                        Toplam:{" "}
                        {formatNumber(
                          (editingCostItem.input?.quantityUsed || 0) *
                            (editingCostItem.input?.quantity2 || 1)
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Not */}
              <div className="cost-input-field">
                <label>Not (Opsiyonel)</label>
                <textarea
                  value={editingCostItem.input?.notes || ""}
                  onChange={(e) =>
                    updateEditingCostItemInput("notes", e.target.value)
                  }
                  placeholder="Ek bilgi..."
                  rows={3}
                />
              </div>
            </div>

            <div className="cost-item-input-modal-footer">
              <button
                type="button"
                className="cost-cancel-button"
                onClick={handleCancelCostItemInput}
              >
                İptal
              </button>
              <button
                type="button"
                className="cost-save-button"
                onClick={handleSaveCostItemInput}
                disabled={
                  editingCostItem.input?.calculationType ===
                  CalculationType.CustomCost
                    ? !(
                        editingCostItem.input?.totalCost &&
                        editingCostItem.input.totalCost > 0
                      )
                    : !(
                        editingCostItem.input?.quantityUsed &&
                        editingCostItem.input.quantityUsed > 0
                      ) ||
                      (!!editingCostItem.input?.unit2 &&
                        !(
                          editingCostItem.input?.quantity2 &&
                          editingCostItem.input.quantity2 > 0
                        ))
                }
              >
                ✓ Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopTransferModal;
