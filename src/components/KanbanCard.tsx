import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Order } from "../types";

interface KanbanCardProps {
  order: Order;
  formatDate: (date?: string) => string;
  workshopDuration?: string; // Atölyede geçirilen süre
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  order,
  formatDate,
  workshopDuration,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.orderId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityClass = (priority?: string) => {
    if (!priority) return "low";
    if (priority === "Yüksek" || priority === "High") return "high";
    if (priority === "Orta" || priority === "Medium") return "medium";
    return "low";
  };

  // Firmada geçen süreyi hesapla (kabul tarihi - şu anki tarih)
  const calculateTotalDuration = () => {
    const acceptanceDate = new Date(order.acceptanceDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - acceptanceDate.getTime());

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
      return "< 1 saat";
    }
  };

  // Orijinal fiyatı ve para birimini göster
  const formatPriceWithCurrency = () => {
    const basePrice = (order.price || 0) * order.quantity;
    const currency = order.priceCurrency || order.currency || "TRY";

    // Para birimi sembolü
    const currencySymbol =
      currency === "USD"
        ? "$"
        : currency === "EUR"
        ? "€"
        : currency === "TRY"
        ? "₺"
        : currency;

    // Fiyatı formatla
    const formattedPrice = basePrice.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${currencySymbol}${formattedPrice}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-header">
        <strong>{order.firm?.firmName || "Bilinmeyen Firma"}</strong>
        <span className="card-model">{order.model?.modelCode || "N/A"}</span>
      </div>

      <div className="card-body">
        <div className="card-info">
          <span>📦 {order.quantity} adet</span>
          <span>💰 {formatPriceWithCurrency()}</span>
        </div>

        <div className="card-details">
          {order.operator && (
            <div className="card-detail-row">
              <span>
                👤 {order.operator.firstName} {order.operator.lastName}
              </span>
            </div>
          )}

          {order.deadline && (
            <div className="card-detail-row">
              <span>📅 {formatDate(order.deadline)}</span>
            </div>
          )}

          {order.priority && (
            <div className="card-detail-row">
              <span
                className={`card-priority ${getPriorityClass(order.priority)}`}
              >
                {order.priority}
              </span>
            </div>
          )}

          <div className="card-detail-row">
            <span className="process-duration">
              ⏱️ Firmada geçen süre: {calculateTotalDuration()}
            </span>
          </div>

          {workshopDuration && (
            <div className="card-detail-row">
              <span className="workshop-duration">
                🕐 Atölyede geçen süre: {workshopDuration}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
