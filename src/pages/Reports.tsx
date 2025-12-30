import React, { useState, useEffect } from "react";
import {
  costService,
  modelService,
  firmService,
  orderService,
} from "../services/dataService";
import { ModelCost, Model, Firm, OrderStatus, Technic } from "../types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import TechnicModal from "../components/TechnicModal";
import { useExchangeRates } from "../context/ExchangeRateContext";
import "./Reports.css";

interface ModelCostReport {
  modelId: string;
  modelCode: string;
  modelName: string;
  firmCode: string;
  firmName: string;
  quantity: number;
  technics: string[];
  totalAmount: number; // Toplam tutar (sipariş tutarı) - TL
  totalCost: number; // Maliyet - TL
  costWithOverhead: number; // Genel gider eklenmiş maliyet - TL
  finalCostWithProfit: number; // Kar marjı eklenmiş nihai maliyet - TL
  unitPrice: number; // Birim fiyat (orijinal döviz)
  unitPriceTRY: number; // Birim fiyat - TL
  unitCost: number; // Birim maliyet - TL
  suggestedPrice: number; // Hesaplanan Fiyat (kar marjı dahil) - TL
  currency: string;
  orderId: string;
  acceptanceDate: string; // Kabul tarihi
  completionDate: string; // Tamamlanma tarihi
}

interface CostDetailModal {
  isOpen: boolean;
  orderId: string;
  modelId: string;
  modelCode: string;
  firmCode: string;
  firmName: string;
  quantity: number;
  costs: ModelCost[];
  loading: boolean;
}

