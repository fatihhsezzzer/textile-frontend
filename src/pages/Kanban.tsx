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
import { orderService, exchangeRateService } from "../services/dataService";
import { Order, OrderStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Kanban.css";
import KanbanCard from "../components/KanbanCard";
import KanbanColumn from "../components/KanbanColumn";

const Kanban: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [exchangeRates, setExchangeRates] = useState<{
    USD: number;
    EUR: number;
  }>({ USD: 34.5, EUR: 37.2 });

  // Kanban kolonları
  const columns: { id: OrderStatus; title: string; color: string }[] = [
    { id: OrderStatus.Atanmadi, title: "Atanmadı", color: "#6c757d" },
    { id: OrderStatus.Islemde, title: "İşlemde", color: "#0dcaf0" },
    { id: OrderStatus.IptalEdildi, title: "İptal Edildi", color: "#dc3545" },
    { id: OrderStatus.Tamamlandi, title: "Tamamlandı", color: "#198754" },
  ];

  // Drag sensor ayarları - daha hassas
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Daha hassas sürükleme
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
    loadOrders();
    loadExchangeRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const loadExchangeRates = async () => {
    try {
      const rates = await exchangeRateService.getLatest();
      const usdRate = rates.find((rate) => rate.currencyCode === "USD");
      const eurRate = rates.find((rate) => rate.currencyCode === "EUR");

      setExchangeRates({
        USD: usdRate?.banknoteSelling || 34.5,
        EUR: eurRate?.banknoteSelling || 37.2,
      });
    } catch (error) {
      console.error("❌ Döviz kurları yüklenemedi:", error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAll();
      console.log("📋 Loaded orders for Kanban:", data.length);
      setOrders(data);
    } catch (error) {
      console.error("❌ Failed to load orders:", error);
      alert("Siparişler yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Status'a göre siparişleri grupla
  const getOrdersByStatus = (status: OrderStatus): Order[] => {
    return orders.filter((order) => order.status === status);
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

  // Drag bittiğinde
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

    // Hedef bir kolon mu yoksa başka bir kart mı?
    let newStatus: OrderStatus | undefined;

    // Eğer hedef bir kolon ise (OrderStatus enum değerlerinden biri)
    const numericTargetId = parseInt(targetId);
    if (
      !isNaN(numericTargetId) &&
      Object.values(OrderStatus).includes(numericTargetId)
    ) {
      newStatus = numericTargetId as OrderStatus;
      console.log("🎯 Dropped on column:", newStatus);
    }
    // Eğer hedef başka bir kart ise, o kartın status'unu al
    else {
      const targetOrder = orders.find((o) => o.orderId === targetId);
      if (targetOrder) {
        newStatus = targetOrder.status;
        console.log("🎯 Dropped on card, target status:", newStatus);
      }
    }

    if (!newStatus) {
      console.error("❌ Could not determine target status");
      return;
    }

    if (draggedOrder.status === newStatus) {
      console.log("ℹ️ Same status, no update needed");
      return;
    }

    console.log(
      `🔄 Moving order ${draggedOrderId.substring(0, 8)} from ${
        draggedOrder.status
      } to ${newStatus}`
    );

    // Eski status'u sakla (hata durumunda geri dönmek için)
    const oldStatus = draggedOrder.status;

    // Optimistic update - UI'ı hemen güncelle
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.orderId === draggedOrderId ? { ...o, status: newStatus } : o
      )
    );

    try {
      // Backend'i güncelle
      const result = await orderService.updateStatus(
        draggedOrderId,
        newStatus!
      );
      console.log("✅ Status updated successfully", result);

      // Eğer Tamamlandı status'üne taşındıysa bildirim göster
      if (newStatus === OrderStatus.Tamamlandi) {
        console.log("🎉 Order completed with date:", result.completionDate);
      }
    } catch (error: any) {
      console.error("❌ Failed to update status:", error);

      // Hata durumunda geri al
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.orderId === draggedOrderId ? { ...o, status: oldStatus } : o
        )
      );

      alert(
        `Durum güncellenemedi!\n${
          error.response?.data?.message || error.message || "Bilinmeyen hata"
        }`
      );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount || isNaN(amount)) return "₺0,00";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="kanban-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h1>📋 Kanban Board</h1>
        <button onClick={loadOrders} className="refresh-button">
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
            const columnOrders = getOrdersByStatus(column.id);
            const columnOrderIds = columnOrders.map((o) => o.orderId);
            const columnTotal = calculateColumnTotal(columnOrders);

            return (
              <div
                key={column.id}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <KanbanColumn
                  id={column.id.toString()}
                  title={column.title}
                  color={column.color}
                  count={columnOrders.length}
                  totalValue={columnTotal}
                >
                  <SortableContext
                    items={columnOrderIds}
                    strategy={verticalListSortingStrategy}
                    id={column.id.toString()}
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
                    {formatCurrency(
                      (activeOrder.price || 0) * activeOrder.quantity
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Kanban;
