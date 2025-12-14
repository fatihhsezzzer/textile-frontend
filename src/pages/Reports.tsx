import React, { useState, useEffect } from "react";
import {
  costService,
  modelService,
  firmService,
  orderService,
  exchangeRateService,
} from "../services/dataService";
import { ModelCost, Model, Firm, OrderStatus } from "../types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
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
  unitPrice: number; // Birim fiyat (orijinal döviz)
  unitPriceTRY: number; // Birim fiyat - TL
  unitCost: number; // Birim maliyet - TL
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
  const [exchangeRates, setExchangeRates] = useState<{
    usd: number | null;
    eur: number | null;
    gbp: number | null;
  }>({
    usd: null,
    eur: null,
    gbp: null,
  });
  const [, setRatesLoaded] = useState(false);
  const [expandedTechnics, setExpandedTechnics] = useState<Set<string>>(
    new Set()
  );
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
    loadExchangeRates();
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

  const loadExchangeRates = async () => {
    try {
      const rates = await exchangeRateService.getLatest();
      const usdRate = rates.find((rate) => rate.currencyCode === "USD");
      const eurRate = rates.find((rate) => rate.currencyCode === "EUR");
      const gbpRate = rates.find((rate) => rate.currencyCode === "GBP");

      setExchangeRates({
        usd: usdRate ? usdRate.banknoteSelling : null,
        eur: eurRate ? eurRate.banknoteSelling : null,
        gbp: gbpRate ? gbpRate.banknoteSelling : null,
      });
      setRatesLoaded(true);
    } catch (error) {
      console.error("❌ Kur bilgisi yüklenemedi:", error);
      setRatesLoaded(true); // Yükleme tamamlandı ama kurlar yok
    }
  };

  // Döviz dönüşümü fonksiyonu - kur yoksa 0 döner
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const convertToTRY = (amount: number, currency: string): number => {
    if (currency === "TRY" || currency === "TL") return amount;
    if (currency === "USD" && exchangeRates.usd)
      return amount * exchangeRates.usd;
    if (currency === "EUR" && exchangeRates.eur)
      return amount * exchangeRates.eur;
    if (currency === "GBP" && exchangeRates.gbp)
      return amount * exchangeRates.gbp;
    return 0; // Kur yoksa dönüşüm yapılamaz
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Önce güncel kurları al
      let rates: {
        usd: number | null;
        eur: number | null;
        gbp: number | null;
      } = {
        usd: null,
        eur: null,
        gbp: null,
      };
      try {
        const ratesData = await exchangeRateService.getLatest();
        const usdRate = ratesData.find((rate) => rate.currencyCode === "USD");
        const eurRate = ratesData.find((rate) => rate.currencyCode === "EUR");
        const gbpRate = ratesData.find((rate) => rate.currencyCode === "GBP");
        rates = {
          usd: usdRate ? usdRate.banknoteSelling : null,
          eur: eurRate ? eurRate.banknoteSelling : null,
          gbp: gbpRate ? gbpRate.banknoteSelling : null,
        };
        setExchangeRates(rates);
        setRatesLoaded(true);
      } catch (err) {
        console.error("❌ Kurlar yüklenemedi");
        setRatesLoaded(true);
      }

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
        if (currency === "USD" && rates.usd) return amount * rates.usd;
        if (currency === "EUR" && rates.eur) return amount * rates.eur;
        if (currency === "GBP" && rates.gbp) return amount * rates.gbp;
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
            unitPrice: orderPrice,
            unitPriceTRY: unitPriceTRY,
            unitCost:
              (order.quantity || 1) > 0 ? totalCost / (order.quantity || 1) : 0,
            currency: orderCurrency,
            orderId: order.orderId,
            acceptanceDate: order.acceptanceDate,
            completionDate: order.completionDate || order.updatedAt || "",
          });

          console.log(
            `📅 Order ${order.orderId}: completionDate=${order.completionDate}, updatedAt=${order.updatedAt}`
          );
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
          firms.find((f) => f.firmId === selectedFirmId)?.firmCode ===
          r.firmCode
      );
    }

    if (selectedModelId !== "all") {
      filtered = filtered.filter((r) => r.modelId === selectedModelId);
    }

    // Tarih filtresi - Tamamlanma tarihine göre
    if (startDate || endDate) {
      console.log(
        `🔍 Tarih filtresi: startDate=${startDate}, endDate=${endDate}`
      );
      console.log(`📊 Filtreleme öncesi kayıt sayısı: ${filtered.length}`);
    }

    if (startDate) {
      filtered = filtered.filter((r) => {
        if (!r.completionDate) {
          console.log(`⚠️ ${r.orderId}: completionDate boş`);
          return false;
        }
        // Sadece tarih kısmını karşılaştır (saat dilimi sorunlarını önle)
        const completionDateStr = r.completionDate.split("T")[0];
        const result = completionDateStr >= startDate;
        console.log(
          `📅 ${r.orderId}: ${completionDateStr} >= ${startDate} = ${result}`
        );
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
      console.log(`📊 Filtreleme sonrası kayıt sayısı: ${filtered.length}`);
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
      } catch (e) {
        console.log("Atölye maliyetleri alınamadı:", e);
      }

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
      console.log("🏭 Workshop Costs:", workshopCostsAsModelCost);
      console.log("📋 All Costs:", allCosts);

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

  // Toplamlar
  const filteredData = getFilteredData();
  const totalQuantity = filteredData.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = filteredData.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCost = filteredData.reduce((sum, r) => sum + r.totalCost, 0);

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
                  : firms.find((f) => f.firmId === selectedFirmId)?.firmCode ||
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
                    .sort((a, b) => a.firmCode.localeCompare(b.firmCode))
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
                        {firm.firmCode} - {firm.firmName}
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
            <span className="card-label">Toplam Maliyet</span>
            <span className="card-value">
              {formatCurrency(totalCost, "TRY")}
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
                totalAmount - totalCost >= 0 ? "positive" : "negative"
              }`}
            >
              {formatCurrency(totalAmount - totalCost, "TRY")}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div
            className={`card-icon ${
              totalAmount > 0 &&
              ((totalAmount - totalCost) / totalAmount) * 100 >= 0
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
                ((totalAmount - totalCost) / totalAmount) * 100 >= 0
                  ? "positive"
                  : "negative"
              }`}
            >
              {totalAmount > 0
                ? `%${(((totalAmount - totalCost) / totalAmount) * 100).toFixed(
                    2
                  )}`
                : "%0.00"}
            </span>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="reports-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("firmCode")} className="sortable">
                Firma Kodu {getSortIcon("firmCode")}
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
              <th className="text-right">Kar/Zarar</th>
              <th className="text-center">Detay</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-row">
                  Gösterilecek veri bulunamadı
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr key={`${row.orderId}-${index}`}>
                  <td>
                    <span className="firm-code">{row.firmCode}</span>
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
                    <span
                      className={`profit-loss ${
                        row.totalAmount - row.totalCost >= 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {formatCurrency(row.totalAmount - row.totalCost, "TRY")}
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
                <td></td>
                <td></td>
                <td className="text-right">
                  <strong
                    className={
                      totalAmount - totalCost >= 0 ? "positive" : "negative"
                    }
                  >
                    {formatCurrency(totalAmount - totalCost, "TRY")}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
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
                    {costDetailModal.firmCode} - {costDetailModal.firmName}
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

                    console.log("🔍 Grouped by Workshop:", groupedByWorkshop);
                    console.log(
                      "📋 Total costs count:",
                      costDetailModal.costs.length
                    );

                    const workshopNames = Object.keys(groupedByWorkshop);
                    const grandTotal = costDetailModal.costs.reduce(
                      (sum, c) => sum + convertCostToTRY(c),
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
                          {costDetailModal.quantity > 0 && (
                            <div className="grand-total-row unit">
                              <span className="grand-total-label">
                                BİRİM MALİYET
                              </span>
                              <span className="grand-total-value">
                                {formatCurrency(
                                  grandTotal / costDetailModal.quantity,
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
    </div>
  );
};

export default Reports;
