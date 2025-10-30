import React from "react";
import { useDroppable } from "@dnd-kit/core";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  totalValue?: number; // Opsiyonel toplam fiyat
  children: React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  count,
  totalValue,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "drag-over" : ""}`}
    >
      <div className="column-header" style={{ borderBottomColor: color }}>
        <div className="column-title" style={{ color }}>
          {title}
        </div>
        <div className="column-stats">
          <div className="column-count">{count} sipariş</div>
          {totalValue !== undefined && totalValue > 0 && (
            <div className="column-total" style={{ color }}>
              {formatCurrency(totalValue)}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default KanbanColumn;
