import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Order, OrderStatus, Firm, Workshop, OrderUnit } from "../types";
import {
  orderService,
  firmService,
  workshopService,
} from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import { useExchangeRates } from "../context/ExchangeRateContext";
import ImageManager from "../components/ImageManager";
import {
  formatCurrency,
  formatNumber,
  turkishIncludes,
} from "../utils/formatters";
import PageLoader from "../components/PageLoader";
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

  // QR Print Modal state
  const [qrPrintModal, setQrPrintModal] = useState<{
    show: boolean;
    order: Order | null;
    qrCodeDataUrl: string | null;
  }>({ show: false, order: null, qrCodeDataUrl: null });

  // Arama ve sıralama state'leri
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });
  const [expandedTechnics, setExpandedTechnics] = useState<Set<string>>(
    new Set()
  );

  const navigate = useNavigate();
  const { user } = useAuth();
  const { usdRate, eurRate } = useExchangeRates();

  // QR Modal'ı aç
  const handleShowQrModal = async (order: Order) => {
    let qrDataUrl: string | null = null;
    try {
      if (order.qrCodeUrl || order.qrCode) {
        qrDataUrl = await QRCode.toDataURL(
          order.qrCodeUrl || order.qrCode || "",
          {
            width: 300,
            margin: 2,
          }
        );
      }
    } catch (error) {
      console.error("QR kod oluşturulamadı:", error);
    }
    setQrPrintModal({ show: true, order, qrCodeDataUrl: qrDataUrl });
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, firmFilter, workshopFilter, dateFilter]);

  useEffect(() => {
    loadFirms();
    loadWorkshops();
  }, []);

  // Exchange rates, orders veya summaryDateFilter değiştiğinde summary'i yeniden hesapla
  useEffect(() => {
    if (orders.length > 0 || (orders.length === 0 && allOrders.length > 0)) {
      setStatusSummary(calculateStatusSummary(orders));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdRate, eurRate, orders, summaryDateFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAll();

      // Siparişleri oluşturulma tarihine göre tersten sırala (en yeni en üstte)
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.acceptanceDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.acceptanceDate || 0).getTime();
        return dateB - dateA; // Tersten sıralama
      });

      setAllOrders(sortedData); // Tüm siparişleri kaydet

      let filteredData = sortedData;

      // Manager olmayan kullanıcılar sadece kendi atölyelerindeki işleri görebilir
      if (user && user.role !== "Manager" && user.workshopId) {
        filteredData = filteredData.filter(
          (order) => order.workshopId === user.workshopId
        );
      }

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

      // Tüm siparişler için fiyat hesapla (fiyat varsa)
      if (order.price && order.quantity) {
        const totalPrice = order.price * order.quantity;

        // Döviz cinsine göre TL'ye çevir
        let priceInTRY = totalPrice;
        const currency = order.priceCurrency || order.currency || "TRY";

        if (currency === "USD" && usdRate) {
          priceInTRY = totalPrice * usdRate;
        } else if (currency === "EUR" && eurRate) {
          priceInTRY = totalPrice * eurRate;
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
        case "modelist":
          aValue = a.modelistUser
            ? `${a.modelistUser.firstName} ${a.modelistUser.lastName}`
            : "";
          bValue = b.modelistUser
            ? `${b.modelistUser.firstName} ${b.modelistUser.lastName}`
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

    return ordersToFilter.filter((order) => {
      return (
        turkishIncludes(order.orderId || "", searchTerm) ||
        turkishIncludes(order.firm?.firmName || "", searchTerm) ||
        turkishIncludes(order.model?.modelName || "", searchTerm) ||
        turkishIncludes(order.model?.modelCode || "", searchTerm) ||
        turkishIncludes(order.workshop?.name || "", searchTerm) ||
        turkishIncludes(order.operator?.firstName || "", searchTerm) ||
        turkishIncludes(order.operator?.lastName || "", searchTerm) ||
        turkishIncludes(order.modelistUser?.firstName || "", searchTerm) ||
        turkishIncludes(order.modelistUser?.lastName || "", searchTerm) ||
        turkishIncludes(getStatusText(order.status), searchTerm) ||
        order.quantity?.toString().includes(searchTerm.trim()) ||
        order.price?.toString().includes(searchTerm.trim())
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
    return <PageLoader message="Siparişler yükleniyor..." />;
  }

  return (
    <div className="orders-container">
      {/* Sayfa Başlığı */}

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
                <div className="summary-value">
                  Toplam: {formatCurrency(item.TotalValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === "Manager" && (
        <div className="filters">
          <div className="filter-group">
            <label>Arama:</label>
            <input
              type="text"
              placeholder="Order ID, Firma, model, atölye, operatör, desinatör ara..."
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
      )}

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
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
              <th>Teknikler</th>
              {user?.role === "Manager" && (
                <>
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
                </>
              )}
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
                onClick={() => handleSort("modelist")}
              >
                Desinatör
                {sortConfig.key === "modelist" && (
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
              <th>QR Kod</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {getProcessedOrders().length === 0 ? (
              <tr>
                <td colSpan={16} style={{ textAlign: "center" }}>
                  {searchTerm.trim()
                    ? "Arama kriterine uygun sipariş bulunamadı."
                    : "Henüz sipariş bulunmuyor."}
                </td>
              </tr>
            ) : (
              getProcessedOrders().map((order) => (
                <tr key={order.orderId}>
                  <td
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    {order.orderId.substring(0, 8)}...
                  </td>
                  <td title={order.firm?.firmName || "-"}>
                    {order.firm?.firmName
                      ? order.firm.firmName.length > 10
                        ? order.firm.firmName.substring(0, 10) + "..."
                        : order.firm.firmName
                      : "-"}
                  </td>
                  <td>{order.model?.modelName || "-"}</td>
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
                  <td>
                    {order.orderTechnics && order.orderTechnics.length > 0 ? (
                      order.orderTechnics.length <= 3 ? (
                        <div className="technics-list">
                          {order.orderTechnics.map((ot, i) => (
                            <span key={i} className="technic-tag">
                              {ot.technic?.name || "-"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="technics-expandable">
                          {expandedTechnics.has(order.orderId) ? (
                            <>
                              <div className="technics-list">
                                {order.orderTechnics.map((ot, i) => (
                                  <span key={i} className="technic-tag">
                                    {ot.technic?.name || "-"}
                                  </span>
                                ))}
                              </div>
                              <button
                                className="technics-toggle"
                                onClick={() => {
                                  const newSet = new Set(expandedTechnics);
                                  newSet.delete(order.orderId);
                                  setExpandedTechnics(newSet);
                                }}
                              >
                                Gizle ▲
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="technics-list">
                                {order.orderTechnics
                                  .slice(0, 1)
                                  .map((ot, i) => (
                                    <span key={i} className="technic-tag">
                                      {ot.technic?.name || "-"}
                                    </span>
                                  ))}
                              </div>
                              <button
                                className="technics-toggle"
                                onClick={() => {
                                  const newSet = new Set(expandedTechnics);
                                  newSet.add(order.orderId);
                                  setExpandedTechnics(newSet);
                                }}
                              >
                                +{order.orderTechnics.length - 2} daha ▼
                              </button>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="no-technic">-</span>
                    )}
                  </td>
                  {user?.role === "Manager" && (
                    <>
                      <td>{order.price ? formatNumber(order.price) : "-"}</td>
                      <td>
                        <span className="currency-badge">
                          {order.priceCurrency || order.currency || "TRY"}
                        </span>
                      </td>
                    </>
                  )}
                  <td>{order.workshop?.name || "-"}</td>
                  <td>
                    {order.modelistUser
                      ? `${order.modelistUser.firstName} ${order.modelistUser.lastName}`
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
                    {order.qrCodeUrl || order.qrCode ? (
                      <button
                        onClick={() => handleShowQrModal(order)}
                        className="qr-button"
                        title="QR Detayı Görüntüle"
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
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      </button>
                    ) : (
                      <span style={{ color: "#999", fontSize: "12px" }}>-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {user?.role === "Manager" && (
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
                      )}
                      {user && user.role !== "Manager" && (
                        <button
                          onClick={() =>
                            navigate(`/orderdetail/${order.orderId}`)
                          }
                          className="transfer-button"
                          title="Transfer"
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
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      )}
                      {(user?.role === "Manager" ||
                        user?.role === "Sekreterya") && (
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
                      )}
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
                <div
                  className="order-card-title"
                  title={order.firm?.firmName || "Firma bilinmiyor"}
                >
                  {order.firm?.firmName
                    ? order.firm.firmName.length > 10
                      ? order.firm.firmName.substring(0, 10) + "..."
                      : order.firm.firmName
                    : "Firma bilinmiyor"}
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
                {order.modelistUser && (
                  <div className="order-card-info-item">
                    <div className="order-card-info-label">Desinatör</div>
                    <div className="order-card-info-value">
                      {order.modelistUser.firstName}{" "}
                      {order.modelistUser.lastName}
                    </div>
                  </div>
                )}
              </div>

              <div className="order-card-actions">
                {(order.qrCodeUrl || order.qrCode) && (
                  <button
                    onClick={() => handleShowQrModal(order)}
                    className="qr-button"
                    title="QR Kodu"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    QR
                  </button>
                )}
                {user && user.role !== "Manager" && (
                  <button
                    onClick={() => navigate(`/orderdetail/${order.orderId}`)}
                    className="transfer-button"
                    title="Transfer"
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                )}
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

      {/* QR Print Modal */}
      {qrPrintModal.show && qrPrintModal.order && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "15px",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>
                ✅ Sipariş QR Detayı
              </h2>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
                Sipariş No: <strong>{qrPrintModal.order.orderId}</strong>
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "16px",
                  color: "#333",
                  marginBottom: "15px",
                  fontWeight: "600",
                }}
              >
                📋 Sipariş Bilgileri
              </p>
              <div
                style={{
                  textAlign: "left",
                  background: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                <p style={{ margin: "6px 0" }}>
                  <strong>Firma:</strong>{" "}
                  {qrPrintModal.order.firm?.firmName || "-"}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Model:</strong>{" "}
                  {qrPrintModal.order.model?.modelName || "-"}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Miktar:</strong> {qrPrintModal.order.quantity}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Atölye:</strong>{" "}
                  {qrPrintModal.order.workshop?.name || "-"}
                </p>
              </div>
            </div>

            {qrPrintModal.qrCodeDataUrl ? (
              <>
                <div
                  style={{
                    background: "#f0f4ff",
                    padding: "15px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#667eea",
                      marginBottom: "10px",
                      fontWeight: "600",
                    }}
                  >
                    📱 QR Kod Hazır
                  </p>
                  <div
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}
                  >
                    <img
                      src={qrPrintModal.qrCodeDataUrl}
                      alt="Order QR Code"
                      style={{
                        width: "200px",
                        height: "200px",
                        display: "block",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (
                        printWindow &&
                        qrPrintModal.qrCodeDataUrl &&
                        qrPrintModal.order
                      ) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>QR Kod - ${
                                qrPrintModal.order.orderId
                              }</title>
                              <style>
                                body {
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  justify-content: center;
                                  min-height: 100vh;
                                  margin: 0;
                                  font-family: Arial, sans-serif;
                                }
                                .qr-container {
                                  text-align: center;
                                  padding: 20px;
                                }
                                img {
                                  width: 350px;
                                  height: 350px;
                                  margin: 20px 0;
                                }
                                .info {
                                  margin: 10px 0;
                                  font-size: 14px;
                                }
                                @media print {
                                  body { margin: 0; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="qr-container">
                                <h2>Sipariş QR Kodu</h2>
                                <img src="${
                                  qrPrintModal.qrCodeDataUrl
                                }" alt="QR Code" />
                                <div class="info"><strong>Sipariş No:</strong> ${
                                  qrPrintModal.order.orderId
                                }</div>
                                <div class="info"><strong>Firma:</strong> ${
                                  qrPrintModal.order.firm?.firmName || "-"
                                }</div>
                                <div class="info"><strong>Model:</strong> ${
                                  qrPrintModal.order.model?.modelName || "-"
                                }</div>
                                <div class="info"><strong>Miktar:</strong> ${
                                  qrPrintModal.order.quantity
                                }</div>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }
                    }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    🖨️ QR Kodu Yazdır
                  </button>

                  <a
                    href={qrPrintModal.qrCodeDataUrl || ""}
                    download={`order-${qrPrintModal.order.orderId}-qr.png`}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      textDecoration: "none",
                      cursor: "pointer",
                      display: "inline-block",
                      transition: "transform 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    📥 QR Kodu İndir
                  </a>
                </div>
              </>
            ) : (
              <div
                style={{
                  background: "#fff3cd",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  color: "#856404",
                  fontSize: "14px",
                }}
              >
                <p>⚠️ QR kod oluşturulamadı.</p>
              </div>
            )}

            <button
              onClick={() =>
                setQrPrintModal({
                  show: false,
                  order: null,
                  qrCodeDataUrl: null,
                })
              }
              style={{
                marginTop: "15px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "500",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
