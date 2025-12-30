import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Order, OrderStatus, OrderUnit } from "../types";
import { orderService } from "../services/dataService";
import { turkishIncludes } from "../utils/formatters";
import PageLoader from "../components/PageLoader";
import "./Orders.css";

const AccountingOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "filled" | "empty"
  >("all");
  const [editingInvoice, setEditingInvoice] = useState<{
    orderId: string;
    invoice: string;
    invoiceNumber: string;
  } | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);

      // Tüm siparişleri çek (hem IsActive=true hem IsActive=false)
      const allOrders = await orderService.getInvoiced();

      // Sadece tamamlanmış siparişleri filtrele
      const completedOrders = allOrders.filter(
        (order) => order.status === OrderStatus.Tamamlandi
      );

      setOrders(completedOrders);
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

  // Arama ve fatura filtresi fonksiyonu
  const getFilteredOrders = (ordersToFilter: Order[]) => {
    let filtered = ordersToFilter;

    // Fatura filtresi uygula
    if (invoiceFilter === "filled") {
      filtered = filtered.filter(
        (order) => order.invoiceNumber && order.invoiceNumber.trim() !== ""
      );
    } else if (invoiceFilter === "empty") {
      filtered = filtered.filter(
        (order) => !order.invoiceNumber || order.invoiceNumber.trim() === ""
      );
    }

    // Arama filtresi uygula
    if (!searchTerm.trim()) return filtered;

    return filtered.filter((order) => {
      return (
        turkishIncludes(order.orderId || "", searchTerm) ||
        turkishIncludes(order.firm?.firmName || "", searchTerm) ||
        turkishIncludes(order.model?.modelName || "", searchTerm) ||
        turkishIncludes(order.model?.modelCode || "", searchTerm) ||
        turkishIncludes(order.invoice || "", searchTerm) ||
        turkishIncludes(order.invoiceNumber || "", searchTerm) ||
        turkishIncludes(getStatusText(order.status), searchTerm)
      );
    });
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const handleEditInvoice = (order: Order) => {
    setEditingInvoice({
      orderId: order.orderId,
      invoice: order.invoice || "",
      invoiceNumber: order.invoiceNumber || "",
    });
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    try {
      setSavingInvoice(true);

      // Yeni invoice endpoint'ini kullan
      await orderService.updateInvoice(editingInvoice.orderId, {
        invoice: editingInvoice.invoice,
        invoiceNumber: editingInvoice.invoiceNumber,
      });

      // Listeyi güncelle
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === editingInvoice.orderId
            ? {
                ...o,
                invoice: editingInvoice.invoice,
                invoiceNumber: editingInvoice.invoiceNumber,
              }
            : o
        )
      );

      setEditingInvoice(null);
      alert("✅ Fatura bilgileri kaydedildi!");
    } catch (error) {
      console.error("❌ Fatura güncellenemedi:", error);
      alert("❌ Fatura bilgileri kaydedilemedi!");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
  };

  if (loading) {
    return <PageLoader message="Siparişler yükleniyor..." />;
  }

  const processedOrders = getFilteredOrders(orders);

  return (
    <div className="orders-container">
      {/* Sayfa Başlığı */}
      <div className="orders-header">
        <h1>Fatura Yönetimi</h1>
        <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
          Siparişlere fatura bilgileri ekleyin
        </p>
      </div>

      {/* Filtreler */}
      <div className="filters">
        <div className="filter-group">
          <label>Arama:</label>
          <input
            type="text"
            placeholder="Order ID, Firma, Model, Fatura ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Fatura Durumu:</label>
          <select
            value={invoiceFilter}
            onChange={(e) =>
              setInvoiceFilter(e.target.value as "all" | "filled" | "empty")
            }
            className="role-select"
          >
            <option value="all">Tümü</option>
            <option value="filled">Fatura Numarası Girilmiş</option>
            <option value="empty">Fatura Numarası Girilmemiş</option>
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
              <th>Durum</th>
              <th>Kabul Tarihi</th>
              <th>IsActive</th>
              <th>Fatura</th>
              <th>Fatura No</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {processedOrders.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center" }}>
                  {searchTerm.trim()
                    ? "Arama kriterine uygun sipariş bulunamadı."
                    : "Tamamlanmış sipariş bulunmuyor."}
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
                    <span
                      className={`status-badge ${getStatusClass(order.status)}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td>{formatDate(order.acceptanceDate)}</td>
                  <td>
                    <span
                      style={{
                        color: order.isActive ? "#28a745" : "#dc3545",
                        fontWeight: "600",
                      }}
                    >
                      {order.isActive ? "✓ Aktif" : "✕ Pasif"}
                    </span>
                  </td>
                  <td>
                    {editingInvoice?.orderId === order.orderId ? (
                      <input
                        type="text"
                        value={editingInvoice.invoice}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            invoice: e.target.value,
                          })
                        }
                        placeholder="Fatura"
                        style={{ width: "100px", padding: "4px" }}
                      />
                    ) : (
                      <span>{order.invoice || "-"}</span>
                    )}
                  </td>
                  <td>
                    {editingInvoice?.orderId === order.orderId ? (
                      <input
                        type="text"
                        value={editingInvoice.invoiceNumber}
                        onChange={(e) =>
                          setEditingInvoice({
                            ...editingInvoice,
                            invoiceNumber: e.target.value,
                          })
                        }
                        placeholder="Fatura No"
                        style={{ width: "100px", padding: "4px" }}
                      />
                    ) : (
                      <span>{order.invoiceNumber || "-"}</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingInvoice?.orderId === order.orderId ? (
                        <>
                          <button
                            onClick={handleSaveInvoice}
                            disabled={savingInvoice}
                            className="transfer-button"
                            title="Kaydet"
                            style={{ backgroundColor: "#28a745" }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingInvoice}
                            className="delete-button"
                            title="İptal"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditInvoice(order)}
                          className="transfer-button"
                          title="Fatura Düzenle"
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountingOrders;
