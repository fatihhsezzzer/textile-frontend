import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  orderService,
  workshopService,
  operatorService,
  exchangeRateService,
  costService,
} from "../services/dataService";
import {
  Order,
  Workshop,
  Operator,
  OrderStatus,
  OrderWorkshopCost,
} from "../types";
import { useAuth } from "../context/AuthContext";
import WorkshopTransferModal from "../components/WorkshopTransferModal";
import "./WorkshopManager.css";

const WorkshopManager: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>("all");
  const [expandedWorkshops, setExpandedWorkshops] = useState<Set<string>>(
    new Set()
  );

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingWorkshopChange, setPendingWorkshopChange] = useState<{
    orderId: string;
    newWorkshopId: string | null;
    oldWorkshopId: string | undefined;
    orderQuantity?: number;
  } | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  const [exchangeRates, setExchangeRates] = useState<{
    USD: number | null;
    EUR: number | null;
    GBP: number | null;
    date: string;
  }>({ USD: null, EUR: null, GBP: null, date: new Date().toISOString() });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadData();
    loadExchangeRates();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, workshopsData, operatorsData] = await Promise.all([
        orderService.getAll(),
        workshopService.getAll(),
        operatorService.getAll(),
      ]);
      setOrders(ordersData);
      setWorkshops(workshopsData);
      setOperators(operatorsData);
    } catch (error) {
      console.error("❌ Veri yükleme hatası:", error);
      alert("Veriler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const rates = await exchangeRateService.getLatest();
      const usdRate = rates.find((rate) => rate.currencyCode === "USD");
      const eurRate = rates.find((rate) => rate.currencyCode === "EUR");
      const gbpRate = rates.find((rate) => rate.currencyCode === "GBP");

      setExchangeRates({
        USD: usdRate?.banknoteSelling || null,
        EUR: eurRate?.banknoteSelling || null,
        GBP: gbpRate?.banknoteSelling || null,
        date: usdRate?.rateDate || new Date().toISOString(),
      });
    } catch (error) {
      console.error("⚠️ Döviz kurları yüklenemedi:", error);
    }
  };

  // Workshop'a göre siparişleri grupla
  const groupOrdersByWorkshop = () => {
    const groups: { [workshopId: string]: Order[] } = {};

    // Atanmamış siparişler için null grup
    groups["null"] = orders.filter((order) => !order.workshopId);

    // Her workshop için grup
    workshops.forEach((workshop) => {
      groups[workshop.workshopId] = orders.filter(
        (order) => order.workshopId === workshop.workshopId
      );
    });

    return groups;
  };

  // Filtreleme
  const filterOrders = (orderList: Order[]) => {
    return orderList.filter((order) => {
      const matchesSearch =
        searchTerm === "" ||
        order.model?.modelName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.firm?.firmName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWorkshop =
        selectedWorkshop === "all" ||
        (selectedWorkshop === "null" && !order.workshopId) ||
        order.workshopId === selectedWorkshop;

      return matchesSearch && matchesWorkshop;
    });
  };

  const toggleWorkshop = (workshopId: string) => {
    const newExpanded = new Set(expandedWorkshops);
    if (newExpanded.has(workshopId)) {
      newExpanded.delete(workshopId);
    } else {
      newExpanded.add(workshopId);
    }
    setExpandedWorkshops(newExpanded);
  };

  // Sipariş durumu renkleri
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Atanmadi:
        return "#dc3545";
      case OrderStatus.Islemde:
        return "#ffc107";
      case OrderStatus.Tamamlandi:
        return "#28a745";
      case OrderStatus.IptalEdildi:
        return "#6c757d";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Atanmadi:
        return "Atanmadı";
      case OrderStatus.Islemde:
        return "İşlemde";
      case OrderStatus.Tamamlandi:
        return "Tamamlandı";
      case OrderStatus.IptalEdildi:
        return "İptal";
      default:
        return "Bilinmiyor";
    }
  };

  // Süre hesaplama
  const calculateDuration = (order: Order) => {
    if (!order.createdAt) return "-";
    const start = new Date(order.createdAt);
    const end = order.updatedAt ? new Date(order.updatedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days}g ${hours}s`;
    return `${hours}s`;
  };

  // Atölye değiştirme
  const handleWorkshopChange = (
    orderId: string,
    newWorkshopId: string | null
  ) => {
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) return;

    setPendingWorkshopChange({
      orderId,
      newWorkshopId,
      oldWorkshopId: order.workshopId,
      orderQuantity: order.quantity,
    });
    setSelectedOperatorId(""); // Reset operator selection
    setShowTransferModal(true);
  };

  const handleTransferSave = async (
    operatorId: string,
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
  ) => {
    if (!pendingWorkshopChange) return;

    const { orderId, newWorkshopId, oldWorkshopId } = pendingWorkshopChange;

    try {
      // Maliyet kaydetme
      if (costs.length > 0 && oldWorkshopId) {
        for (const cost of costs) {
          const modelCostData = {
            modelId: orders.find((o) => o.orderId === orderId)?.modelId || "",
            orderId: orderId,
            costItemId: cost.costItemId,
            quantity: cost.quantityUsed,
            unit: cost.unit || "Birim",
            quantity2: cost.quantity2,
            quantity3: cost.quantity3,
            unit2: cost.unit2,
            unit3: cost.unit3,
            costUnitId3: cost.costUnitId3,
            unitPrice: cost.actualPrice,
            currency: cost.currency,
            usage: cost.notes || "",
            priority: 1,
            isActive: true,
            usdRate: exchangeRates.USD || undefined,
            eurRate: exchangeRates.EUR || undefined,
            gbpRate: exchangeRates.GBP || undefined,
            exchangeRateDate: exchangeRates.date,
          };

          try {
            await costService.addModelCost(modelCostData);
          } catch (error: any) {
            console.warn("⚠️ Model cost save failed:", error.message);
          }
        }
      }

      // Status belirleme - önce yeni workshop'u kontrol et
      const targetWorkshop = workshops.find(
        (w) => w.workshopId === newWorkshopId
      );
      const workshopNameLower = targetWorkshop?.name?.toLowerCase() || "";
      const isMoveToCompleted =
        workshopNameLower.includes("biten") ||
        workshopNameLower.includes("tamamlanan") ||
        workshopNameLower.includes("tamamlandı") ||
        workshopNameLower.includes("done");
      const currentOrder = orders.find((o) => o.orderId === orderId);

      let newStatus: OrderStatus;
      if (isMoveToCompleted) {
        newStatus = OrderStatus.Tamamlandi;
      } else if (newWorkshopId) {
        newStatus = OrderStatus.Islemde;
      } else {
        // Workshop kaldırılıyorsa - Tamamlandı say
        newStatus = OrderStatus.Tamamlandi;
      }

      // Workshop güncelleme
      const updateData: Partial<Order> = {
        workshopId: newWorkshopId || undefined,
        operatorId: operatorId || undefined,
        status: newStatus,
      };

      await orderService.update(orderId, updateData as any);
      await loadData();
      setShowTransferModal(false);
      setPendingWorkshopChange(null);
    } catch (error) {
      console.error("❌ Transfer hatası:", error);
      alert("Transfer işlemi başarısız!");
    }
  };

  const groupedOrders = groupOrdersByWorkshop();

  if (loading) {
    return (
      <div className="workshop-manager">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workshop-manager">
      {/* Header */}
      <div className="wm-header">
        <div className="wm-header-top">
          <h1>🏭 Atölye Yönetimi</h1>
          <button
            className="btn-kanban-view"
            onClick={() => navigate("/workshop-kanban")}
            title="Kanban Görünümü"
          >
            📋
          </button>
        </div>

        {/* Arama ve Filtre */}
        <div className="wm-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Sipariş, Model veya Firma Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="workshop-filter">
            <select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
            >
              <option value="all">🏭 Tüm Atölyeler</option>
              <option value="null">❌ Atanmamış</option>
              {workshops.map((ws) => (
                <option key={ws.workshopId} value={ws.workshopId}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="wm-stats">
          <div className="stat-card">
            <span className="stat-value">{orders.length}</span>
            <span className="stat-label">Toplam</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {orders.filter((o) => !o.workshopId).length}
            </span>
            <span className="stat-label">Atanmamış</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {orders.filter((o) => o.status === OrderStatus.Islemde).length}
            </span>
            <span className="stat-label">İşlemde</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {orders.filter((o) => o.status === OrderStatus.Tamamlandi).length}
            </span>
            <span className="stat-label">Tamamlandı</span>
          </div>
        </div>
      </div>

      {/* Workshop Grupları */}
      <div className="wm-content">
        {/* Atanmamış Siparişler */}
        {(selectedWorkshop === "all" || selectedWorkshop === "null") &&
          filterOrders(groupedOrders["null"]).length > 0 && (
            <div className="workshop-group">
              <div
                className="workshop-group-header unassigned"
                onClick={() => toggleWorkshop("null")}
              >
                <div className="workshop-info">
                  <span className="workshop-icon">❌</span>
                  <span className="workshop-name">Atanmamış Siparişler</span>
                  <span className="order-count">
                    ({filterOrders(groupedOrders["null"]).length})
                  </span>
                </div>
                <span className="expand-icon">
                  {expandedWorkshops.has("null") ? "▼" : "▶"}
                </span>
              </div>

              {expandedWorkshops.has("null") && (
                <div className="orders-list">
                  {filterOrders(groupedOrders["null"]).map((order) => (
                    <div key={order.orderId} className="order-card">
                      <div className="order-card-header">
                        <div className="order-title">
                          <span className="order-code">
                            {order.orderId.substring(0, 8)}
                          </span>
                          <span
                            className="order-status"
                            style={{
                              backgroundColor: getStatusColor(
                                order.status || OrderStatus.Atanmadi
                              ),
                            }}
                          >
                            {getStatusText(
                              order.status || OrderStatus.Atanmadi
                            )}
                          </span>
                        </div>
                        <button
                          className="btn-details"
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                        >
                          📄
                        </button>
                      </div>

                      <div className="order-card-body">
                        <div className="order-info-row">
                          <span className="info-label">🏢 Firma:</span>
                          <span className="info-value">
                            {order.firm?.firmName}
                          </span>
                        </div>
                        <div className="order-info-row">
                          <span className="info-label">👔 Model:</span>
                          <span className="info-value">
                            {order.model?.modelName}
                          </span>
                        </div>
                        <div className="order-info-row">
                          <span className="info-label">📦 Miktar:</span>
                          <span className="info-value">{order.quantity}</span>
                        </div>
                        <div className="order-info-row">
                          <span className="info-label">📅 Teslim:</span>
                          <span className="info-value">
                            {order.deadline
                              ? new Date(order.deadline).toLocaleDateString(
                                  "tr-TR"
                                )
                              : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="order-card-footer">
                        <select
                          className="workshop-select"
                          onChange={(e) =>
                            handleWorkshopChange(order.orderId, e.target.value)
                          }
                          value=""
                        >
                          <option value="">🏭 Atölye Seç...</option>
                          {workshops.map((ws) => (
                            <option key={ws.workshopId} value={ws.workshopId}>
                              {ws.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* Atölye Grupları */}
        {workshops
          .filter(
            (workshop) =>
              selectedWorkshop === "all" ||
              selectedWorkshop === workshop.workshopId
          )
          .map((workshop) => {
            const workshopOrders = filterOrders(
              groupedOrders[workshop.workshopId] || []
            );

            if (workshopOrders.length === 0) return null;

            return (
              <div key={workshop.workshopId} className="workshop-group">
                <div
                  className="workshop-group-header"
                  onClick={() => toggleWorkshop(workshop.workshopId)}
                >
                  <div className="workshop-info">
                    <span className="workshop-icon">🏭</span>
                    <span className="workshop-name">{workshop.name}</span>
                    <span className="order-count">
                      ({workshopOrders.length})
                    </span>
                  </div>
                  <span className="expand-icon">
                    {expandedWorkshops.has(workshop.workshopId) ? "▼" : "▶"}
                  </span>
                </div>

                {expandedWorkshops.has(workshop.workshopId) && (
                  <div className="orders-list">
                    {workshopOrders.map((order) => (
                      <div key={order.orderId} className="order-card">
                        <div className="order-card-header">
                          <div className="order-title">
                            <span className="order-code">
                              {order.orderId.substring(0, 8)}
                            </span>
                            <span
                              className="order-status"
                              style={{
                                backgroundColor: getStatusColor(
                                  order.status || OrderStatus.Atanmadi
                                ),
                              }}
                            >
                              {getStatusText(
                                order.status || OrderStatus.Atanmadi
                              )}
                            </span>
                          </div>
                          <button
                            className="btn-details"
                            onClick={() => navigate(`/orders/${order.orderId}`)}
                          >
                            📄
                          </button>
                        </div>

                        <div className="order-card-body">
                          <div className="order-info-row">
                            <span className="info-label">🏢 Firma:</span>
                            <span className="info-value">
                              {order.firm?.firmName}
                            </span>
                          </div>
                          <div className="order-info-row">
                            <span className="info-label">👔 Model:</span>
                            <span className="info-value">
                              {order.model?.modelName}
                            </span>
                          </div>
                          <div className="order-info-row">
                            <span className="info-label">📦 Miktar:</span>
                            <span className="info-value">{order.quantity}</span>
                          </div>
                          <div className="order-info-row">
                            <span className="info-label">⏱️ Süre:</span>
                            <span className="info-value">
                              {calculateDuration(order)}
                            </span>
                          </div>
                          {order.operator && (
                            <div className="order-info-row">
                              <span className="info-label">👤 Operatör:</span>
                              <span className="info-value">
                                {order.operator.firstName}{" "}
                                {order.operator.lastName}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="order-card-footer">
                          <button
                            className="btn-transfer"
                            onClick={() =>
                              handleWorkshopChange(order.orderId, null)
                            }
                          >
                            ✅ Tamamla
                          </button>
                          <select
                            className="workshop-select-mini"
                            onChange={(e) =>
                              handleWorkshopChange(
                                order.orderId,
                                e.target.value
                              )
                            }
                            value=""
                          >
                            <option value="">🔄 Taşı...</option>
                            {workshops
                              .filter(
                                (ws) => ws.workshopId !== workshop.workshopId
                              )
                              .map((ws) => (
                                <option
                                  key={ws.workshopId}
                                  value={ws.workshopId}
                                >
                                  {ws.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Transfer Modal */}
      {showTransferModal &&
        pendingWorkshopChange &&
        (() => {
          const oldWorkshop = workshops.find(
            (w) => w.workshopId === pendingWorkshopChange.oldWorkshopId
          );
          const newWorkshop = pendingWorkshopChange.newWorkshopId
            ? workshops.find(
                (w) => w.workshopId === pendingWorkshopChange.newWorkshopId
              )
            : null;

          return (
            <WorkshopTransferModal
              isOpen={showTransferModal}
              orderId={pendingWorkshopChange.orderId}
              orderQuantity={pendingWorkshopChange.orderQuantity}
              oldWorkshopId={pendingWorkshopChange.oldWorkshopId || null}
              oldWorkshopName={oldWorkshop?.name || "Atanmamış"}
              newWorkshopId={pendingWorkshopChange.newWorkshopId}
              newWorkshopName={newWorkshop?.name || "Tamamlandı"}
              operators={operators}
              selectedOperatorId={selectedOperatorId}
              onOperatorChange={setSelectedOperatorId}
              onSave={handleTransferSave}
              onClose={() => {
                setShowTransferModal(false);
                setPendingWorkshopChange(null);
                setSelectedOperatorId("");
              }}
            />
          );
        })()}
    </div>
  );
};

export default WorkshopManager;
