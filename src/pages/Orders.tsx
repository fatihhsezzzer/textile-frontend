import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Order, OrderStatus, Firm, Workshop, OrderUnit } from "../types";
import {
  orderService,
  firmService,
  workshopService,
  exchangeRateService,
} from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import ImageManager from "../components/ImageManager";
import "./Orders.css";

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Filtrelenmemiş tüm siparişler
  const [loading, setLoading] = useState(true);
  const [showImageManager, setShowImageManager] = useState(false);
  const [selectedOrderForImages, setSelectedOrderForImages] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [firmFilter, setFirmFilter] = useState<string>("all");
  const [workshopFilter, setWorkshopFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [summaryDateFilter, setSummaryDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [statusSummary, setStatusSummary] = useState<
    {
      Status: string;
      Count: number;
      TotalValue: number;
      TotalQuantity: number;
    }[]
  >([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{
    usd: number | null;
    eur: number | null;
  }>({
    usd: null,
    eur: null,
  });

  // Arama ve sıralama state'leri
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, firmFilter, workshopFilter, dateFilter]);

  useEffect(() => {
    loadFirms();
    loadWorkshops();
    loadExchangeRates();
  }, []);

  // Exchange rates, orders veya summaryDateFilter değiştiğinde summary'i yeniden hesapla
  useEffect(() => {
    if (orders.length > 0 || (orders.length === 0 && allOrders.length > 0)) {
      setStatusSummary(calculateStatusSummary(orders));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeRates, orders, summaryDateFilter]);

  const loadExchangeRates = async () => {
    try {
      const rates = await exchangeRateService.getLatest();
      const usdRate = rates.find((rate) => rate.currencyCode === "USD");
      const eurRate = rates.find((rate) => rate.currencyCode === "EUR");

      setExchangeRates({
        usd: usdRate ? usdRate.banknoteSelling : null,
        eur: eurRate ? eurRate.banknoteSelling : null,
      });
    } catch (error) {
      console.error("❌ Kur bilgisi yüklenemedi:", error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAll();

      setAllOrders(data); // Tüm siparişleri kaydet

      let filteredData = data;
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(
          (order) => order.status === statusFilter
        );
      }
      if (firmFilter !== "all") {
        filteredData = filteredData.filter(
          (order) => order.firmId === firmFilter
        );
      }
      if (workshopFilter !== "all") {
        filteredData = filteredData.filter(
          (order) => order.workshopId === workshopFilter
        );
      }

      // Tarih filtresi - sadece "Tamamlandı" status'unda çalışır
      if (
        statusFilter === OrderStatus.Tamamlandi &&
        (dateFilter.startDate || dateFilter.endDate)
      ) {
        filteredData = filteredData.filter((order) => {
          if (!order.completionDate) return false;

          const orderDate = new Date(order.completionDate);
          const startDate = dateFilter.startDate
            ? new Date(dateFilter.startDate)
            : null;
          const endDate = dateFilter.endDate
            ? new Date(dateFilter.endDate)
            : null;

          if (startDate && orderDate < startDate) return false;
          if (endDate && orderDate > endDate) return false;

          return true;
        });
      }

      setOrders(filteredData);
      setStatusSummary(calculateStatusSummary(filteredData)); // Filtrelenmiş siparişleri kullan
    } catch (error: any) {
      console.error("❌ Failed to load orders:", error);
      alert("Siparişler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusSummary = (ordersList: Order[]) => {
    let filteredOrders = ordersList;

    // Durum özeti için tarih filtresi uygula
    if (summaryDateFilter.startDate || summaryDateFilter.endDate) {
      filteredOrders = ordersList.filter((order) => {
        if (!order.completionDate) return false;

        const orderDate = new Date(order.completionDate);
        const startDate = summaryDateFilter.startDate
          ? new Date(summaryDateFilter.startDate)
          : null;
        const endDate = summaryDateFilter.endDate
          ? new Date(summaryDateFilter.endDate)
          : null;

        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;

        return true;
      });
    }

    const summary: {
      [key: string]: {
        Count: number;
        TotalValue: number;
        TotalQuantity: number;
      };
    } = {};

    filteredOrders.forEach((order) => {
      const statusKey = getStatusText(order.status);
      if (!summary[statusKey]) {
        summary[statusKey] = { Count: 0, TotalValue: 0, TotalQuantity: 0 };
      }
      summary[statusKey].Count += 1;
      summary[statusKey].TotalQuantity += order.quantity || 0;

      // Sadece tamamlanan siparişler için fiyat hesapla
      if (
        order.status === OrderStatus.Tamamlandi &&
        order.price &&
        order.quantity
      ) {
        const totalPrice = order.price * order.quantity;

        // Döviz cinsine göre TL'ye çevir
        let priceInTRY = totalPrice;
        const currency = order.priceCurrency || order.currency || "TRY";

        if (currency === "USD" && exchangeRates.usd) {
          priceInTRY = totalPrice * exchangeRates.usd;
        } else if (currency === "EUR" && exchangeRates.eur) {
          priceInTRY = totalPrice * exchangeRates.eur;
        }

        summary[statusKey].TotalValue += priceInTRY;
      }
    });

    return Object.entries(summary).map(([Status, data]) => ({
      Status,
      Count: data.Count,
      TotalValue: data.TotalValue,
      TotalQuantity: data.TotalQuantity,
    }));
  };

  const loadFirms = async () => {
    try {
      const data = await firmService.getFirms();
      setFirms(data);
    } catch (error) {
      console.error("❌ Failed to load firms:", error);
    }
  };

  const loadWorkshops = async () => {
    try {
      const data = await workshopService.getAll();
      setWorkshops(data);
    } catch (error) {
      console.error("❌ Failed to load workshops:", error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Bu siparişi silmek istediğinizden emin misiniz?"))
      return;

    try {
      await orderService.delete(orderId);
      alert("Sipariş başarıyla silindi!");
      loadOrders();
    } catch (error: any) {
      console.error("❌ Failed to delete order:", error);
      alert("Sipariş silinemedi!");
    }
  };

  const getStatusText = (status?: OrderStatus): string => {
    if (status === undefined || status === null) return "Atanmadı";
    switch (status) {
      case OrderStatus.Atanmadi:
        return "Atanmadı";
      case OrderStatus.Islemde:
        return "İşlemde";
      case OrderStatus.Tamamlandi:
        return "Tamamlandı";
      case OrderStatus.IptalEdildi:
        return "İptal Edildi";
      default:
        return "Atanmadı";
    }
  };

  const getStatusClass = (status?: OrderStatus): string => {
    if (status === undefined) return "status-atanmadi";
    switch (status) {
      case OrderStatus.Atanmadi:
        return "status-atanmadi";
      case OrderStatus.Islemde:
        return "status-islemde";
      case OrderStatus.Tamamlandi:
        return "status-tamamlandi";
      case OrderStatus.IptalEdildi:
        return "status-iptal";
      default:
        return "status-atanmadi";
    }
  };

  const getUnitText = (unit?: OrderUnit): string => {
    const unitMap: { [key: number]: string } = {
      [OrderUnit.Adet]: "Adet",
      [OrderUnit.Metre]: "Metre",
      [OrderUnit.Takim]: "Takım",
    };
    return unitMap[unit ?? OrderUnit.Adet] || "Adet";
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);
  };

  // Sıralama fonksiyonu
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Verileri sıralayan fonksiyon
  const getSortedOrders = (ordersToSort: Order[]) => {
    if (!sortConfig.key) return ordersToSort;

    const sortedOrders = [...ordersToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case "firm":
          aValue = a.firm?.firmName || "";
          bValue = b.firm?.firmName || "";
          break;
        case "model":
          aValue = a.model?.modelName || "";
          bValue = b.model?.modelName || "";
          break;
        case "quantity":
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case "price":
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case "workshop":
          aValue = a.workshop?.name || "";
          bValue = b.workshop?.name || "";
          break;
        case "operator":
          aValue = a.operator
            ? `${a.operator.firstName} ${a.operator.lastName}`
            : "";
          bValue = b.operator
            ? `${b.operator.firstName} ${b.operator.lastName}`
            : "";
          break;
        case "status":
          aValue = a.status || 0;
          bValue = b.status || 0;
          break;
        case "acceptanceDate":
          aValue = a.acceptanceDate ? new Date(a.acceptanceDate).getTime() : 0;
          bValue = b.acceptanceDate ? new Date(b.acceptanceDate).getTime() : 0;
          break;
        case "deadline":
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case "completionDate":
          aValue = a.completionDate ? new Date(a.completionDate).getTime() : 0;
          bValue = b.completionDate ? new Date(b.completionDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortedOrders;
  };

  // Arama fonksiyonu
  const getFilteredOrders = (ordersToFilter: Order[]) => {
    if (!searchTerm.trim()) return ordersToFilter;

    const term = searchTerm.toLowerCase().trim();
    return ordersToFilter.filter((order) => {
      return (
        (order.firm?.firmName || "").toLowerCase().includes(term) ||
        (order.model?.modelName || "").toLowerCase().includes(term) ||
        (order.model?.modelCode || "").toLowerCase().includes(term) ||
        (order.workshop?.name || "").toLowerCase().includes(term) ||
        (order.operator?.firstName || "").toLowerCase().includes(term) ||
        (order.operator?.lastName || "").toLowerCase().includes(term) ||
        getStatusText(order.status).toLowerCase().includes(term) ||
        order.quantity?.toString().includes(term) ||
        order.price?.toString().includes(term)
      );
    });
  };

  // Hem aramayı hem sıralamayı uygulayan fonksiyon
  const getProcessedOrders = () => {
    const filtered = getFilteredOrders(orders);
    return getSortedOrders(filtered);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>Siparişler</h1>
        <button
          onClick={() => navigate("/orders/new")}
          className="create-button"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Yeni Sipariş
        </button>
      </div>

      {/* Durum Özeti - Sadece Manager için */}
      {user?.role === "Manager" && (
        <div className="status-summary">
          <h3>Durum Özeti</h3>

          {/* Durum özeti tarih filtresi */}

          <div className="summary-cards">
            {statusSummary.map((item) => (
              <div key={item.Status} className="summary-card">
                <div className="summary-status">{item.Status}</div>
                <div className="summary-count">{item.Count} Sipariş</div>
                <div className="summary-quantity">
                  {item.TotalQuantity} Adet
                </div>
                {item.Status === "Tamamlandı" && (
                  <div className="summary-value">
                    {formatCurrency(item.TotalValue)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Arama:</label>
          <input
            type="text"
            placeholder="Firma, model, atölye, operatör ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Durum:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              const newStatus =
                e.target.value === "all"
                  ? "all"
                  : (parseInt(e.target.value) as OrderStatus);
              setStatusFilter(newStatus);
              // Status değiştiğinde tarih filtrelerini sıfırla
              if (newStatus !== OrderStatus.Tamamlandi) {
                setDateFilter({ startDate: "", endDate: "" });
              }
            }}
          >
            <option value="all">Tümü</option>
            <option value={OrderStatus.Atanmadi}>Atanmadı</option>
            <option value={OrderStatus.Islemde}>İşlemde</option>
            <option value={OrderStatus.Tamamlandi}>Tamamlandı</option>
            <option value={OrderStatus.IptalEdildi}>İptal Edildi</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Firma:</label>
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
          >
            <option value="all">Tüm Firmalar</option>
            {firms.map((firm) => (
              <option key={firm.firmId} value={firm.firmId}>
                {firm.firmName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Atölye:</label>
          <select
            value={workshopFilter}
            onChange={(e) => setWorkshopFilter(e.target.value)}
          >
            <option value="all">Tüm Atölyeler</option>
            {workshops.map((workshop) => (
              <option key={workshop.workshopId} value={workshop.workshopId}>
                {workshop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tarih filtreleri - sadece "Tamamlandı" statusunda görünür */}
        {statusFilter === OrderStatus.Tamamlandi && (
          <>
            <div className="filter-group">
              <label>Başlangıç Tarihi:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, startDate: e.target.value })
                }
              />
            </div>
            <div className="filter-group">
              <label>Bitiş Tarihi:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, endDate: e.target.value })
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th
                className="sortable-header"
                onClick={() => handleSort("firm")}
              >
                Firma
                {sortConfig.key === "firm" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("model")}
              >
                Model
                {sortConfig.key === "model" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("quantity")}
              >
                Miktar
                {sortConfig.key === "quantity" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th>Birim</th>
              <th>Parça/Takım</th>
              <th
                className="sortable-header"
                onClick={() => handleSort("price")}
              >
                Birim Fiyat
                {sortConfig.key === "price" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th>Döviz</th>
              <th
                className="sortable-header"
                onClick={() => handleSort("workshop")}
              >
                Atölye
                {sortConfig.key === "workshop" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("operator")}
              >
                Operatör
                {sortConfig.key === "operator" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("status")}
              >
                Durum
                {sortConfig.key === "status" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("acceptanceDate")}
              >
                Kabul Tarihi
                {sortConfig.key === "acceptanceDate" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("deadline")}
              >
                Termin
                {sortConfig.key === "deadline" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort("completionDate")}
              >
                Tamamlanma Tarihi
                {sortConfig.key === "completionDate" && (
                  <span className="sort-indicator">
                    {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {getProcessedOrders().length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: "center" }}>
                  {searchTerm.trim()
                    ? "Arama kriterine uygun sipariş bulunamadı."
                    : "Henüz sipariş bulunmuyor."}
                </td>
              </tr>
            ) : (
              getProcessedOrders().map((order) => (
                <tr key={order.orderId}>
                  <td>{order.firm?.firmName || "-"}</td>
                  <td>
                    {order.model
                      ? `${order.model.modelCode} - ${order.model.modelName}`
                      : "-"}
                  </td>
                  <td>{order.quantity || 0}</td>
                  <td>
                    <span className="unit-badge">
                      {getUnitText(order.unit)}
                    </span>
                  </td>
                  <td>
                    {order.unit === OrderUnit.Takim && order.pieceCount
                      ? `${order.pieceCount} parça`
                      : "-"}
                  </td>
                  <td>{order.price ? formatPrice(order.price) : "-"}</td>
                  <td>
                    <span className="currency-badge">
                      {order.priceCurrency || order.currency || "TRY"}
                    </span>
                  </td>
                  <td>{order.workshop?.name || "-"}</td>
                  <td>
                    {order.operator
                      ? `${order.operator.firstName} ${order.operator.lastName}`
                      : "-"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(order.status)}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td>{formatDate(order.acceptanceDate)}</td>
                  <td>{formatDate(order.deadline)}</td>
                  <td>
                    {order.completionDate
                      ? formatDate(order.completionDate)
                      : order.status === OrderStatus.Tamamlandi
                      ? "Tarih yok"
                      : "-"}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() =>
                          navigate(`/orders/detail/${order.orderId}`)
                        }
                        className="detail-button"
                        title="Detay"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/orders/edit/${order.orderId}`)
                        }
                        className="edit-button"
                        title="Düzenle"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.orderId)}
                        className="delete-button"
                        title="Sil"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrderForImages(order.orderId);
                          setShowImageManager(true);
                        }}
                        className="image-button"
                        title="Resimleri Görüntüle"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card görünümü - mobil için */}
      <div className="orders-cards">
        {getProcessedOrders().length === 0 ? (
          <div className="order-card">
            <div className="order-card-header">
              <div className="order-card-title">
                {searchTerm.trim()
                  ? "Arama kriterine uygun sipariş bulunamadı"
                  : "Sipariş bulunamadı"}
              </div>
            </div>
          </div>
        ) : (
          getProcessedOrders().map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-card-header">
                <div className="order-card-title">
                  {order.firm?.firmName || "Firma bilinmiyor"}
                </div>
                <span
                  className={`status-badge order-card-status ${getStatusClass(
                    order.status
                  )}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="order-card-info">
                <div className="order-card-info-item">
                  <div className="order-card-info-label">Model</div>
                  <div className="order-card-info-value">
                    {order.model?.modelName || "Model bilinmiyor"}
                  </div>
                </div>
                <div className="order-card-info-item">
                  <div className="order-card-info-label">Miktar</div>
                  <div className="order-card-info-value">
                    {order.quantity} {getUnitText(order.unit)}
                  </div>
                </div>
                <div className="order-card-info-item">
                  <div className="order-card-info-label">Kabul Tarihi</div>
                  <div className="order-card-info-value">
                    {formatDate(order.acceptanceDate)}
                  </div>
                </div>
                <div className="order-card-info-item">
                  <div className="order-card-info-label">Termin</div>
                  <div className="order-card-info-value">
                    {formatDate(order.deadline)}
                  </div>
                </div>
              </div>

              <div className="order-card-actions">
                <button
                  onClick={() => navigate(`/orders/detail/${order.orderId}`)}
                  className="detail-button"
                  title="Detay"
                >
                  Detay
                </button>
                <button
                  onClick={() => {
                    setSelectedOrderForImages(order.orderId);
                    setShowImageManager(true);
                  }}
                  className="image-button"
                  title="Resimler"
                >
                  Resimler
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showImageManager && selectedOrderForImages && (
        <ImageManager
          orderId={selectedOrderForImages}
          onClose={() => {
            setShowImageManager(false);
            setSelectedOrderForImages(null);
          }}
        />
      )}
    </div>
  );
};

export default Orders;
