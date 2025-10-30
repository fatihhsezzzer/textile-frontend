import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  orderService,
  workshopService,
  operatorService,
  exchangeRateService,
} from "../services/dataService";
import { Order, Workshop, Operator, OrderStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Kanban.css";
import KanbanCard from "../components/KanbanCard";
import KanbanColumn from "../components/KanbanColumn";

const WorkshopKanban: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderDurations, setOrderDurations] = useState<{
    [orderId: string]: string;
  }>({});
  const [exchangeRates, setExchangeRates] = useState<{
    USD: number;
    EUR: number;
  }>({ USD: 34.5, EUR: 37.2 }); // Varsayılan kurlar

  // Operatör seçim modalı için state'ler
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [pendingWorkshopChange, setPendingWorkshopChange] = useState<{
    orderId: string;
    newWorkshopId: string | null;
    oldWorkshopId: string | undefined;
  } | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  // Drag sensor ayarları - daha hassas
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
        delay: 100,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadData();
    loadExchangeRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  // Döviz kurlarını yükle
  const loadExchangeRates = async () => {
    try {
      const rates = await exchangeRateService.getLatest();
      const usdRate = rates.find((rate) => rate.currencyCode === "USD");
      const eurRate = rates.find((rate) => rate.currencyCode === "EUR");

      setExchangeRates({
        USD: usdRate?.banknoteSelling || 34.5,
        EUR: eurRate?.banknoteSelling || 37.2,
      });

      console.log("💱 Döviz kurları yüklendi:", {
        USD: usdRate?.banknoteSelling,
        EUR: eurRate?.banknoteSelling,
      });
    } catch (error) {
      console.error("❌ Döviz kurları yüklenemedi:", error);
      // Hata durumunda varsayılan kurlar kullanılacak
    }
  };

  // Atölyede geçen süreyi hesapla (workshops data ile)
  const calculateWorkshopDurationWithData = (
    logs: any[],
    workshopId: string,
    workshopsData: any[]
  ): string => {
    // Hedef atölye bilgisini bul
    const targetWorkshop = workshopsData.find(
      (w) => w.workshopId === workshopId
    );
    const targetWorkshopName = targetWorkshop?.name;

    // Eğer atölye adı bulunamadıysa
    if (!targetWorkshopName) {
      return "< 1 dk";
    }

    // Logs'u tarihe göre sırala (changedAt veya timestamp kullan)
    const sortedLogs = [...logs].sort(
      (a, b) =>
        new Date(a.changedAt || a.timestamp).getTime() -
        new Date(b.changedAt || b.timestamp).getTime()
    );

    let totalDuration = 0;
    let enteredAt: Date | null = null;

    for (let i = 0; i < sortedLogs.length; i++) {
      const log = sortedLogs[i];

      // Log'da atölye değişikliği olup olmadığını kontrol et
      const isWorkshopChange =
        log.changeType === "WorkshopId" ||
        log.changeType === "workshop" ||
        log.changeType === "WorkshopChange" ||
        log.changeType === "WorkshopChanged";

      if (!isWorkshopChange) continue;

      // newValue atölye adını içerir, bunu hedef atölye adı ile karşılaştır
      const logWorkshopName = log.newValue;

      // Atölyeye giriş (bu atölyeye taşındı)
      if (logWorkshopName === targetWorkshopName && !enteredAt) {
        enteredAt = new Date(log.changedAt || log.timestamp);
      }
      // Atölyeden çıkış (başka bir atölyeye taşındı veya atölyeden çıkarıldı)
      else if (logWorkshopName !== targetWorkshopName && enteredAt) {
        const exitedAt = new Date(log.changedAt || log.timestamp);
        const duration = exitedAt.getTime() - enteredAt.getTime();
        totalDuration += duration;
        enteredAt = null;
      }
    }

    // Hala bu atölyedeyse (son log'da bu atölyeye taşınmış ve hala burada)
    if (enteredAt) {
      const currentDuration = new Date().getTime() - enteredAt.getTime();
      totalDuration += currentDuration;
    }

    // Milisaniyeden gün, saat ve dakikaya çevir
    const minutes = Math.floor(totalDuration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;

    if (days > 0) {
      return `${days} gün ${remainingHours} saat`;
    } else if (hours > 0) {
      return `${hours} saat ${remainingMinutes} dk`;
    } else if (minutes > 0) {
      return `${minutes} dakika`;
    } else {
      return "< 1 dk";
    }
  };

  // Atölyede geçen süreyi hesapla
  const calculateWorkshopDuration = (
    logs: any[],
    workshopId: string
  ): string => {
    return calculateWorkshopDurationWithData(logs, workshopId, workshops);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, workshopsData, operatorsData] = await Promise.all([
        orderService.getAll(),
        workshopService.getAll(),
        operatorService.getAll(),
      ]);
      console.log("📋 Loaded orders:", ordersData.length);
      console.log("🏭 Loaded workshops:", workshopsData.length);
      console.log("👷 Loaded operators:", operatorsData.length);
      setOrders(ordersData);
      setWorkshops(workshopsData);
      setOperators(operatorsData);

      // Her sipariş için atölye sürelerini hesapla
      const durations: { [orderId: string]: string } = {};
      for (const order of ordersData) {
        try {
          const logs = await orderService.getOrderLogs(order.orderId);
          if (order.workshopId && logs.length > 0) {
            durations[order.orderId] = calculateWorkshopDurationWithData(
              logs,
              order.workshopId,
              workshopsData
            );
          }
        } catch (error) {
          console.error(
            `Failed to load logs for order ${order.orderId}:`,
            error
          );
        }
      }
      setOrderDurations(durations);
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      alert("Veriler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Atölyeye göre siparişleri grupla
  const getOrdersByWorkshop = (workshopId: string): Order[] => {
    return orders.filter((order) => order.workshopId === workshopId);
  };

  // Kolon için toplam fiyatı TL cinsinden hesapla (tüm dövizleri TL'ye çevir)
  const calculateColumnTotal = (columnOrders: Order[]): number => {
    return columnOrders.reduce((total, order) => {
      const basePrice = (order.price || 0) * order.quantity;
      const currency = order.priceCurrency || order.currency || "TRY";

      // Dövize göre TL'ye çevir
      let priceInTRY = basePrice;
      if (currency === "USD") {
        priceInTRY = basePrice * exchangeRates.USD;
      } else if (currency === "EUR") {
        priceInTRY = basePrice * exchangeRates.EUR;
      }
      // TRY ise zaten TL

      return total + priceInTRY;
    }, 0);
  };

  // Drag başladığında
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find((o) => o.orderId === active.id);
    if (order) {
      setActiveOrder(order);
      console.log("🎯 Drag started:", order.orderId);
    }
  };

  // Drag bittiğinde - atölye değiştir
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Drag overlay'i temizle
    setTimeout(() => setActiveOrder(null), 100);

    if (!over) {
      console.log("❌ Dropped outside valid area");
      return;
    }

    const draggedOrderId = active.id as string;
    const targetId = over.id as string;

    console.log(
      `📍 Drop detected - Dragged: ${draggedOrderId}, Target: ${targetId}`
    );

    const draggedOrder = orders.find((o) => o.orderId === draggedOrderId);

    if (!draggedOrder) {
      console.error("❌ Dragged order not found:", draggedOrderId);
      return;
    }

    // Hedef bir kolon (atölye) mu yoksa başka bir kart mı?
    let newWorkshopId: string | null = null;

    // Eğer hedef bir atölye ID'si ise
    if (workshops.some((w) => w.workshopId === targetId)) {
      newWorkshopId = targetId;
      console.log("🎯 Dropped on workshop:", newWorkshopId);
    }
    // Eğer hedef başka bir kart ise, o kartın atölyesini al
    else {
      const targetOrder = orders.find((o) => o.orderId === targetId);
      if (targetOrder && targetOrder.workshopId) {
        newWorkshopId = targetOrder.workshopId;
        console.log("🎯 Dropped on card, target workshop:", newWorkshopId);
      }
    }

    if (!newWorkshopId) {
      console.error("❌ Could not determine target workshop");
      return;
    }

    if (draggedOrder.workshopId === newWorkshopId) {
      console.log("ℹ️ Same workshop, no update needed");
      return;
    }

    console.log(
      `🔄 Moving order ${draggedOrderId.substring(0, 8)} from ${
        draggedOrder.workshopId || "none"
      } to ${newWorkshopId}`
    );

    // Atölye değişikliği varsa operatör seçimi için modal aç
    setPendingWorkshopChange({
      orderId: draggedOrderId,
      newWorkshopId,
      oldWorkshopId: draggedOrder.workshopId,
    });
    setSelectedOperatorId(draggedOrder.operatorId || "");
    setShowOperatorModal(true);
  };

  // Operatör seçimi onaylandığında çağrılır
  const handleConfirmWorkshopChange = async () => {
    if (!pendingWorkshopChange) return;

    if (!selectedOperatorId) {
      alert("Lütfen bir operatör seçin!");
      return;
    }

    const { orderId, newWorkshopId, oldWorkshopId } = pendingWorkshopChange;
    const draggedOrder = orders.find((o) => o.orderId === orderId);

    if (!draggedOrder) return;

    // Hedef atölyeyi bul
    const targetWorkshop = workshops.find(
      (w) => w.workshopId === newWorkshopId
    );

    // Eğer "Biten İşler" veya "Done" atölyesine taşınıyorsa completionDate ekle ve status'u Done yap
    const isMoveToCompleted =
      targetWorkshop &&
      (targetWorkshop.name.toLowerCase().includes("biten") ||
        targetWorkshop.name.toLowerCase().includes("done") ||
        targetWorkshop.name.toLowerCase().includes("tamamlan"));

    // Optimistic update - UI'ı hemen güncelle
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.orderId === orderId
          ? {
              ...o,
              workshopId: newWorkshopId || undefined,
              operatorId: selectedOperatorId,
              ...(isMoveToCompleted && {
                status: OrderStatus.Tamamlandi,
              }),
            }
          : o
      )
    );

    // Modal'ı kapat
    setShowOperatorModal(false);
    setPendingWorkshopChange(null);

    try {
      // Önce workshop ve operator'u güncelle
      const updateData = {
        ...draggedOrder,
        workshopId: newWorkshopId || undefined,
        operatorId: selectedOperatorId,
      };

      await orderService.update(orderId, updateData);
      console.log("✅ Workshop and operator updated successfully");

      // Eğer "Biten İşler"e taşındıysa, status'u Tamamlandı yap
      if (isMoveToCompleted) {
        await orderService.updateStatus(orderId, OrderStatus.Tamamlandi);
        console.log(
          "✅ Order status updated to Tamamlandı (status: 3) - backend will set completion date"
        );
      }

      // UI'ı güncelle - backend'den gelen son hali alsın
      await loadData();

      const operator = operators.find(
        (op) => op.operatorId === selectedOperatorId
      );
      const operatorName = operator
        ? `${operator.firstName} ${operator.lastName}`
        : "";

      let message = newWorkshopId
        ? `Sipariş "${targetWorkshop?.name}" atölyesine ve "${operatorName}" operatörüne atandı`
        : "Sipariş atölyeden kaldırıldı";

      if (isMoveToCompleted) {
        message += " ve tamamlandı olarak işaretlendi! 🎉";
      }

      console.log("🎉", message);
    } catch (error: any) {
      console.error("❌ Failed to update workshop:", error);

      // Hata durumunda geri al
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                workshopId: oldWorkshopId,
                operatorId: draggedOrder.operatorId,
              }
            : o
        )
      );

      alert(
        `Atölye güncellenemedi!\n${
          error.response?.data?.message || error.message || "Bilinmeyen hata"
        }`
      );
    }
  };

  // Operatör seçimi iptal edildiğinde
  const handleCancelWorkshopChange = () => {
    setShowOperatorModal(false);
    setPendingWorkshopChange(null);
    setSelectedOperatorId("");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (loading) {
    return (
      <div className="kanban-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Kolonları oluştur: Sadece atölyeler (atanmamış artık yok)
  const columns = workshops.map((workshop) => ({
    id: workshop.workshopId,
    title: workshop.name,
    color: "#667eea",
  }));

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h1>🏭 Atölye Kanban Board</h1>
        <button onClick={loadData} className="refresh-button">
          🔄 Yenile
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {columns.map((column) => {
            const columnOrders = getOrdersByWorkshop(column.id);
            const columnOrderIds = columnOrders.map((o) => o.orderId);
            const columnTotal = calculateColumnTotal(columnOrders);

            return (
              <div
                key={column.id}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  count={columnOrders.length}
                  totalValue={columnTotal}
                >
                  <SortableContext
                    items={columnOrderIds}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    <div className="kanban-cards">
                      {columnOrders.length === 0 && (
                        <div className="empty-column">Sipariş bulunmuyor</div>
                      )}
                      {columnOrders.map((order) => (
                        <KanbanCard
                          key={order.orderId}
                          order={order}
                          formatDate={formatDate}
                          workshopDuration={orderDurations[order.orderId]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </KanbanColumn>
              </div>
            );
          })}
        </div>

        {/* Drag overlay - sürüklerken görünen kart */}
        <DragOverlay>
          {activeOrder ? (
            <div className="kanban-card dragging">
              <div className="card-header">
                <strong>{activeOrder.firm?.firmName}</strong>
                <span className="card-model">
                  {activeOrder.model?.modelCode}
                </span>
              </div>
              <div className="card-body">
                <div className="card-info">
                  <span>📦 Adet: {activeOrder.quantity}</span>
                  <span>
                    💰{" "}
                    {(() => {
                      const basePrice =
                        (activeOrder.price || 0) * activeOrder.quantity;
                      const currency =
                        activeOrder.priceCurrency ||
                        activeOrder.currency ||
                        "TRY";
                      const currencySymbol =
                        currency === "USD"
                          ? "$"
                          : currency === "EUR"
                          ? "€"
                          : currency === "TRY"
                          ? "₺"
                          : currency;
                      return `${currencySymbol}${basePrice.toLocaleString(
                        "tr-TR",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Operatör Seçim Modalı */}
      {showOperatorModal && pendingWorkshopChange && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              minWidth: "400px",
              maxWidth: "500px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>
              👷 Operatör Seçin
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              {pendingWorkshopChange.newWorkshopId ? (
                <>
                  Sipariş{" "}
                  <strong>
                    {
                      workshops.find(
                        (w) =>
                          w.workshopId === pendingWorkshopChange.newWorkshopId
                      )?.name
                    }
                  </strong>{" "}
                  atölyesine taşınıyor. Bu atölyedeki bir operatör seçin.
                </>
              ) : (
                "Atölye değiştiriyorsunuz. Lütfen bu sipariş için bir operatör seçin."
              )}
            </p>

            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                Operatör *
              </label>
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #ddd",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#ddd")}
              >
                <option value="">-- Operatör Seçin --</option>
                {operators
                  .filter(
                    (operator) =>
                      operator.workshopId ===
                      pendingWorkshopChange.newWorkshopId
                  )
                  .map((operator) => (
                    <option
                      key={operator.operatorId}
                      value={operator.operatorId}
                    >
                      {operator.firstName} {operator.lastName}
                      {operator.specialization
                        ? ` - ${operator.specialization}`
                        : ""}
                    </option>
                  ))}
              </select>
              {operators.filter(
                (operator) =>
                  operator.workshopId === pendingWorkshopChange.newWorkshopId
              ).length === 0 && (
                <p
                  style={{
                    marginTop: "8px",
                    color: "#dc3545",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  ⚠️ Bu atölyede kayıtlı operatör bulunmuyor!
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelWorkshopChange}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#f0f0f0",
                  color: "#666",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e0e0e0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#f0f0f0")
                }
              >
                ❌ İptal
              </button>
              <button
                onClick={handleConfirmWorkshopChange}
                disabled={!selectedOperatorId}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: selectedOperatorId
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "#ccc",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: selectedOperatorId ? "pointer" : "not-allowed",
                  transition: "all 0.3s",
                  boxShadow: selectedOperatorId
                    ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                    : "none",
                }}
                onMouseOver={(e) => {
                  if (selectedOperatorId) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(102, 126, 234, 0.4)";
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedOperatorId) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(102, 126, 234, 0.3)";
                  }
                }}
              >
                ✅ Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopKanban;