const Reports: React.FC = () => {
  const { usdRate, eurRate, gbpRate } = useExchangeRates();
  const [reportData, setReportData] = useState<ModelCostReport[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("all");
  const [selectedModelId, setSelectedModelId] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("firmCode");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [firmSearch, setFirmSearch] = useState<string>("");
  const [modelSearch, setModelSearch] = useState<string>("");
  const [firmDropdownOpen, setFirmDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedTechnics, setExpandedTechnics] = useState<Set<string>>(
    new Set()
  );
  const [selectedTechnics, setSelectedTechnics] = useState<Technic[]>([]);
  const [showTechnicModal, setShowTechnicModal] = useState(false);
  const [costDetailModal, setCostDetailModal] = useState<CostDetailModal>({
    isOpen: false,
    orderId: "",
    modelId: "",
    modelCode: "",
    firmCode: "",
    firmName: "",
    quantity: 0,
    costs: [],
    loading: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".searchable-select")) {
        setFirmDropdownOpen(false);
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [modelsData, firmsData, ordersData] = await Promise.all([
        modelService.getAll(),
        firmService.getFirms(),
        orderService.getAll(),
      ]);

      setModels(modelsData);
      setFirms(firmsData);

      // Döviz dönüşüm fonksiyonu (güncel kurlarla) - kur yoksa 0 döner
      const toTRY = (amount: number, currency: string): number => {
        if (currency === "TRY" || currency === "TL") return amount;
        if (currency === "USD" && usdRate) return amount * usdRate;
        if (currency === "EUR" && eurRate) return amount * eurRate;
        if (currency === "GBP" && gbpRate) return amount * gbpRate;
        return 0; // Kur yoksa dönüşüm yapılamaz
      };

      // Her model için maliyet verilerini yükle
      const reportItems: ModelCostReport[] = [];

      // Sadece tamamlanan siparişleri filtrele
      const completedOrders = ordersData.filter(
        (order) => order.status === OrderStatus.Tamamlandi
      );

      for (const order of completedOrders) {
        if (!order.modelId || !order.firmId) continue;

        try {
          const modelCosts = await costService.getModelCosts(order.modelId);
          const orderCosts = modelCosts.filter(
            (c) => c.orderId === order.orderId
          );

          // Maliyetleri TL'ye çevir ve topla
          const totalCost = orderCosts.reduce((sum, cost) => {
            const amount = cost.totalCost || 0;
            const currency = cost.currency || "TRY";
            return sum + toTRY(amount, currency);
          }, 0);

          // Backend'den gelen costWithOverhead ve finalCostWithProfit değerlerini topla
          const costWithOverhead = orderCosts.reduce((sum, cost) => {
            const amount = cost.costWithOverhead || 0;
            const currency = cost.currency || "TRY";
            return sum + toTRY(amount, currency);
          }, 0);

          const finalCostWithProfit = orderCosts.reduce((sum, cost) => {
            const amount = cost.finalCostWithProfit || 0;
            const currency = cost.currency || "TRY";
            return sum + toTRY(amount, currency);
          }, 0);

          const model = modelsData.find((m) => m.modelId === order.modelId);
          const firm = firmsData.find((f) => f.firmId === order.firmId);

          // Siparişin tekniklerini al
          const technics =
            order.orderTechnics?.map((t) => t.technic?.name || "") || [];

          // Birim fiyat ve toplam tutar
          const orderPrice = order.price || 0;
          const orderCurrency = order.priceCurrency || order.currency || "TRY";
          const unitPriceTRY = toTRY(orderPrice, orderCurrency);
          const totalAmountTRY = unitPriceTRY * (order.quantity || 1);

          reportItems.push({
            modelId: order.modelId,
            modelCode: model?.modelCode || "-",
            modelName: model?.modelName || "-",
            firmCode: firm?.firmCode || "-",
            firmName: firm?.firmName || "-",
            quantity: order.quantity || 0,
            technics: technics.filter((t) => t),
            totalAmount: totalAmountTRY,
            totalCost: totalCost,
            costWithOverhead: costWithOverhead,
            finalCostWithProfit: finalCostWithProfit,
            unitPrice: orderPrice,
            unitPriceTRY: unitPriceTRY,
            unitCost:
              order.quantity > 0 ? costWithOverhead / order.quantity : 0,
            suggestedPrice:
              order.quantity > 0 ? finalCostWithProfit / order.quantity : 0,
            currency: orderCurrency,
            orderId: order.orderId,
            acceptanceDate: order.acceptanceDate,
            completionDate: order.completionDate || order.updatedAt || "",
          });
        } catch (error) {
          console.warn(`Model ${order.modelId} için maliyet yüklenemedi`);
        }
      }

      setReportData(reportItems);
    } catch (error) {
      console.error("❌ Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme
  const getFilteredData = (): ModelCostReport[] => {
    let filtered = [...reportData];

    if (selectedFirmId !== "all") {
      filtered = filtered.filter(
        (r) =>
          firms.find((f) => f.firmId === selectedFirmId)?.firmName ===
          r.firmName
      );
    }

    if (selectedModelId !== "all") {
      filtered = filtered.filter((r) => r.modelId === selectedModelId);
    }

    // Teknik filtresi - Seçilen tekniklerle birebir eşleşen siparişler
    if (selectedTechnics.length > 0) {
      const selectedTechnicNames = selectedTechnics.map((t) => t.name);
      filtered = filtered.filter((r) => {
        // Sipariş tekniklerini al
        const orderTechnics = r.technics;

        // Birebir eşleşme kontrolü: Aynı sayıda ve aynı teknikler olmalı
        if (orderTechnics.length !== selectedTechnicNames.length) {
          return false;
        }

        // Her seçili teknik sipariş tekniklerinde olmalı
        const allSelected = selectedTechnicNames.every((techName) =>
          orderTechnics.includes(techName)
        );

        // Her sipariş tekniği seçili tekniklerde olmalı
        const allOrder = orderTechnics.every((techName) =>
          selectedTechnicNames.includes(techName)
        );

        return allSelected && allOrder;
      });
    }

    // Tarih filtresi - Tamamlanma tarihine göre
    if (startDate || endDate) {
    }

    if (startDate) {
      filtered = filtered.filter((r) => {
        if (!r.completionDate) {
          return false;
        }
        // Sadece tarih kısmını karşılaştır (saat dilimi sorunlarını önle)
        const completionDateStr = r.completionDate.split("T")[0];
        const result = completionDateStr >= startDate;
        return result;
      });
    }

    if (endDate) {
      filtered = filtered.filter((r) => {
        if (!r.completionDate) return false;
        // Sadece tarih kısmını karşılaştır (saat dilimi sorunlarını önle)
        const completionDateStr = r.completionDate.split("T")[0];
        return completionDateStr <= endDate;
      });
    }

    if (startDate || endDate) {
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof ModelCostReport];
      let bVal: any = b[sortField as keyof ModelCostReport];

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Detay modalını aç
  const openCostDetail = async (row: ModelCostReport) => {
    setCostDetailModal({
      isOpen: true,
      orderId: row.orderId,
      modelId: row.modelId,
      modelCode: row.modelCode,
      firmCode: row.firmCode,
      firmName: row.firmName,
      quantity: row.quantity,
      costs: [],
      loading: true,
    });

    try {
      // Siparişe özel model maliyetlerini al
      const modelCosts = await costService.getOrderModelCosts(
        row.orderId,
        row.modelId
      );

      // Sipariş atölye maliyetlerini al
      let orderWorkshopCosts: any[] = [];
      try {
        orderWorkshopCosts = await costService.getOrderWorkshopCosts(
          row.orderId
        );
      } catch (e) {}

      // OrderWorkshopCost'ları ModelCost formatına dönüştür
      const workshopCostsAsModelCost: ModelCost[] = orderWorkshopCosts.map(
        (owc) => ({
          modelCostId: owc.orderWorkshopCostId,
          modelId: row.modelId,
          orderId: row.orderId,
          costItemId: owc.costItemId,
          costItemName: owc.costItem?.itemName || "-",
          costCategoryId: owc.costItem?.costCategoryId || "",
          costCategoryName:
            owc.costItem?.costCategory?.categoryName || "Atölye Maliyeti",
          quantity: owc.quantityUsed,
          quantity2: owc.quantity2,
          unit: owc.unit || "",
          unit2: owc.unit2,
          unitPrice: owc.actualPrice,
          totalCost: owc.totalCost,
          currency: owc.currency || "TRY",
          wastagePercentage: owc.wastagePercentage,
          isActive: owc.isActive,
          usage: owc.workshop?.name || "Atölye",
          order: owc.order,
        })
      );

      // İki listeyi birleştir
      const allCosts = [...modelCosts, ...workshopCostsAsModelCost];

      console.log("📊 Model Costs (Order filtered):", modelCosts);
      setCostDetailModal((prev) => ({
        ...prev,
        costs: allCosts,
        loading: false,
      }));
    } catch (error) {
      console.error("❌ Maliyet detayları yüklenemedi:", error);
      setCostDetailModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const closeCostDetail = () => {
    setCostDetailModal({
      isOpen: false,
      orderId: "",
      modelId: "",
      modelCode: "",
      firmCode: "",
      firmName: "",
      quantity: 0,
      costs: [],
      loading: false,
    });
  };

  // Maliyet detaylarında TL dönüşümü
  const convertCostToTRY = (cost: ModelCost): number => {
    const amount = cost.totalCost || 0;
    const currency = cost.currency || "TRY";
    if (currency === "TRY" || currency === "TL") return amount;
    if (currency === "USD" && cost.usdRate) return amount * cost.usdRate;
    if (currency === "EUR" && cost.eurRate) return amount * cost.eurRate;
    if (currency === "GBP" && cost.gbpRate) return amount * cost.gbpRate;
    return 0;
  };

  // costWithOverhead değerini TL'ye çevir
  const convertCostWithOverheadToTRY = (cost: ModelCost): number => {
    const amount = cost.costWithOverhead || 0;
    const currency = cost.currency || "TRY";
    if (currency === "TRY" || currency === "TL") return amount;
    if (currency === "USD" && cost.usdRate) return amount * cost.usdRate;
    if (currency === "EUR" && cost.eurRate) return amount * cost.eurRate;
    if (currency === "GBP" && cost.gbpRate) return amount * cost.gbpRate;
    return 0;
  };

  // finalCostWithProfit değerini TL'ye çevir
  const convertFinalCostToTRY = (cost: ModelCost): number => {
    const amount = cost.finalCostWithProfit || 0;
    const currency = cost.currency || "TRY";
    if (currency === "TRY" || currency === "TL") return amount;
    if (currency === "USD" && cost.usdRate) return amount * cost.usdRate;
    if (currency === "EUR" && cost.eurRate) return amount * cost.eurRate;
    if (currency === "GBP" && cost.gbpRate) return amount * cost.gbpRate;
    return 0;
  };

  // Teknik seçimi handler
  const handleTechnicSelect = (technic: Technic) => {
    const isAlreadySelected = selectedTechnics.some(
      (t) => t.technicId === technic.technicId
    );

    if (isAlreadySelected) {
      // Zaten seçiliyse kaldır
      setSelectedTechnics(
        selectedTechnics.filter((t) => t.technicId !== technic.technicId)
      );
    } else {
      // Seçili değilse ekle
      setSelectedTechnics([...selectedTechnics, technic]);
    }
  };

  const handleClearTechnics = () => {
    setSelectedTechnics([]);
  };

  // Toplamlar
  const filteredData = getFilteredData();
  const totalQuantity = filteredData.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = filteredData.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCost = filteredData.reduce((sum, r) => sum + r.totalCost, 0);
  const totalCostWithOverhead = filteredData.reduce(
    (sum, r) => sum + r.costWithOverhead,
    0
  );
  const totalFinalCost = filteredData.reduce(
    (sum, r) => sum + r.finalCostWithProfit,
    0
  );

  if (loading) {
    return <PageLoader message="Rapor yükleniyor..." />;
  }

  return (
    <div className="reports-container">
      {/* Filtreler */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>Firma</label>
          <div className="searchable-select">
            <div
              className="select-header"
              onClick={() => setFirmDropdownOpen(!firmDropdownOpen)}
            >
              <span>
                {selectedFirmId === "all"
                  ? "Tüm Firmalar"
                  : firms.find((f) => f.firmId === selectedFirmId)?.firmName ||
                    "Seçiniz"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
            {firmDropdownOpen && (
              <div className="select-dropdown">
                <input
                  type="text"
                  placeholder="Firma ara..."
                  value={firmSearch}
                  onChange={(e) => setFirmSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className="select-options">
                  <div
                    className={`select-option ${
                      selectedFirmId === "all" ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedFirmId("all");
                      setFirmDropdownOpen(false);
                      setFirmSearch("");
                    }}
                  >
                    Tüm Firmalar
                  </div>
                  {firms
                    .filter(
                      (f) =>
                        f.firmCode
                          .toLowerCase()
                          .includes(firmSearch.toLowerCase()) ||
                        f.firmName
                          .toLowerCase()
                          .includes(firmSearch.toLowerCase())
                    )
                    .sort((a, b) => a.firmName.localeCompare(b.firmName))
                    .map((firm) => (
                      <div
                        key={firm.firmId}
                        className={`select-option ${
                          selectedFirmId === firm.firmId ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedFirmId(firm.firmId);
                          setFirmDropdownOpen(false);
                          setFirmSearch("");
                        }}
                      >
                        {firm.firmName}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <label>Model</label>
          <div className="searchable-select">
            <div
              className="select-header"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            >
              <span>
                {selectedModelId === "all"
                  ? "Tüm Modeller"
                  : models.find((m) => m.modelId === selectedModelId)
                      ?.modelCode || "Seçiniz"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
            {modelDropdownOpen && (
              <div className="select-dropdown">
                <input
                  type="text"
                  placeholder="Model ara..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className="select-options">
                  <div
                    className={`select-option ${
                      selectedModelId === "all" ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedModelId("all");
                      setModelDropdownOpen(false);
                      setModelSearch("");
                    }}
                  >
                    Tüm Modeller
                  </div>
                  {models
                    .filter((m) =>
                      m.modelCode
                        .toLowerCase()
                        .includes(modelSearch.toLowerCase())
                    )
                    .sort((a, b) => a.modelCode.localeCompare(b.modelCode))
                    .map((model) => (
                      <div
                        key={model.modelId}
                        className={`select-option ${
                          selectedModelId === model.modelId ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedModelId(model.modelId);
                          setModelDropdownOpen(false);
                          setModelSearch("");
                        }}
                      >
                        {model.modelCode}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <label>Başlangıç Tarihi</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="filter-group">
          <label>Bitiş Tarihi</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>

        {/* Teknik Filtresi */}
        <div className="filter-group">
          <label>Teknikler</label>
          <button
            className="technic-filter-btn"
            onClick={() => setShowTechnicModal(true)}
            style={{
              padding: "8px 16px",
              background: selectedTechnics.length > 0 ? "#667eea" : "white",
              color: selectedTechnics.length > 0 ? "white" : "#333",
              border:
                selectedTechnics.length > 0
                  ? "2px solid #667eea"
                  : "2px solid #e0e0e0",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <span>
              {selectedTechnics.length === 0
                ? "Teknik Seç"
                : `${selectedTechnics.length} Teknik Seçili`}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          {selectedTechnics.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {selectedTechnics.map((tech) => (
                <span
                  key={tech.technicId}
                  style={{
                    padding: "4px 10px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {tech.name}
                  <button
                    onClick={() => handleTechnicSelect(tech)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4338ca",
                      cursor: "pointer",
                      padding: "0",
                      marginLeft: "4px",
                      fontSize: "16px",
                      lineHeight: "1",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {(startDate || endDate) && (
          <button
            className="clear-dates-btn"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Tarihleri Temizle
          </button>
        )}
        <div className="filter-summary">
          <span className="summary-item">
            <strong>{filteredData.length}</strong> Kayıt
          </span>
          <span className="summary-item">
            <strong>{formatNumber(totalQuantity)}</strong> Adet
          </span>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="reports-summary-cards">
        <div className="summary-card">
          <div className="card-icon blue">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className="card-content">
            <span className="card-label">Toplam Tutar</span>
            <span className="card-value">
              {formatCurrency(totalAmount, "TRY")}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon orange">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="card-content">
            <span className="card-label">
              Toplam Maliyet (Genel Gider Dahil)
            </span>
            <span className="card-value">
              {formatCurrency(totalCostWithOverhead, "TRY")}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div
            className="card-icon purple"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="card-content">
            <span className="card-label">Hesaplanan Tutar (Kar Dahil)</span>
            <span className="card-value" style={{ color: "#667eea" }}>
              {formatCurrency(totalFinalCost, "TRY")}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon green">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="card-content">
            <span className="card-label">Kar/Zarar</span>
            <span
              className={`card-value ${
                totalAmount - totalCostWithOverhead >= 0
                  ? "positive"
                  : "negative"
              }`}
            >
              {formatCurrency(totalAmount - totalCostWithOverhead, "TRY")}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div
            className={`card-icon ${
              totalAmount > 0 &&
              ((totalAmount - totalCostWithOverhead) / totalAmount) * 100 >= 0
                ? "green"
                : "red"
            }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div className="card-content">
            <span className="card-label">Kar/Zarar Oranı</span>
            <span
              className={`card-value ${
                totalAmount > 0 &&
                ((totalAmount - totalCostWithOverhead) / totalAmount) * 100 >= 0
                  ? "positive"
                  : "negative"
              }`}
            >
              {totalAmount > 0
                ? `%${(
                    ((totalAmount - totalCostWithOverhead) / totalAmount) *
                    100
                  ).toFixed(2)}`
                : "%0.00"}
            </span>
          </div>
        </div>
      </div>

      {/* Tablo - Desktop */}
      <div className="reports-table-container desktop-only">
        <table className="reports-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("firmName")} className="sortable">
                Firma {getSortIcon("firmName")}
              </th>
              <th onClick={() => handleSort("modelCode")} className="sortable">
                Model Kodu {getSortIcon("modelCode")}
              </th>
              <th onClick={() => handleSort("quantity")} className="sortable">
                Adet {getSortIcon("quantity")}
              </th>
              <th>Teknikler</th>
              <th
                onClick={() => handleSort("totalAmount")}
                className="sortable text-right"
              >
                Toplam Tutar {getSortIcon("totalAmount")}
              </th>
              <th
                onClick={() => handleSort("totalCost")}
                className="sortable text-right"
              >
                Maliyet {getSortIcon("totalCost")}
              </th>
              <th className="text-right" style={{ color: "#667eea" }}>
                Genel Gider (+%40)
              </th>
              <th className="text-right" style={{ color: "#667eea" }}>
                Hesaplanan Tutar
              </th>
              <th
                onClick={() => handleSort("unitPrice")}
                className="sortable text-right"
              >
                Birim Fiyat {getSortIcon("unitPrice")}
              </th>
              <th
                onClick={() => handleSort("unitCost")}
                className="sortable text-right"
              >
                Birim Maliyet {getSortIcon("unitCost")}
              </th>
              <th
                onClick={() => handleSort("suggestedPrice")}
                className="sortable text-right"
              >
                Hesaplanan Fiyat {getSortIcon("suggestedPrice")}
              </th>
              <th className="text-right">Kar/Zarar</th>
              <th className="text-center">Detay</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-row">
                  Gösterilecek veri bulunamadı
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr key={`${row.orderId}-${index}`}>
                  <td>
                    <span className="firm-code">{row.firmName}</span>
                  </td>
                  <td>
                    <span className="model-code">{row.modelCode}</span>
                  </td>
                  <td className="text-center">
                    <span className="quantity-badge">
                      {formatNumber(row.quantity)}
                    </span>
                  </td>
                  <td>
                    {row.technics.length > 0 ? (
                      row.technics.length <= 3 ? (
                        <div className="technics-list">
                          {row.technics.map((t, i) => (
                            <span key={i} className="technic-tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="technics-expandable">
                          {expandedTechnics.has(row.orderId) ? (
                            <>
                              <div className="technics-list">
                                {row.technics.map((t, i) => (
                                  <span key={i} className="technic-tag">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <button
                                className="technics-toggle"
                                onClick={() => {
                                  const newSet = new Set(expandedTechnics);
                                  newSet.delete(row.orderId);
                                  setExpandedTechnics(newSet);
                                }}
                              >
                                Gizle ▲
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="technics-list">
                                {row.technics.slice(0, 2).map((t, i) => (
                                  <span key={i} className="technic-tag">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <button
                                className="technics-toggle"
                                onClick={() => {
                                  const newSet = new Set(expandedTechnics);
                                  newSet.add(row.orderId);
                                  setExpandedTechnics(newSet);
                                }}
                              >
                                +{row.technics.length - 2} daha ▼
                              </button>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="no-technic">-</span>
                    )}
                  </td>
                  <td className="text-right">
                    <span className="amount">
                      {formatCurrency(row.totalAmount, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="cost">
                      {formatCurrency(row.totalCost, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className="cost"
                      style={{ color: "#667eea", fontWeight: "600" }}
                    >
                      {formatCurrency(row.costWithOverhead, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className="cost"
                      style={{ color: "#667eea", fontWeight: "600" }}
                    >
                      {formatCurrency(row.finalCostWithProfit, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="price-with-currency">
                      <span className="unit-price">
                        {formatCurrency(row.unitPrice, row.currency)}
                      </span>
                      {row.currency !== "TRY" && row.currency !== "TL" && (
                        <span className="price-try">
                          ≈ {formatCurrency(row.unitPriceTRY, "TRY")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="unit-cost">
                      {formatCurrency(row.unitCost, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="suggested-price">
                      {formatCurrency(row.suggestedPrice, "TRY")}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className={`profit-loss ${
                        row.totalAmount - row.costWithOverhead >= 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {formatCurrency(
                        row.totalAmount - row.costWithOverhead,
                        "TRY"
                      )}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="detail-btn"
                      onClick={() => openCostDetail(row)}
                      title="Maliyet Detayları"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Detay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredData.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>TOPLAM</strong>
                </td>
                <td className="text-center">
                  <strong>{formatNumber(totalQuantity)}</strong>
                </td>
                <td></td>
                <td className="text-right">
                  <strong>{formatCurrency(totalAmount, "TRY")}</strong>
                </td>
                <td className="text-right">
                  <strong>{formatCurrency(totalCost, "TRY")}</strong>
                </td>
                <td className="text-right">
                  <strong>
                    {formatCurrency(totalCostWithOverhead, "TRY")}
                  </strong>
                </td>
                <td className="text-right">
                  <strong>{formatCurrency(totalFinalCost, "TRY")}</strong>
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right">
                  <strong
                    className={
                      totalAmount - totalCostWithOverhead >= 0
                        ? "positive"
                        : "negative"
                    }
                  >
                    {formatCurrency(totalAmount - totalCostWithOverhead, "TRY")}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobil Kart Görünümü */}
      <div className="reports-cards-container mobile-only">
        {filteredData.length === 0 ? (
          <div className="empty-state">
            <p>Gösterilecek veri bulunamadı</p>
          </div>
        ) : (
          filteredData.map((row, index) => (
            <div key={`${row.orderId}-${index}`} className="report-card">
              <div className="report-card-header">
                <div className="card-firm">
                  <span className="firm-code">{row.firmName}</span>
                </div>
                <div className="card-model">
                  <span className="model-code">{row.modelCode}</span>
                </div>
              </div>

              <div className="report-card-body">
                <div className="card-row">
                  <span className="card-label">Adet:</span>
                  <span className="quantity-badge">
                    {formatNumber(row.quantity)}
                  </span>
                </div>

                {row.technics.length > 0 && (
                  <div className="card-row technics-row">
                    <span className="card-label">Teknikler:</span>
                    <div className="technics-list">
                      {row.technics.slice(0, 3).map((t, i) => (
                        <span key={i} className="technic-tag">
                          {t}
                        </span>
                      ))}
                      {row.technics.length > 3 && (
                        <span className="technic-tag more">
                          +{row.technics.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="card-row">
                  <span className="card-label">Toplam Tutar:</span>
                  <span className="amount">
                    {formatCurrency(row.totalAmount, "TRY")}
                  </span>
                </div>

                <div className="card-row">
                  <span className="card-label">Maliyet:</span>
                  <span className="cost">
                    {formatCurrency(row.totalCost, "TRY")}
                  </span>
                </div>

                <div className="card-row">
                  <span className="card-label">Genel Gider Dahil:</span>
                  <span className="cost" style={{ color: "#667eea" }}>
                    {formatCurrency(row.costWithOverhead, "TRY")}
                  </span>
                </div>

                <div className="card-row">
                  <span className="card-label">Birim Fiyat:</span>
                  <div className="price-with-currency">
                    <span className="unit-price">
                      {formatCurrency(row.unitPrice, row.currency)}
                    </span>
                    {row.currency !== "TRY" && row.currency !== "TL" && (
                      <span className="price-try">
                        ≈ {formatCurrency(row.unitPriceTRY, "TRY")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-row">
                  <span className="card-label">Birim Maliyet:</span>
                  <span className="unit-cost">
                    {formatCurrency(row.unitCost, "TRY")}
                  </span>
                </div>

                <div className="card-row">
                  <span className="card-label">Hesaplanan Fiyat:</span>
                  <span className="suggested-price">
                    {formatCurrency(row.suggestedPrice, "TRY")}
                  </span>
                </div>

                <div className="card-row profit-row">
                  <span className="card-label">Kar/Zarar:</span>
                  <span
                    className={`profit-loss ${
                      row.totalAmount - row.costWithOverhead >= 0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {formatCurrency(
                      row.totalAmount - row.costWithOverhead,
                      "TRY"
                    )}
                  </span>
                </div>
              </div>

              <div className="report-card-footer">
                <button
                  className="detail-btn full-width"
                  onClick={() => openCostDetail(row)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Detayları Görüntüle
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobil Özet Kartı */}
        {filteredData.length > 0 && (
          <div className="mobile-summary-card">
            <h3>Genel Toplam</h3>
            <div className="summary-row">
              <span className="summary-label">Toplam Adet:</span>
              <span className="summary-value">
                {formatNumber(totalQuantity)}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Toplam Tutar:</span>
              <span className="summary-value amount">
                {formatCurrency(totalAmount, "TRY")}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Toplam Maliyet:</span>
              <span className="summary-value cost">
                {formatCurrency(totalCost, "TRY")}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Genel Gider Dahil:</span>
              <span className="summary-value" style={{ color: "#667eea" }}>
                {formatCurrency(totalCostWithOverhead, "TRY")}
              </span>
            </div>
            <div className="summary-row total">
              <span className="summary-label">Kar/Zarar:</span>
              <span
                className={`summary-value profit-loss ${
                  totalAmount - totalCostWithOverhead >= 0
                    ? "positive"
                    : "negative"
                }`}
              >
                {formatCurrency(totalAmount - totalCostWithOverhead, "TRY")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Maliyet Detay Modalı */}
      {costDetailModal.isOpen && (
        <div className="cost-detail-modal-overlay" onClick={closeCostDetail}>
          <div
            className="cost-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cost-detail-header">
              <div className="cost-detail-title">
                <h2>Maliyet Detayları</h2>
                <div className="cost-detail-info">
                  <span className="info-badge firm">
                    {costDetailModal.firmName}
                  </span>
                  <span className="info-badge model">
                    Model: {costDetailModal.modelCode}
                  </span>
                  <span className="info-badge quantity">
                    Adet: {costDetailModal.quantity}
                  </span>
                </div>
              </div>
              <button className="cost-detail-close" onClick={closeCostDetail}>
                ×
              </button>
            </div>

            <div className="cost-detail-body">
              {costDetailModal.loading ? (
                <div className="cost-detail-loading">
                  <div className="spinner"></div>
                  <p>Maliyet kalemleri yükleniyor...</p>
                </div>
              ) : costDetailModal.costs.length === 0 ? (
                <div className="cost-detail-empty">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <p>Bu sipariş için maliyet kalemi bulunamadı.</p>
                </div>
              ) : (
                <>
                  {/* Atölye bazında grupla */}
                  {(() => {
                    // Maliyetleri atölye bazında grupla
                    const groupedByWorkshop = costDetailModal.costs.reduce(
                      (acc, cost) => {
                        const workshopName =
                          cost.order?.workshop?.name || cost.usage || "Genel";
                        if (!acc[workshopName]) {
                          acc[workshopName] = [];
                        }
                        acc[workshopName].push(cost);
                        return acc;
                      },
                      {} as Record<string, typeof costDetailModal.costs>
                    );
                    const workshopNames = Object.keys(groupedByWorkshop);
                    const grandTotal = costDetailModal.costs.reduce(
                      (sum, c) => sum + convertCostToTRY(c),
                      0
                    );

                    // Backend'den gelen costWithOverhead ve finalCostWithProfit değerlerini topla
                    const grandTotalWithOverhead = costDetailModal.costs.reduce(
                      (sum, c) => {
                        if (c.costWithOverhead) {
                          // costWithOverhead'i TL'ye çevir
                          return sum + convertCostWithOverheadToTRY(c);
                        }
                        // Eğer costWithOverhead yoksa, totalCost'u TL'ye çevir
                        return sum + convertCostToTRY(c);
                      },
                      0
                    );

                    const grandTotalWithProfit = costDetailModal.costs.reduce(
                      (sum, c) => {
                        if (c.finalCostWithProfit) {
                          // finalCostWithProfit'i TL'ye çevir
                          return sum + convertFinalCostToTRY(c);
                        }
                        // Eğer finalCostWithProfit yoksa, totalCost'u TL'ye çevir
                        return sum + convertCostToTRY(c);
                      },
                      0
                    );

                    return (
                      <div className="cost-detail-groups">
                        {workshopNames.map((workshopName) => {
                          const costs = groupedByWorkshop[workshopName];
                          const workshopTotal = costs.reduce(
                            (sum, c) => sum + convertCostToTRY(c),
                            0
                          );

                          return (
                            <div
                              key={workshopName}
                              className="cost-detail-group"
                            >
                              <div className="cost-group-header">
                                <div className="cost-group-title">
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <rect
                                      x="2"
                                      y="7"
                                      width="20"
                                      height="14"
                                      rx="2"
                                      ry="2"
                                    />
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                  </svg>
                                  <span>{workshopName}</span>
                                </div>
                                <div className="cost-group-total">
                                  {formatCurrency(workshopTotal, "TRY")}
                                </div>
                              </div>

                              <div className="cost-detail-table-wrapper">
                                <table className="cost-detail-table">
                                  <thead>
                                    <tr>
                                      <th>Maliyet Kalemi</th>
                                      <th>Kategori</th>
                                      <th className="text-center">Miktar</th>
                                      <th>Birim</th>
                                      <th className="text-center">Fire %</th>
                                      <th className="text-right">
                                        Birim Fiyat
                                      </th>
                                      <th className="text-right">Toplam</th>
                                      <th className="text-right">
                                        TL Karşılığı
                                      </th>
                                      <th>Detay/Not</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {costs.map((cost) => {
                                      const tryAmount = convertCostToTRY(cost);
                                      return (
                                        <tr key={cost.modelCostId}>
                                          <td>
                                            <strong>
                                              {cost.costItemName || "-"}
                                            </strong>
                                          </td>
                                          <td>
                                            <span className="category-badge-small">
                                              {cost.costCategoryName || "-"}
                                            </span>
                                          </td>
                                          <td className="text-center">
                                            {cost.quantity}
                                            {cost.quantity2 &&
                                              ` × ${cost.quantity2}`}
                                          </td>
                                          <td>
                                            {cost.unit}
                                            {cost.unit2 && ` × ${cost.unit2}`}
                                          </td>
                                          <td className="text-center">
                                            {cost.wastagePercentage
                                              ? `%${cost.wastagePercentage}`
                                              : "-"}
                                          </td>
                                          <td className="text-right">
                                            {formatCurrency(
                                              cost.unitPrice || 0,
                                              cost.currency || "TRY"
                                            )}
                                          </td>
                                          <td className="text-right">
                                            <strong>
                                              {formatCurrency(
                                                cost.totalCost || 0,
                                                cost.currency || "TRY"
                                              )}
                                            </strong>
                                          </td>
                                          <td className="text-right">
                                            <span className="try-value">
                                              {formatCurrency(tryAmount, "TRY")}
                                            </span>
                                            {cost.currency !== "TRY" &&
                                              (cost.usdRate ||
                                                cost.eurRate) && (
                                                <div
                                                  style={{
                                                    fontSize: "11px",
                                                    color: "#666",
                                                    marginTop: "4px",
                                                  }}
                                                >
                                                  Kur:{" "}
                                                  {cost.currency === "USD"
                                                    ? cost.usdRate?.toFixed(4)
                                                    : cost.currency === "EUR"
                                                    ? cost.eurRate?.toFixed(4)
                                                    : "-"}{" "}
                                                  TL
                                                </div>
                                              )}
                                          </td>
                                          <td>
                                            {(cost.notes || cost.usage) && (
                                              <div style={{ fontSize: "12px" }}>
                                                {cost.notes && (
                                                  <div
                                                    style={{
                                                      color: "#666",
                                                      fontStyle: "italic",
                                                    }}
                                                  >
                                                    {cost.notes}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {!cost.notes && !cost.usage && (
                                              <span style={{ color: "#999" }}>
                                                -
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}

                        {/* Genel Toplam */}
                        <div className="cost-detail-grand-total">
                          <div className="grand-total-row">
                            <span className="grand-total-label">
                              GENEL TOPLAM
                            </span>
                            <span className="grand-total-value">
                              {formatCurrency(grandTotal, "TRY")}
                            </span>
                          </div>
                          <div
                            className="grand-total-row"
                            style={{
                              background: "#f8f9fe",
                              borderTop: "1px solid #e0e7ff",
                            }}
                          >
                            <span
                              className="grand-total-label"
                              style={{ color: "#667eea" }}
                            >
                              GENEL GİDER DAHİL
                            </span>
                            <span
                              className="grand-total-value"
                              style={{ color: "#667eea" }}
                            >
                              {formatCurrency(grandTotalWithOverhead, "TRY")}
                            </span>
                          </div>
                          <div
                            className="grand-total-row"
                            style={{
                              background: "#f8f9fe",
                              borderTop: "1px solid #e0e7ff",
                            }}
                          >
                            <span
                              className="grand-total-label"
                              style={{ color: "#764ba2" }}
                            >
                              KAR DAHİL (NİHAİ MALİYET)
                            </span>
                            <span
                              className="grand-total-value"
                              style={{ color: "#764ba2" }}
                            >
                              {formatCurrency(grandTotalWithProfit, "TRY")}
                            </span>
                          </div>
                          {costDetailModal.quantity > 0 && (
                            <div className="grand-total-row unit">
                              <span className="grand-total-label">
                                BİRİM MALİYET
                              </span>
                              <span className="grand-total-value">
                                {formatCurrency(
                                  grandTotalWithOverhead /
                                    costDetailModal.quantity,
                                  "TRY"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="cost-detail-footer">
              <button className="close-btn" onClick={closeCostDetail}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teknik Seçim Modalı */}
      <TechnicModal
        isOpen={showTechnicModal}
        onClose={() => setShowTechnicModal(false)}
        onSelectTechnic={handleTechnicSelect}
        selectedTechnics={selectedTechnics}
        onClearAll={handleClearTechnics}
      />
    </div>
  );
};

export default Reports;
