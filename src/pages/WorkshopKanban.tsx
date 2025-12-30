import React, { useState, useEffect, useRef } from "react";
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
  userService,
  costService,
} from "../services/dataService";
import {
  Order,
  Workshop,
  User,
  OrderStatus,
  OrderWorkshopCost,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { useExchangeRates } from "../context/ExchangeRateContext";
import { useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import "./Kanban.css";
import KanbanCard from "../components/KanbanCard";
import KanbanColumn from "../components/KanbanColumn";
import WorkshopTransferModal from "../components/WorkshopTransferModal";

const WorkshopKanban: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { usdRate, eurRate, gbpRate } = useExchangeRates();
  const navigate = useNavigate();
  const kanbanBoardRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderDurations, setOrderDurations] = useState<{
    [orderId: string]: string;
  }>({});

  // Transfer modalı için state'ler (operatör + maliyet)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingWorkshopChange, setPendingWorkshopChange] = useState<{
    orderId: string;
    newWorkshopId: string | null;
    oldWorkshopId: string | undefined;
    orderQuantity?: number;
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Mouse wheel ile yatay scroll için handler
  useEffect(() => {
    const kanbanBoard = kanbanBoardRef.current;
    if (!kanbanBoard) return;

    const handleWheel = (e: WheelEvent) => {
      // Yatay scroll varsa tarayıcının kendi işlemesine izin ver
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      // Shift basılıysa varsayılan davranışı kullan
      if (e.shiftKey) {
        return;
      }

      // Dikey scroll'u yatay scroll'a çevir
      e.preventDefault();
      kanbanBoard.scrollLeft += e.deltaY;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Sol/Sağ ok tuşları ile scroll
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        kanbanBoard.scrollLeft -= 100;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        kanbanBoard.scrollLeft += 100;
      }
    };

    kanbanBoard.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      kanbanBoard.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

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
      const [ordersData, workshopsData, usersData] = await Promise.all([
        orderService.getAll(),
        workshopService.getAll(),
        userService.getAll(),
      ]);
      setOrders(ordersData);
      setWorkshops(workshopsData);
      setUsers(usersData);

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
      if (currency === "USD" && usdRate) {
        priceInTRY = basePrice * usdRate;
      } else if (currency === "EUR" && eurRate) {
        priceInTRY = basePrice * eurRate;
      } else if (currency !== "TRY" && currency !== "TL") {
        priceInTRY = 0; // Kur yoksa dönüşüm yapılamaz
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
    }
  };

  // Drag bittiğinde - atölye değiştir
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Drag overlay'i temizle
    setTimeout(() => setActiveOrder(null), 100);

    if (!over) {
      return;
    }

    const draggedOrderId = active.id as string;
    const targetId = over.id as string;
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
    }
    // Eğer hedef başka bir kart ise, o kartın atölyesini al
    else {
      const targetOrder = orders.find((o) => o.orderId === targetId);
      if (targetOrder && targetOrder.workshopId) {
        newWorkshopId = targetOrder.workshopId;
      }
    }

    if (!newWorkshopId) {
      console.error("❌ Could not determine target workshop");
      return;
    }

    if (draggedOrder.workshopId === newWorkshopId) {
      return;
    }

    console.log(
      `🔄 Moving order ${draggedOrderId.substring(0, 8)} from ${
        draggedOrder.workshopId || "none"
      } to ${newWorkshopId}`
    );

    // Transfer modalını aç (kullanıcı + maliyet)
    setPendingWorkshopChange({
      orderId: draggedOrderId,
      newWorkshopId,
      oldWorkshopId: draggedOrder.workshopId,
      orderQuantity: draggedOrder.quantity,
    });
    setSelectedUserId(draggedOrder.operatorId || "");
    setShowTransferModal(true);
  };

  // Transfer modalından gelen operatör + maliyet kaydet
  const handleTransferSave = async (
    userId: string,
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
    const draggedOrder = orders.find((o) => o.orderId === orderId);

    if (!draggedOrder) return;

    // Hedef atölyeyi bul
    const targetWorkshop = workshops.find(
      (w) => w.workshopId === newWorkshopId
    );

    // Önceki atölyeyi bul (maliyet kaydı için)
    const previousWorkshop = workshops.find(
      (w) => w.workshopId === oldWorkshopId
    );

    const isMoveToCompleted =
      targetWorkshop &&
      (targetWorkshop.name.toLowerCase().includes("biten") ||
        targetWorkshop.name.toLowerCase().includes("done") ||
        targetWorkshop.name.toLowerCase().includes("tamamlanan") ||
        targetWorkshop.name.toLowerCase().includes("tamamlandı") ||
        targetWorkshop.name.toLowerCase().includes("tamamlan"));

    try {
      // Maliyetleri kaydet (varsa)
      if (costs.length > 0 && oldWorkshopId && draggedOrder.modelId) {
        for (const cost of costs) {
          const modelCostData = {
            modelId: draggedOrder.modelId,
            orderId: orderId,
            costItemId: cost.costItemId,
            quantity: cost.quantityUsed,
            unit: cost.unit, // Cost'tan gelen unit bilgisi
            quantity2: cost.quantity2, // İkinci boyut (opsiyonel)
            quantity3: cost.quantity3, // Üçüncü boyut (opsiyonel, referans)
            unit2: cost.unit2, // İkinci birim (opsiyonel)
            unit3: cost.unit3, // Üçüncü birim (opsiyonel, referans)
            costUnitId3: cost.costUnitId3, // Üçüncü birim ID (referans)
            unitPrice: cost.actualPrice,
            totalCost: cost.totalCost, // CustomCost için direkt toplam tutar
            currency: cost.currency,
            usage: `${previousWorkshop?.name || "Atölyesi"}`, // Önceki atölye
            notes: cost.notes || "", // Not alanı
            priority: 1,
            isActive: true,
            usdRate: usdRate || undefined,
            eurRate: eurRate || undefined,
            gbpRate: gbpRate || undefined,
            exchangeRateDate: new Date().toISOString(),
          };

          console.log("📤 Sending ModelCost data (API):", modelCostData);
          try {
            await costService.addModelCost(modelCostData);
          } catch (error: any) {
            console.warn(
              "⚠️ Model cost save failed (may already exist):",
              error.message
            );
          }
        }
      }

      // Status güncelleme mantığı
      // 1. "Biten İşler"e taşındıysa -> Tamamlandı
      // 2. Atanmadı'dan (oldWorkshopId yok) bir atölyeye atandıysa -> İşlemde
      // 3. Bir atölyeden başka atölyeye taşındıysa -> İşlemde kalsın
      let newStatus = draggedOrder.status;

      if (isMoveToCompleted) {
        newStatus = OrderStatus.Tamamlandi;
      } else if (!oldWorkshopId && newWorkshopId) {
        // Atanmadı'dan bir atölyeye atandı
        newStatus = OrderStatus.Islemde;
      } else if (
        oldWorkshopId &&
        newWorkshopId &&
        draggedOrder.status === OrderStatus.Atanmadi
      ) {
        // Eğer bir şekilde status hala Atanmadı ise İşlemde yap
        newStatus = OrderStatus.Islemde;
      }

      // Sonra workshop ve user'ı güncelle
      // Yeni atama endpointi için payload
      const assignPayload = {
        workshopId: newWorkshopId,
        userId: userId,
        orderStatusId: newStatus,
      };
      console.log("📤 Sending Order assign data (API):", assignPayload);
      await orderService.assign(orderId, assignPayload);
      // UI'ı güncelle
      await loadData();

      // Modal'ı kapat
      setShowTransferModal(false);
      setPendingWorkshopChange(null);
      setSelectedUserId("");

      const user = users.find((u) => u.userId === userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : "";

      let message = newWorkshopId
        ? `Sipariş "${targetWorkshop?.name}" atölyesine ve "${userName}" kullanıcısına atandı`
        : "Sipariş atölyeden kaldırıldı";

      if (isMoveToCompleted) {
        message += " ve tamamlandı olarak işaretlendi! 🎉";
      }
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

  // Transfer modalı iptal edildiğinde
  const handleTransferCancel = () => {
    setShowTransferModal(false);
    setPendingWorkshopChange(null);
    setSelectedUserId("");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (loading) {
    return <PageLoader message="Atölye verileri yükleniyor..." />;
  }

  // Kolonları oluştur: Sadece atölyeler (atanmamış artık yok)
  const columns = workshops.map((workshop) => ({
    id: workshop.workshopId,
    title: workshop.name,
    color: "#667eea",
  }));

  return (
    <div className="kanban-container workshop-kanban-page">
      <div className="kanban-header">
        <h1>🏭 Atölye Kanban Board</h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board" ref={kanbanBoardRef}>
          {columns.map((column) => {
            const columnOrders = getOrdersByWorkshop(column.id);
            const columnOrderIds = columnOrders.map((o) => o.orderId);
            const columnTotal = calculateColumnTotal(columnOrders);

            return (
              <KanbanColumn
                key={column.id}
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

      {/* Workshop Transfer Modal (Operatör + Maliyet) */}
      {showTransferModal && pendingWorkshopChange && (
        <WorkshopTransferModal
          isOpen={showTransferModal}
          orderId={pendingWorkshopChange.orderId}
          orderQuantity={pendingWorkshopChange.orderQuantity}
          oldWorkshopId={pendingWorkshopChange.oldWorkshopId || null}
          oldWorkshopName={
            workshops.find(
              (w) => w.workshopId === pendingWorkshopChange.oldWorkshopId
            )?.name || "Atanmamış"
          }
          newWorkshopId={pendingWorkshopChange.newWorkshopId || null}
          newWorkshopName={
            workshops.find(
              (w) => w.workshopId === pendingWorkshopChange.newWorkshopId
            )?.name || "Yeni Atölye"
          }
          users={users}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          onClose={handleTransferCancel}
          onSave={handleTransferSave}
        />
      )}
    </div>
  );
};

export default WorkshopKanban;
