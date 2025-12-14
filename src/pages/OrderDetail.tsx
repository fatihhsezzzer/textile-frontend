import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { orderService, costService } from "../services/dataService";
import { Order, OrderStatus, OrderWorkshopCost, ModelCost } from "../types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./OrderDetail.css";

interface OrderLog {
  logId: string;
  orderId: string;
  changedAt: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  changedByUserName: string;
  description?: string;
  changeToken?: string;
}

interface GroupedChange {
  changeToken: string;
  changedAt: string;
  changedByUserName: string;
  changes: OrderLog[];
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [groupedChanges, setGroupedChanges] = useState<GroupedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderCosts, setOrderCosts] = useState<OrderWorkshopCost[]>([]);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (orderId) {
      loadOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isAuthenticated]);

  const groupLogsByChangeToken = (logs: OrderLog[]): GroupedChange[] => {
    const grouped: { [key: string]: GroupedChange } = {};

    logs.forEach((log) => {
      const token = log.changeToken || log.logId;

      if (!grouped[token]) {
        grouped[token] = {
          changeToken: token,
          changedAt: log.changedAt,
          changedByUserName: log.changedByUserName,
          changes: [],
        };
      }
      grouped[token].changes.push(log);
    });

    return Object.values(grouped).sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const [orderData, logsData] = await Promise.all([
        orderService.getById(orderId!),
        orderService.getOrderLogs(orderId!),
      ]);
      setOrder(orderData);
      const sortedLogs = logsData.sort(
        (a, b) =>
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );
      setGroupedChanges(groupLogsByChangeToken(sortedLogs));
    } catch (error) {
      console.error("Failed to load order details:", error);
      alert("Sipariş detayları yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Order yüklendikten sonra maliyetleri yükle
  useEffect(() => {
    if (order) {
      loadOrderCosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId, order?.modelId]);

  const loadOrderCosts = async () => {
    if (!orderId) return;
    try {
      setCostsLoading(true);

      // Workshop maliyetlerini yükle
      const workshopCosts = await costService.getOrderWorkshopCosts(orderId);
      setOrderCosts(workshopCosts);

      // Model maliyetlerini yükle (eğer model varsa)
      if (order?.modelId) {
        try {
          const costs = await costService.getOrderModelCosts(
            orderId,
            order.modelId
          );
          setModelCosts(costs);
        } catch (error) {
          console.error("Failed to load model costs:", error);
          // Model maliyetleri yoksa devam et
        }
      }
    } catch (error) {
      console.error("Failed to load order costs:", error);
      // Hata durumunda sessizce devam et, maliyet bilgisi opsiyonel
    } finally {
      setCostsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getChangeIcon = (changeType: string) => {
    const icons: { [key: string]: string } = {
      Status: "📊",
      Workshop: "🏭",
      Operator: "👷",
      Price: "💰",
      Quantity: "📦",
      Priority: "⚡",
      Deadline: "📅",
      Note: "📝",
      Created: "✨",
      Updated: "🔄",
    };
    return icons[changeType] || "📌";
  };

  const getStatusColor = (status?: OrderStatus) => {
    if (status === undefined) return "#95a5a6";
    const colors: { [key: number]: string } = {
      [OrderStatus.Atanmadi]: "#f39c12",
      [OrderStatus.Islemde]: "#3498db",
      [OrderStatus.Tamamlandi]: "#27ae60",
      [OrderStatus.IptalEdildi]: "#e74c3c",
    };
    return colors[status] || "#95a5a6";
  };

  const getStatusLabel = (status?: OrderStatus) => {
    if (status === undefined) return "Bilinmiyor";
    const labels: { [key: number]: string } = {
      [OrderStatus.Atanmadi]: "Atanmadı",
      [OrderStatus.Islemde]: "İşlemde",
      [OrderStatus.Tamamlandi]: "Tamamlandı",
      [OrderStatus.IptalEdildi]: "İptal Edildi",
    };
    return labels[status] || "Bilinmiyor";
  };

  if (loading) {
    return <PageLoader message="Sipariş detayı yükleniyor..." />;
  }

  if (!order) {
    return (
      <div className="order-detail-error">
        <p>Sipariş bulunamadı</p>
        <button onClick={() => navigate("/orders")}>Siparişlere Dön</button>
      </div>
    );
  }

  return (
    <div className="order-detail-container">
      {/* Header */}
      <div className="order-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Geri
        </button>
        <h1>Sipariş Detayı</h1>
      </div>

      {/* Order Info Card */}
      <div className="order-info-card">
        <div className="order-info-grid">
          <div className="info-section">
            <h3>Genel Bilgiler</h3>
            <div className="info-row">
              <span className="info-label">Firma:</span>
              <span className="info-value">{order.firm?.firmName || "-"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Model:</span>
              <span className="info-value">
                {order.model?.modelName || "-"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Miktar:</span>
              <span className="info-value">{order.quantity} adet</span>
            </div>
            <div className="info-row">
              <span className="info-label">Birim Fiyat:</span>
              <span className="info-value">
                {order.price
                  ? formatCurrency(
                      order.price,
                      order.priceCurrency || order.currency || "TRY"
                    )
                  : "-"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Durum:</span>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>
          </div>

          <div className="info-section">
            <h3>Atölye & Operatör</h3>
            <div className="info-row">
              <span className="info-label">Atölye:</span>
              <span className="info-value">
                {order.workshop?.name || "Atanmadı"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Operatör:</span>
              <span className="info-value">
                {order.operator
                  ? `${order.operator.firstName} ${order.operator.lastName}`
                  : "Atanmadı"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Öncelik:</span>
              <span className="info-value">{order.priority || "Normal"}</span>
            </div>
          </div>

          <div className="info-section">
            <h3>Tarihler</h3>
            <div className="info-row">
              <span className="info-label">Kabul Tarihi:</span>
              <span className="info-value">
                {formatDate(order.acceptanceDate)}
              </span>
            </div>
            {order.deadline && (
              <div className="info-row">
                <span className="info-label">Son Tarih:</span>
                <span className="info-value">{formatDate(order.deadline)}</span>
              </div>
            )}
            {order.completionDate && (
              <div className="info-row">
                <span className="info-label">Tamamlanma:</span>
                <span className="info-value">
                  {formatDate(order.completionDate)}
                </span>
              </div>
            )}
          </div>

          {/* Süre Hesaplamaları */}
          <div className="info-section">
            <h3>Süre Analizi</h3>
            {order.completionDate && (
              <div className="info-row">
                <span className="info-label">Firmada Geçen Süre:</span>
                <span className="info-value">
                  {(() => {
                    const created = new Date(order.createdAt);
                    const completed = new Date(order.completionDate);
                    const diffTime = Math.abs(
                      completed.getTime() - created.getTime()
                    );

                    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));
                    const days = Math.floor(totalHours / 24);
                    const hours = totalHours % 24;

                    if (days > 0 && hours > 0) {
                      return `${days} gün ${hours} saat`;
                    } else if (days > 0) {
                      return `${days} gün`;
                    } else if (hours > 0) {
                      return `${hours} saat`;
                    } else {
                      return "1 saat";
                    }
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>

        {order.note && (
          <div className="order-note">
            <h4>📝 Not:</h4>
            <p>{order.note}</p>
          </div>
        )}

        {order.images && order.images.length > 0 && (
          <div className="order-images">
            <h4>🖼️ Görseller:</h4>
            <div className="images-grid">
              {order.images.map((img) => {
                const imageUrl = img.imageUrl?.startsWith("http")
                  ? img.imageUrl
                  : `https://api.bulutalbum.com${img.imageUrl}`;

                return (
                  <div key={img.orderImageId} className="image-item">
                    <img
                      src={imageUrl}
                      alt={img.description || "Order"}
                      onClick={() =>
                        setImagePreviewModal({ show: true, imageUrl })
                      }
                      style={{ cursor: "pointer" }}
                    />
                    {img.description && <p>{img.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Combined Cost Summary */}
      {(orderCosts.length > 0 || modelCosts.length > 0) && (
        <div
          className="costs-section"
          style={{
            marginTop: "30px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h2 style={{ color: "white", marginBottom: "20px" }}>
            💰 Toplam Maliyet Özeti
          </h2>
          <div className="costs-summary-cards">
            {orderCosts.length > 0 && (
              <div
                className="summary-card"
                style={{ background: "rgba(255, 255, 255, 0.95)" }}
              >
                <div className="summary-icon">🏭</div>
                <div className="summary-content">
                  <h4>Atölye Maliyetleri</h4>
                  <p
                    className="summary-value"
                    style={{ fontSize: "1.8em", color: "#667eea" }}
                  >
                    {formatCurrency(
                      orderCosts.reduce((sum, c) => sum + c.totalCost, 0)
                    )}
                  </p>
                  <small>{orderCosts.length} kalem</small>
                </div>
              </div>
            )}
            {modelCosts.length > 0 && (
              <div
                className="summary-card"
                style={{ background: "rgba(255, 255, 255, 0.95)" }}
              >
                <div className="summary-icon">📊</div>
                <div className="summary-content">
                  <h4>Model Maliyetleri</h4>
                  <p
                    className="summary-value"
                    style={{ fontSize: "1.8em", color: "#764ba2" }}
                  >
                    {formatCurrency(
                      modelCosts.reduce((sum, c) => sum + (c.totalCost || 0), 0)
                    )}
                  </p>
                  <small>{modelCosts.length} kalem</small>
                </div>
              </div>
            )}
            <div
              className="summary-card"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                border: "3px solid #ffd700",
              }}
            >
              <div className="summary-icon">💎</div>
              <div className="summary-content">
                <h4>Genel Toplam</h4>
                <p
                  className="summary-value"
                  style={{
                    fontSize: "2em",
                    color: "#f57c00",
                    fontWeight: "bold",
                  }}
                >
                  {formatCurrency(
                    orderCosts.reduce((sum, c) => sum + c.totalCost, 0) +
                      modelCosts.reduce((sum, c) => sum + (c.totalCost || 0), 0)
                  )}
                </p>
                <small>Tüm maliyetler</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workshop Costs Section */}
      {orderCosts.length > 0 && (
        <div className="costs-section">
          <h2>💰 Atölye Maliyetleri</h2>
          {costsLoading ? (
            <div className="loading-costs">Maliyetler yükleniyor...</div>
          ) : (
            <div className="costs-summary">
              <div className="costs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Atölye</th>
                      <th>Maliyet Kalemi</th>
                      <th>Kategori</th>
                      <th>Miktar</th>
                      <th>Birim Fiyat</th>
                      <th>Toplam</th>
                      <th>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderCosts.map((cost) => (
                      <tr key={cost.orderWorkshopCostId}>
                        <td>
                          <strong>{cost.workshop?.name || "-"}</strong>
                        </td>
                        <td>{cost.costItem?.itemName || "-"}</td>
                        <td>
                          <span className="category-badge">
                            {cost.costItem?.costCategory?.categoryName || "-"}
                          </span>
                        </td>
                        <td>
                          {cost.quantityUsed}{" "}
                          <span className="unit-text">
                            {cost.costItem?.costUnit?.unitCode ||
                              cost.costItem?.unit ||
                              ""}
                          </span>
                        </td>
                        <td>
                          {formatCurrency(cost.actualPrice, cost.currency)}
                        </td>
                        <td className="total-cell">
                          <strong>
                            {formatCurrency(cost.totalCost, cost.currency)}
                          </strong>
                        </td>
                        <td>
                          <small>{cost.notes || "-"}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={5} style={{ textAlign: "right" }}>
                        <strong>TOPLAM MALİYET:</strong>
                      </td>
                      <td className="total-cell">
                        <strong className="grand-total">
                          {formatCurrency(
                            orderCosts.reduce(
                              (sum, cost) => sum + cost.totalCost,
                              0
                            )
                          )}
                        </strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="costs-summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">🏭</div>
                  <div className="summary-content">
                    <h4>Kullanılan Atölye</h4>
                    <p className="summary-value">
                      {new Set(orderCosts.map((c) => c.workshopId)).size} atölye
                    </p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">📦</div>
                  <div className="summary-content">
                    <h4>Toplam Kalem</h4>
                    <p className="summary-value">{orderCosts.length} adet</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">💵</div>
                  <div className="summary-content">
                    <h4>Ortalama Kalem Maliyeti</h4>
                    <p className="summary-value">
                      {formatCurrency(
                        orderCosts.reduce((sum, c) => sum + c.totalCost, 0) /
                          orderCosts.length
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Costs Section */}
      {modelCosts.length > 0 && (
        <div className="costs-section" style={{ marginTop: "30px" }}>
          <h2>📊 Model Maliyetleri</h2>
          {costsLoading ? (
            <div className="loading-costs">Maliyetler yükleniyor...</div>
          ) : (
            <div className="costs-summary">
              <div className="costs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Öncelik</th>
                      <th>Maliyet Kalemi</th>
                      <th>Kategori</th>
                      <th>Atölye</th>
                      <th>Miktar 1</th>
                      <th>Miktar 2</th>
                      <th>Fire %</th>
                      <th>Net Miktar</th>
                      <th>Birim Fiyat</th>
                      <th>Toplam</th>
                      <th>Kullanım</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelCosts
                      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
                      .map((cost) => (
                        <tr key={cost.modelCostId}>
                          <td>
                            <span
                              style={{
                                background: "#f0f8ff",
                                color: "#007acc",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                fontSize: "12px",
                              }}
                            >
                              #{cost.priority || "-"}
                            </span>
                          </td>
                          <td>
                            <strong>{cost.costItem?.itemName || "-"}</strong>
                          </td>
                          <td>
                            <span className="category-badge">
                              {cost.costItem?.costCategory?.categoryName || "-"}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: "#7c3aed", fontWeight: 500 }}>
                              {cost.oldWorkshopName || "-"}
                            </span>
                          </td>
                          <td>
                            <strong>{cost.quantity}</strong>
                            {cost.costItem?.costUnit && (
                              <span
                                style={{
                                  marginLeft: "4px",
                                  fontSize: "0.85em",
                                  color: "#666",
                                }}
                              >
                                {cost.costItem.costUnit.unitCode}
                              </span>
                            )}
                          </td>
                          <td>
                            {cost.quantity2 ? (
                              <>
                                <strong>{cost.quantity2}</strong>
                                {cost.unit2 && (
                                  <span
                                    style={{
                                      marginLeft: "4px",
                                      fontSize: "0.85em",
                                      color: "#666",
                                    }}
                                  >
                                    {cost.unit2}
                                  </span>
                                )}
                                <div
                                  style={{
                                    fontSize: "0.75em",
                                    color: "#ff9800",
                                    marginTop: "2px",
                                  }}
                                >
                                  {cost.quantity} × {cost.quantity2} ={" "}
                                  {formatNumber(cost.quantity * cost.quantity2)}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "#ccc" }}>-</span>
                            )}
                          </td>
                          <td>
                            {cost.costItem?.wastagePercentage ? (
                              <span style={{ color: "#ff9800" }}>
                                %{cost.costItem.wastagePercentage}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {cost.actualQuantityNeeded ? (
                              <strong style={{ color: "#2e7d32" }}>
                                {formatNumber(cost.actualQuantityNeeded)}
                              </strong>
                            ) : (
                              cost.quantity
                            )}
                          </td>
                          <td>
                            {cost.unitPrice &&
                              formatCurrency(
                                cost.unitPrice,
                                cost.currency || "TRY"
                              )}
                          </td>
                          <td className="total-cell">
                            <strong>
                              {cost.totalCost &&
                                formatCurrency(
                                  cost.totalCost,
                                  cost.currency || "TRY"
                                )}
                            </strong>
                          </td>
                          <td>
                            <small>{cost.usage || "-"}</small>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={8} style={{ textAlign: "right" }}>
                        <strong>TOPLAM MODEL MALİYET:</strong>
                      </td>
                      <td className="total-cell">
                        <strong className="grand-total">
                          {formatCurrency(
                            modelCosts.reduce(
                              (sum, cost) => sum + (cost.totalCost || 0),
                              0
                            )
                          )}
                        </strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="costs-summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">🎨</div>
                  <div className="summary-content">
                    <h4>Model</h4>
                    <p className="summary-value">
                      {order?.model?.modelName || "Model bilgisi yok"}
                    </p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">📦</div>
                  <div className="summary-content">
                    <h4>Toplam Kalem</h4>
                    <p className="summary-value">{modelCosts.length} adet</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">💵</div>
                  <div className="summary-content">
                    <h4>Ortalama Kalem Maliyeti</h4>
                    <p className="summary-value">
                      {formatCurrency(
                        modelCosts.reduce(
                          (sum, c) => sum + (c.totalCost || 0),
                          0
                        ) / modelCosts.length
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-section">
        <h2>📜 Sipariş Geçmişi</h2>
        {groupedChanges.length === 0 ? (
          <div className="no-logs">
            <p>Henüz geçmiş kaydı bulunmuyor.</p>
          </div>
        ) : (
          <div className="timeline">
            {groupedChanges.map((group, groupIndex) => (
              <div key={group.changeToken} className="timeline-group">
                <div className="timeline-group-header">
                  <div className="timeline-marker">
                    <div className="timeline-icon">🔄</div>
                    <div className="timeline-line" />
                  </div>
                  <div className="timeline-group-info">
                    <div className="timeline-header">
                      <h4>
                        {group.changes.length > 1
                          ? `${group.changes.length} Değişiklik`
                          : "Tek Değişiklik"}
                      </h4>
                      <div className="timeline-date-container">
                        <span className="timeline-date">
                          📅 {formatDate(group.changedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="timeline-footer">
                      <span className="changed-by">
                        👤 {group.changedByUserName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="timeline-group-changes">
                  {group.changes.map((log, index) => (
                    <div key={log.logId} className="timeline-item">
                      <div className="timeline-change-marker">
                        <div className="timeline-change-icon">
                          {getChangeIcon(log.changeType)}
                        </div>
                        {index < group.changes.length - 1 && (
                          <div className="timeline-change-line" />
                        )}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h5>{log.changeType}</h5>
                        </div>
                        <div className="timeline-body">
                          {log.oldValue && (
                            <div className="change-detail">
                              <span className="change-label">Eski:</span>
                              <span className="old-value">{log.oldValue}</span>
                            </div>
                          )}
                          {log.newValue && (
                            <div className="change-detail">
                              <span className="change-label">Yeni:</span>
                              <span className="new-value">{log.newValue}</span>
                            </div>
                          )}
                          {log.description && (
                            <p className="log-description">{log.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            onClick={() => setImagePreviewModal({ show: false, imageUrl: "" })}
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
            alt="Büyük önizleme"
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

export default OrderDetail;
