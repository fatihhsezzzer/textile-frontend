import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { modelistOrderService } from "../services/dataService";
import { Order, OrderStatus } from "../types";
import "./ModelistOrders.css";

const ModelistOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    unassigned: 0,
  });
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  const loadMyOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Yeni modelist endpoint'inden siparişleri çek
      const statusFilter =
        filterStatus !== "all" ? parseInt(filterStatus) : undefined;
      const myOrders = await modelistOrderService.getMyOrders(statusFilter);

      console.log("📦 Modeliste atanan siparişler:", myOrders);
      console.log("👤 Giriş yapan user:", user);
      console.log("📊 Bana atanan sipariş sayısı:", myOrders.length);

      setOrders(myOrders);
    } catch (err) {
      console.error("❌ Siparişler yüklenemedi:", err);
      alert("Siparişler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  }, [user, filterStatus]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await modelistOrderService.getStats();
      setStats(statsData);
      console.log("📊 İstatistikler:", statsData);
    } catch (err) {
      console.error("❌ İstatistikler yüklenemedi:", err);
    }
  }, []);

  useEffect(() => {
    loadMyOrders();
    loadStats();
  }, [loadMyOrders, loadStats]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    setUpdatingOrderId(orderId);
    try {
      // Modelist servisini kullanarak statüyü güncelle
      await modelistOrderService.updateStatus(orderId, newStatus);

      // Local state'i güncelle
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId ? { ...o, status: newStatus } : o
        )
      );

      // İstatistikleri yeniden yükle
      await loadStats();

      alert("✅ Sipariş durumu güncellendi!");
    } catch (err: any) {
      console.error("❌ Durum güncellenemedi:", err);
      alert(err.response?.data || "Durum güncellenemedi!");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filtrelenmiş siparişler - artık backend'den filtrelenmiş geliyor
  const filteredOrders = orders;

  const getStatusColor = (status?: OrderStatus) => {
    switch (status) {
      case OrderStatus.Atanmadi:
        return "#ffc107";
      case OrderStatus.Islemde:
        return "#17a2b8";
      case OrderStatus.Tamamlandi:
        return "#28a745";
      case OrderStatus.IptalEdildi:
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status?: OrderStatus) => {
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
        return "Bilinmiyor";
    }
  };

  if (loading) {
    return (
      <div className="modelist-orders-container">
        <div className="loading">Siparişler yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="modelist-orders-container">
      <div className="modelist-orders-header">
        <h2>Siparişlerim</h2>
        <p className="subtitle">
          Size atanan siparişleri görüntüleyin ve durumlarını güncelleyin
        </p>
      </div>

      {/* İstatistikler */}
      <div
        className="statistics-section"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}
          >
            {stats.total}
          </div>
          <div style={{ fontSize: "14px", color: "#95a5a6", marginTop: "5px" }}>
            Toplam Sipariş
          </div>
        </div>
        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#f39c12" }}
          >
            {stats.pending}
          </div>
          <div style={{ fontSize: "14px", color: "#95a5a6", marginTop: "5px" }}>
            Bekleyen
          </div>
        </div>
        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}
          >
            {stats.completed}
          </div>
          <div style={{ fontSize: "14px", color: "#95a5a6", marginTop: "5px" }}>
            Tamamlanan
          </div>
        </div>
        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#95a5a6" }}
          >
            {stats.unassigned}
          </div>
          <div style={{ fontSize: "14px", color: "#95a5a6", marginTop: "5px" }}>
            Atanmamış
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="filter-section">
        <label>Durum Filtresi:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">Tümü ({stats.total})</option>
          <option value={OrderStatus.Atanmadi.toString()}>
            Atanmadı ({stats.unassigned})
          </option>
          <option value={OrderStatus.Islemde.toString()}>
            İşlemde ({stats.pending})
          </option>
          <option value={OrderStatus.Tamamlandi.toString()}>
            Tamamlandı ({stats.completed})
          </option>
          <option value={OrderStatus.IptalEdildi.toString()}>
            İptal Edildi
          </option>
        </select>
      </div>

      {/* Siparişler Listesi */}
      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          {orders.length === 0 ? (
            <>
              <p>Size atanmış sipariş bulunmamaktadır.</p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#95a5a6",
                  marginTop: "10px",
                }}
              >
                Yöneticiniz size bir sipariş atadığında burada görünecektir.
              </p>
            </>
          ) : (
            <p>Seçili filtreye uygun sipariş bulunmamaktadır.</p>
          )}
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-card-header">
                <h3>{order.model?.modelName || "Model Yok"}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-info-row">
                  <strong>Firma:</strong>
                  <span>{order.firm?.firmName || "Bilinmiyor"}</span>
                </div>

                <div className="order-info-row">
                  <strong>Model Kodu:</strong>
                  <span>{order.model?.modelCode || "-"}</span>
                </div>

                <div className="order-info-row">
                  <strong>Miktar:</strong>
                  <span>{order.quantity}</span>
                </div>

                <div className="order-info-row">
                  <strong>Kabul Tarihi:</strong>
                  <span>
                    {order.acceptanceDate
                      ? new Date(order.acceptanceDate).toLocaleDateString(
                          "tr-TR"
                        )
                      : "-"}
                  </span>
                </div>

                {order.deadline && (
                  <div className="order-info-row">
                    <strong>Termin:</strong>
                    <span>
                      {new Date(order.deadline).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                )}

                {order.note && (
                  <div className="order-info-row">
                    <strong>Not:</strong>
                    <span className="order-note">{order.note}</span>
                  </div>
                )}

                {/* Sipariş Görselleri */}
                {order.images && order.images.length > 0 && (
                  <div className="order-images" style={{ marginTop: "15px" }}>
                    <strong style={{ display: "block", marginBottom: "10px" }}>
                      🖼️ Görseller ({order.images.length}):
                    </strong>
                    <div
                      className="images-preview-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(80px, 1fr))",
                        gap: "8px",
                      }}
                    >
                      {order.images.map((img) => {
                        const imageUrl = img.imageUrl?.startsWith("http")
                          ? img.imageUrl
                          : `https://api.bulutalbum.com${img.imageUrl}`;

                        return (
                          <div
                            key={img.orderImageId}
                            className="image-thumbnail"
                            style={{
                              position: "relative",
                              paddingBottom: "100%",
                              overflow: "hidden",
                              borderRadius: "8px",
                              cursor: "pointer",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              transition: "transform 0.2s",
                            }}
                            onClick={() =>
                              setImagePreviewModal({ show: true, imageUrl })
                            }
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={img.description || "Sipariş görseli"}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="order-card-footer">
                <label>Durum Değiştir:</label>
                <select
                  value={order.status || OrderStatus.Atanmadi}
                  onChange={(e) =>
                    handleStatusChange(order.orderId, parseInt(e.target.value))
                  }
                  disabled={updatingOrderId === order.orderId}
                  className="status-select"
                >
                  <option value={OrderStatus.Atanmadi}>Atanmadı</option>
                  <option value={OrderStatus.Islemde}>İşlemde</option>
                  <option value={OrderStatus.Tamamlandi}>Tamamlandı</option>
                  <option value={OrderStatus.IptalEdildi}>İptal Edildi</option>
                </select>
                {updatingOrderId === order.orderId && (
                  <span className="updating-indicator">Güncelleniyor...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewModal.show && (
        <div
          className="image-preview-modal"
          onClick={() => setImagePreviewModal({ show: false, imageUrl: "" })}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            cursor: "pointer",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImagePreviewModal({ show: false, imageUrl: "" });
            }}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 10001,
            }}
          >
            ×
          </button>
          <img
            src={imagePreviewModal.imageUrl}
            alt="Görsel önizleme"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ModelistOrders;
