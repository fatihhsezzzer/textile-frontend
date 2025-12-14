import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Order, Workshop, Operator, OrderStatus } from "../types";
import {
  orderService,
  workshopService,
  operatorService,
} from "../services/dataService";
import { costService } from "../services/costService";
import { formatCurrency, formatNumber } from "../utils/formatters";
import WorkshopTransferModal from "../components/WorkshopTransferModal";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import "./OrderQRDetail.css";

const OrderQRDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
      loadWorkshops();
      loadOperators();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const orderData = await orderService.getById(orderId!);
      console.log("📦 QR Order loaded:", orderData);
      setOrder(orderData);
    } catch (error) {
      console.error("Failed to load order:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkshops = async () => {
    try {
      const data = await workshopService.getAll();
      setWorkshops(data);
    } catch (error) {
      console.error("Failed to load workshops:", error);
    }
  };

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll();
      setOperators(data);
    } catch (error) {
      console.error("Failed to load operators:", error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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

  const getUnitLabel = (unit?: number) => {
    const units: { [key: number]: string } = {
      1: "Adet",
      2: "Metre",
      3: "Takım",
    };
    return units[unit || 0] || "Adet";
  };

  const handleTransferSave = async (operatorId: string, costs: any[]) => {
    if (!order) return;

    console.log("🔵 handleTransferSave called with:", {
      operatorId,
      costs,
      costsLength: costs?.length,
    });
    console.log("🔍 Order unit value:", order.unit, "Type:", typeof order.unit);
    console.log("🔍 Full order object:", order);

    try {
      // Seçilen atölyeyi bul
      const targetWorkshop = workshops.find(
        (w) => w.workshopId === selectedWorkshopId
      );
      const workshopName = targetWorkshop?.name?.toLowerCase() || "";

      // Statüyü atölyeye göre belirle
      let newStatus = order.status;
      if (
        workshopName.includes("biten") ||
        workshopName.includes("tamamlanan") ||
        workshopName.includes("tamamlandı")
      ) {
        // "Tamamlanan İşler/Siparişler" veya "Biten" atölyesine taşınırsa -> Tamamlandı
        newStatus = OrderStatus.Tamamlandi;
      } else if (workshopName.includes("atanmamış")) {
        // "Atanmamış İşler" atölyesine taşınırsa -> Atanmadı
        newStatus = OrderStatus.Atanmadi;
      } else if (selectedWorkshopId) {
        // Diğer atölyelere taşınırsa -> İşlemde
        newStatus = OrderStatus.Islemde;
      }

      // Yeni atama endpointi için payload
      const assignPayload = {
        workshopId: selectedWorkshopId,
        operatorId: operatorId,
        orderStatusId: newStatus,
      };
      console.log("📤 Sending assignPayload to API:", assignPayload);
      await orderService.assign(orderId!, assignPayload);
      console.log("✅ Workshop, operator and status assigned successfully");

      // Save model costs if any
      console.log("🔍 Checking costs:", {
        hasCosts: !!costs,
        costsLength: costs?.length,
        costsArray: costs,
      });
      if (costs && costs.length > 0) {
        console.log(
          "💰 Starting to save model costs. Total count:",
          costs.length
        );
        for (let i = 0; i < costs.length; i++) {
          const cost = costs[i];
          console.log(`💰 Processing cost ${i + 1}/${costs.length}:`, cost);

          const modelCostData = {
            modelId: order.modelId,
            orderId: order.orderId,
            costItemId: cost.costItemId,
            quantity: cost.quantityUsed,
            unit: cost.unit,
            quantity2: cost.quantity2,
            unit2: cost.unit2,
            quantity3: cost.quantity3,
            unit3: cost.unit3,
            costUnitId3: cost.costUnitId3,
            unitPrice: cost.actualPrice,
            totalCost: cost.totalCost,
            currency: cost.currency,
            usage: cost.notes || undefined,
            isActive: true,
          };

          console.log(`📤 Sending ModelCost ${i + 1}:`, modelCostData);
          await costService.addModelCost(modelCostData);
          console.log(`✅ ModelCost ${i + 1} saved successfully`);
        }
        console.log("✅ All model costs saved successfully");
      } else {
        console.log("ℹ️ No costs to save (costs empty or undefined)");
      }

      // Close modal and refresh
      setShowTransferModal(false);
      setSelectedWorkshopId("");
      setSelectedOperatorId("");
      await loadOrderDetails();

      alert("✅ Atölye transferi başarıyla tamamlandı!");
    } catch (error) {
      console.error("❌ Transfer failed:", error);
      alert("Transfer sırasında bir hata oluştu!");
      throw error;
    }
  };

  if (loading) {
    return (
      <>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="qr-detail-container">
          <div className="qr-detail-loading">
            <div className="spinner"></div>
            <p>Sipariş bilgileri yükleniyor...</p>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="qr-detail-container">
          <div className="qr-detail-error">
            <div className="error-icon">⚠️</div>
            <h2>Sipariş Bulunamadı</h2>
            <p>Bu sipariş silinmiş veya mevcut değil.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="qr-detail-container">
        {/* Header Section */}
        <div className="qr-detail-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-text">
                <h1>Sipariş Detayı</h1>
                <p className="order-id">#{order.orderId}</p>
              </div>
            </div>
            <div
              className="status-badge-large"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {getStatusLabel(order.status)}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="qr-detail-content">
          {/* Firma Card */}
          <div className="info-card gradient-card-1">
            <div className="card-content">
              <h3>Firma Bilgileri</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Firma Adı:</span>
                  <span className="info-value">
                    {order.firm?.firmName || "-"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Firma Kodu:</span>
                  <span className="info-value">
                    {order.firm?.firmCode || "-"}
                  </span>
                </div>
                {order.firm?.contactPerson && (
                  <div className="info-item">
                    <span className="info-label">Yetkili:</span>
                    <span className="info-value">
                      {order.firm.contactPerson}
                    </span>
                  </div>
                )}
                {order.firm?.phone && (
                  <div className="info-item">
                    <span className="info-label">Telefon:</span>
                    <span className="info-value">{order.firm.phone}</span>
                  </div>
                )}
                {order.firm?.email && (
                  <div className="info-item">
                    <span className="info-label">E-posta:</span>
                    <span className="info-value">{order.firm.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Model Card */}
          <div className="info-card gradient-card-6">
            <div className="card-content">
              <h3>Model Bilgileri</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Model Adı:</span>
                  <span className="info-value">
                    {order.model?.modelName || "-"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Model Kodu:</span>
                  <span className="info-value">
                    {order.model?.modelCode || "-"}
                  </span>
                </div>
                {order.model?.category && (
                  <div className="info-item">
                    <span className="info-label">Kategori:</span>
                    <span className="info-value">{order.model.category}</span>
                  </div>
                )}
                {order.model?.season && (
                  <div className="info-item">
                    <span className="info-label">Sezon:</span>
                    <span className="info-value">{order.model.season}</span>
                  </div>
                )}
                {order.model?.color && (
                  <div className="info-item">
                    <span className="info-label">Renk:</span>
                    <span className="info-value">{order.model.color}</span>
                  </div>
                )}
                {order.model?.size && (
                  <div className="info-item">
                    <span className="info-label">Beden:</span>
                    <span className="info-value">{order.model.size}</span>
                  </div>
                )}
                {order.model?.fabric && (
                  <div className="info-item">
                    <span className="info-label">Kumaş:</span>
                    <span className="info-value">{order.model.fabric}</span>
                  </div>
                )}
              </div>
              {order.model?.description && (
                <div className="info-item" style={{ marginTop: "15px" }}>
                  <span className="info-label">Açıklama:</span>
                  <p className="note-text" style={{ marginTop: "5px" }}>
                    {order.model.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Miktar & Fiyat Card - Sadece Manager için */}
          {user?.role === "Manager" && (
            <div className="info-card gradient-card-2">
              <div className="card-content">
                <h3>Miktar & Fiyat</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Miktar:</span>
                    <span className="info-value highlight">
                      {order.quantity} {getUnitLabel(order.unit)}
                    </span>
                  </div>
                  {order.pieceCount && (
                    <div className="info-item">
                      <span className="info-label">Parça/Takım:</span>
                      <span className="info-value">{order.pieceCount}</span>
                    </div>
                  )}
                  {order.price && (
                    <div className="info-item">
                      <span className="info-label">Fiyat:</span>
                      <span className="info-value highlight">
                        {formatCurrency(order.price, order.priceCurrency)}
                      </span>
                    </div>
                  )}
                  {order.price && order.quantity && (
                    <div className="info-item">
                      <span className="info-label">Toplam:</span>
                      <span className="info-value highlight-total">
                        {formatCurrency(
                          order.price * order.quantity,
                          order.priceCurrency
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Atölye Card with Transfer Button */}
          <div className="info-card gradient-card-3">
            <div className="card-content">
              <h3>Atölye Bilgileri</h3>
              <div className="workshop-info">
                <div className="current-workshop">
                  <span className="workshop-label">Mevcut Atölye:</span>
                  <span className="workshop-name">
                    {order.workshop?.name || "Atanmadı"}
                  </span>
                </div>

                {/* Workshop Selection */}
                <div className="workshop-select-wrapper">
                  <label className="workshop-select-label">
                    Yeni Atölye Seç:
                  </label>
                  <select
                    className="workshop-select"
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  >
                    <option value="">Atölye Seçiniz</option>
                    {workshops
                      .filter((w) => w.workshopId !== order.workshopId)
                      .map((w) => (
                        <option key={w.workshopId} value={w.workshopId}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  className="transfer-button"
                  onClick={() => {
                    if (selectedWorkshopId) {
                      setShowTransferModal(true);
                    } else {
                      alert("Lütfen önce yeni bir atölye seçiniz!");
                    }
                  }}
                  disabled={
                    order.status === OrderStatus.Tamamlandi ||
                    !selectedWorkshopId
                  }
                >
                  Atölye Transfer Et
                </button>
              </div>
              {order.operator && (
                <div className="info-item" style={{ marginTop: "15px" }}>
                  <span className="info-label">Operatör:</span>
                  <span className="info-value">
                    {`${order.operator.firstName} ${order.operator.lastName}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tarihler Card */}
          <div className="info-card gradient-card-4">
            <div className="card-content">
              <h3>Tarihler & Öncelik</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Kabul Tarihi:</span>
                  <span className="info-value">
                    {formatDate(order.acceptanceDate)}
                  </span>
                </div>
                {order.deadline && (
                  <div className="info-item">
                    <span className="info-label">Termin:</span>
                    <span className="info-value">
                      {formatDate(order.deadline)}
                    </span>
                  </div>
                )}
                {order.completionDate && (
                  <div className="info-item">
                    <span className="info-label">Tamamlanma:</span>
                    <span className="info-value">
                      {formatDate(order.completionDate)}
                    </span>
                  </div>
                )}
                {order.priority && (
                  <div className="info-item">
                    <span className="info-label">Öncelik:</span>
                    <span className="info-value highlight">
                      {order.priority}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Teknikler Card */}
          {order.orderTechnics && order.orderTechnics.length > 0 && (
            <div className="info-card full-width gradient-card-5">
              <div className="card-content">
                <h3>Teknikler</h3>
                <div className="technics-grid">
                  {order.orderTechnics.map((ot, index) => (
                    <div
                      key={ot.orderTechnicId || index}
                      className="technic-badge"
                    >
                      {ot.technic?.name || "-"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Not Card */}
          {order.note && (
            <div className="info-card full-width gradient-card-6">
              <div className="card-content">
                <h3>Not</h3>
                <p className="note-text">{order.note}</p>
              </div>
            </div>
          )}

          {/* Fatura Bilgileri */}
          {(order.invoice || order.invoiceNumber) && (
            <div className="info-card full-width">
              <div className="card-content">
                <h3>Fatura Bilgileri</h3>
                <div className="info-grid">
                  {order.invoice && (
                    <div className="info-item">
                      <span className="info-label">Fatura:</span>
                      <span className="info-value">{order.invoice}</span>
                    </div>
                  )}
                  {order.invoiceNumber && (
                    <div className="info-item">
                      <span className="info-label">Fatura No:</span>
                      <span className="info-value">{order.invoiceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Görseller */}
          {((order.images && order.images.length > 0) ||
            order.model?.imageUrl) && (
            <div className="info-card full-width">
              <div className="card-content">
                <h3>Görseller</h3>
                <div className="images-grid-qr">
                  {/* Model Görseli */}
                  {order.model?.imageUrl && (
                    <div
                      className="image-item-qr model-image"
                      onClick={() => setLightboxImage(order.model!.imageUrl!)}
                    >
                      <img
                        src={order.model.imageUrl}
                        alt={order.model.modelName || "Model"}
                      />
                      <p>Model Görseli</p>
                    </div>
                  )}
                  {/* Sipariş Görselleri */}
                  {(order.images ?? []).map((img) => {
                    const imageUrl = img.imageUrl?.startsWith("http")
                      ? img.imageUrl
                      : `https://api.bulutalbum.com${img.imageUrl}`;
                    return (
                      <div
                        key={img.orderImageId}
                        className="image-item-qr"
                        onClick={() => setLightboxImage(imageUrl)}
                      >
                        <img src={imageUrl} alt={img.description || "Order"} />
                        {img.description && <p>{img.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox for images */}
        {lightboxImage && (
          <div
            className="lightbox-overlay"
            onClick={() => setLightboxImage(null)}
          >
            <div className="lightbox-content">
              <button
                className="lightbox-close"
                onClick={() => setLightboxImage(null)}
              >
                ✕
              </button>
              <img src={lightboxImage} alt="Full size" />
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="qr-detail-footer">
          <div className="footer-info">
            <span>Oluşturulma: {formatDate(order.createdAt)}</span>
            {order.updatedAt && (
              <span>Güncelleme: {formatDate(order.updatedAt)}</span>
            )}
          </div>
        </div>

        {/* Transfer Modal */}
        {showTransferModal && order && selectedWorkshopId && (
          <WorkshopTransferModal
            isOpen={showTransferModal}
            orderId={order.orderId}
            orderQuantity={order.quantity}
            oldWorkshopId={order.workshopId || null}
            oldWorkshopName={order.workshop?.name || "Atanmadı"}
            newWorkshopId={selectedWorkshopId}
            newWorkshopName={
              workshops.find((w) => w.workshopId === selectedWorkshopId)
                ?.name || "Yeni Atölye"
            }
            operators={operators.filter(
              (op) => op.workshopId === order.workshopId
            )}
            selectedOperatorId={selectedOperatorId}
            onOperatorChange={(opId) => setSelectedOperatorId(opId)}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedWorkshopId("");
              setSelectedOperatorId("");
            }}
            onSave={handleTransferSave}
          />
        )}
      </div>
    </>
  );
};

export default OrderQRDetail;
