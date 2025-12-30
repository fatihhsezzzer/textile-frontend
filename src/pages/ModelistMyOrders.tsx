import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Order, OrderStatus, OrderUnit } from "../types";
import { orderService } from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import ImageManager from "../components/ImageManager";
import { turkishIncludes } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./Orders.css";

const ModelistMyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageManager, setShowImageManager] = useState(false);
  const [selectedOrderForImages, setSelectedOrderForImages] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedTechnics, setExpandedTechnics] = useState<Set<string>>(
    new Set()
  );

  // QR Print Modal state
  const [qrPrintModal, setQrPrintModal] = useState<{
    show: boolean;
    order: Order | null;
    qrCodeDataUrl: string | null;
  }>({ show: false, order: null, qrCodeDataUrl: null });

  const navigate = useNavigate();
  const { user } = useAuth();

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
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAll();

      // Siparişleri oluşturulma tarihine göre tersten sırala (en yeni en üstte)
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.acceptanceDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.acceptanceDate || 0).getTime();
        return dateB - dateA;
      });

      // Debug için konsola yazdır
      console.log("👤 Current User ID:", user?.userId);
      console.log("📦 Total Orders:", sortedData.length);

      // İlk siparişin tüm detaylarını göster
      if (sortedData.length > 0) {
        console.log("📋 First Order Full Object:", sortedData[0]);
        console.log(
          "🔍 First Order modelistUserId:",
          sortedData[0].modelistUserId
        );
      }

      // Sadece bu kullanıcıya atanan siparişleri filtrele
      let filteredData = sortedData.filter((order) => {
        const matches = order.modelistUserId === user?.userId;
        console.log(
          `Order ${order.orderId}: modelistUserId="${order.modelistUserId}", user="${user?.userId}", matches=${matches}`
        );
        return matches;
      });

      console.log("✅ Filtered Orders Count:", filteredData.length);

      // Durum filtresini uygula
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(
          (order) => order.status === statusFilter
        );
      }

      setOrders(filteredData);
    } catch (error: any) {
      console.error("❌ Failed to load orders:", error);
      alert("Siparişler yüklenemedi!");
    } finally {
      setLoading(false);
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
        turkishIncludes(getStatusText(order.status), searchTerm) ||
        order.quantity?.toString().includes(searchTerm.trim())
      );
    });
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (loading) {
    return <PageLoader message="Siparişler yükleniyor..." />;
  }

  const processedOrders = getFilteredOrders(orders);

  return (
    <div className="orders-container">
      {/* Sayfa Başlığı */}
      <div className="orders-header">
        <h1>Üzerinizdeki İşler</h1>
        <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
          Size atanan siparişleri görüntüleyebilirsiniz
        </p>
      </div>

      {/* Filtreler */}
      <div className="filters">
        <div className="filter-group">
          <label>Arama:</label>
          <input
            type="text"
            placeholder="Order ID, Firma, Model ara..."
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
            }}
          >
            <option value="all">Tümü</option>
            <option value={OrderStatus.Atanmadi}>Atanmadı</option>
            <option value={OrderStatus.Islemde}>İşlemde</option>
            <option value={OrderStatus.Tamamlandi}>Tamamlandı</option>
            <option value={OrderStatus.IptalEdildi}>İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Firma</th>
              <th>Model</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Teknikler</th>
              <th>Atölye</th>
              <th>Durum</th>
              <th>Kabul Tarihi</th>
              <th>Termin</th>
              <th>QR Kod</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {processedOrders.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center" }}>
                  {searchTerm.trim()
                    ? "Arama kriterine uygun sipariş bulunamadı."
                    : "Size atanmış sipariş bulunmuyor."}
                </td>
              </tr>
            ) : (
              processedOrders.map((order) => (
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
                  <td>{order.firm?.firmName || "-"}</td>
                  <td>{order.model?.modelName || "-"}</td>
                  <td>{order.quantity || 0}</td>
                  <td>
                    <span className="unit-badge">
                      {getUnitText(order.unit)}
                    </span>
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
                                +{order.orderTechnics.length - 1} daha ▼
                              </button>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="no-technic">-</span>
                    )}
                  </td>
                  <td>{order.workshop?.name || "-"}</td>
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
                      <button
                        onClick={() =>
                          navigate(`/orderdetail/${order.orderId}`)
                        }
                        className="transfer-button"
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
                          <polyline points="9 18 15 12 9 6"></polyline>
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
        {processedOrders.length === 0 ? (
          <div className="order-card">
            <div className="order-card-header">
              <div className="order-card-title">
                {searchTerm.trim()
                  ? "Arama kriterine uygun sipariş bulunamadı"
                  : "Size atanmış sipariş bulunmuyor"}
              </div>
            </div>
          </div>
        ) : (
          processedOrders.map((order) => (
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
                <button
                  onClick={() => navigate(`/orderdetail/${order.orderId}`)}
                  className="transfer-button"
                  title="Detay"
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
              textAlign: "center",
            }}
          >
            <h2>QR Kod</h2>
            {qrPrintModal.qrCodeDataUrl && (
              <img
                src={qrPrintModal.qrCodeDataUrl}
                alt="QR Code"
                style={{ width: "200px", height: "200px" }}
              />
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
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
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

export default ModelistMyOrders;
