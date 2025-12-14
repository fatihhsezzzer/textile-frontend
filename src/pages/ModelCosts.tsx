import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ModelCost, Model, Firm } from "../types";
import {
  costService,
  modelService,
  firmService,
} from "../services/dataService";
import { formatCurrency, formatNumber } from "../utils/formatters";
import "./CostManagement.css";

const ModelCosts: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();

  const [model, setModel] = useState<Model | null>(null);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modelId) {
      loadModel();
      loadModelCosts();
      loadFirms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const loadFirms = async () => {
    try {
      const data = await firmService.getFirms();
      setFirms(data);
    } catch (error) {
      console.error("❌ Failed to load firms:", error);
      setFirms([]);
    }
  };

  const loadModel = async () => {
    if (!modelId) return;
    try {
      const data = await modelService.getAll();
      const found = data.find((m) => m.modelId === modelId);
      setModel(found || null);
    } catch (error) {
      console.error("❌ Failed to load model:", error);
    }
  };

  const loadModelCosts = async () => {
    if (!modelId) return;
    try {
      setLoading(true);
      console.log("📊 Loading model costs for modelId:", modelId);
      const data = await costService.getModelCosts(modelId);
      console.log("✅ Model costs loaded:", data.length, "items");
      console.log("📦 Full response data:", data);

      // İlk kayıttaki firma bilgisini kontrol et
      if (data.length > 0) {
        console.log("🏢 First item firm info:", {
          firmId: data[0].firmId,
          firmName: data[0].firmName,
          orderFirmId: data[0].order?.firmId,
          orderFirmName: data[0].order?.firm?.firmName,
        });
      }

      setModelCosts(data);

      // Başlangıçta tüm order'lar kapalı olsun
      setExpandedOrders(new Set());
    } catch (error: any) {
      console.error("❌ Failed to load model costs:", error);
      setModelCosts([]);
      // CORS veya network hatası için daha açıklayıcı mesaj
      if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("CORS")
      ) {
        console.warn(
          "⚠️ Model maliyetleri yüklenemedi (Bağlantı hatası). Boş liste gösteriliyor."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ModelCost) => {
    if (
      !window.confirm(
        `"${
          item.costItemName || "Bu"
        }" maliyet kalemini bu modelden kaldırmak istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await costService.deleteModelCost(item.modelCostId);
      alert("Model maliyeti başarıyla kaldırıldı!");
      loadModelCosts();
    } catch (error: any) {
      console.error("❌ Failed to delete model cost:", error);
      alert("Model maliyeti kaldırılamadı!");
    } finally {
      setLoading(false);
    }
  };

  // Döviz dönüşümü fonksiyonu
  const convertToTRY = (
    amount: number,
    currency: string,
    exchangeRates: { usdRate?: number; eurRate?: number; gbpRate?: number }
  ): number => {
    if (currency === "TRY") return amount;

    const { usdRate, eurRate, gbpRate } = exchangeRates;

    switch (currency) {
      case "USD":
        if (!usdRate) {
          console.warn("⚠️ USD kuru bulunamadı, dönüşüm yapılamıyor");
          return 0;
        }
        return amount * usdRate;
      case "EUR":
        if (!eurRate) {
          console.warn("⚠️ EUR kuru bulunamadı, dönüşüm yapılamıyor");
          return 0;
        }
        return amount * eurRate;
      case "GBP":
        if (!gbpRate) {
          console.warn("⚠️ GBP kuru bulunamadı, dönüşüm yapılamıyor");
          return 0;
        }
        return amount * gbpRate;
      default:
        return amount;
    }
  };

  // Firma filtreleme
  const getFilteredCosts = (): ModelCost[] => {
    if (selectedFirmId === "all") {
      return modelCosts;
    }
    return modelCosts.filter(
      (cost) =>
        cost.firmId === selectedFirmId || cost.order?.firmId === selectedFirmId
    );
  };

  // Maliyetlerde bulunan firmaları getir
  const getAvailableFirms = (): Firm[] => {
    const firmIdsInCosts = new Set<string>();
    modelCosts.forEach((cost) => {
      const firmId = cost.firmId || cost.order?.firmId;
      if (firmId) {
        firmIdsInCosts.add(firmId);
      }
    });
    return firms.filter((firm) => firmIdsInCosts.has(firm.firmId));
  };

  // Order'lara göre grupla
  const groupByOrder = () => {
    const grouped = new Map<string, ModelCost[]>();
    const filteredCosts = getFilteredCosts();

    filteredCosts.forEach((cost) => {
      const orderKey = cost.orderId || "general";
      if (!grouped.has(orderKey)) {
        grouped.set(orderKey, []);
      }
      grouped.get(orderKey)!.push(cost);
    });

    return grouped;
  };

  // Her grup için toplam maliyeti TL'ye çevirerek hesapla
  const calculateGroupTotal = (costs: ModelCost[]): number => {
    return costs.reduce((sum, item) => {
      const itemTotal = item.totalCost || 0;
      const tryAmount = convertToTRY(itemTotal, item.currency || "TRY", {
        usdRate: item.usdRate,
        eurRate: item.eurRate,
        gbpRate: item.gbpRate,
      });
      return sum + tryAmount;
    }, 0);
  };

  const calculateTotalCost = (): number => {
    return calculateGroupTotal(getFilteredCosts());
  };

  const toggleOrderExpanded = (orderKey: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderKey)) {
      newExpanded.delete(orderKey);
    } else {
      newExpanded.add(orderKey);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleAllOrders = () => {
    const allOrderKeys = Array.from(groupByOrder().keys());
    if (expandedOrders.size === allOrderKeys.length) {
      // Tümü açık, hepsini kapat
      setExpandedOrders(new Set());
    } else {
      // Tümünü aç
      setExpandedOrders(new Set(allOrderKeys));
    }
  };

  if (loading && modelCosts.length === 0) {
    return (
      <div className="cost-management-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  if (!loading && modelCosts.length === 0 && modelId) {
    return (
      <div className="cost-management-container">
        <div className="cost-management-header">
          <div className="header-content">
            <button
              className="back-button"
              onClick={() => navigate("/models")}
              style={{
                background: "none",
                border: "1px solid #e0e0e0",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z" />
              </svg>
              Geri
            </button>
            <h1>{model?.modelName || "Model"} - Maliyet Yönetimi</h1>
          </div>
        </div>
        <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
          <p>Bu model için henüz maliyet kaydı bulunmuyor.</p>
          <p style={{ fontSize: "14px", marginTop: "8px" }}>
            Sipariş oluşturulduğunda maliyetler otomatik olarak burada
            görünecektir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cost-management-container">
      <div className="cost-management-header">
        <div className="header-content">
          {/* Breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#666",
              marginBottom: "16px",
            }}
          >
            <span
              onClick={() => navigate("/models")}
              style={{
                cursor: "pointer",
                color: "#667eea",
                fontWeight: "500",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Modeller
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            <span style={{ color: "#333", fontWeight: "500" }}>
              {model?.modelName || "Model"}
            </span>
          </div>

          {/* Page Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1a1a1a",
                  letterSpacing: "-0.5px",
                }}
              >
                {model?.modelName || "Model"}
              </h1>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "14px",
                  color: "#666",
                  fontWeight: "400",
                }}
              >
                Maliyet Analizi ve Sipariş Detayları
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Firma Filtresi - Profesyonel Görünüm */}
      <div
        style={{
          marginTop: "24px",
          marginBottom: "24px",
          background: "white",
          padding: "20px 24px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e8e8e8",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "140px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#667eea"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <label
              style={{
                fontWeight: "600",
                fontSize: "14px",
                color: "#333",
              }}
            >
              Firma Filtresi
            </label>
          </div>
          <select
            value={selectedFirmId}
            onChange={(e) => setSelectedFirmId(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              background: "white",
              fontWeight: "500",
              color: "#333",
              transition: "all 0.2s ease",
            }}
          >
            <option value="all">Tüm Firmalar</option>
            {getAvailableFirms()
              .sort((a, b) => a.firmName.localeCompare(b.firmName))
              .map((firm) => (
                <option key={firm.firmId} value={firm.firmId}>
                  {firm.firmName}
                </option>
              ))}
          </select>
          {selectedFirmId !== "all" && (
            <button
              onClick={() => setSelectedFirmId("all")}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(102, 126, 234, 0.3)";
              }}
            >
              ✕ Filtreyi Temizle
            </button>
          )}
        </div>
      </div>
      {/* Order Bazlı Gruplama */}
      <div className="orders-container" style={{ marginTop: "24px" }}>
        {/* Tümünü Aç/Kapat Butonu */}
        {Array.from(groupByOrder()).length > 1 && (
          <div style={{ marginBottom: "20px", textAlign: "right" }}>
            <button
              onClick={toggleAllOrders}
              style={{
                padding: "10px 18px",
                background: "white",
                color: "#667eea",
                border: "2px solid #667eea",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(102, 126, 234, 0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(102, 126, 234, 0.15)";
              }}
            >
              {expandedOrders.size === Array.from(groupByOrder()).length ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  Tümünü Kapat
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Tümünü Aç
                </>
              )}
            </button>
          </div>
        )}

        {Array.from(groupByOrder()).map(([orderKey, costs]) => {
          const orderInfo = costs[0]?.order;
          const groupTotal = calculateGroupTotal(costs);
          const orderQuantity = orderInfo?.quantity || 0;
          const unitCost = orderQuantity > 0 ? groupTotal / orderQuantity : 0;

          // Firma bilgisini bul - önce direkt firmName'e bak, sonra order.firm'e
          const firstCost = costs[0];
          const firmName = firstCost?.firmName || orderInfo?.firm?.firmName;
          const firmInfo = firmName
            ? { firmName }
            : firms.find(
                (f) => f.firmId === (firstCost?.firmId || orderInfo?.firmId)
              );

          // Debug: Firma bilgisini logla
          console.log(`📊 Order ${orderKey.slice(0, 8)} - Firma Info:`, {
            firstCostFirmName: firstCost?.firmName,
            orderInfoFirmName: orderInfo?.firm?.firmName,
            calculatedFirmName: firmName,
            firmInfo: firmInfo,
          });

          return (
            <div
              key={orderKey}
              style={{
                marginBottom: "24px",
                background: "white",
                borderRadius: "12px",
                boxShadow: expandedOrders.has(orderKey)
                  ? "0 4px 20px rgba(0, 0, 0, 0.1)"
                  : "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e8e8e8",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
            >
              {/* Grup Başlığı - Tıklanabilir */}
              <div
                onClick={() => toggleOrderExpanded(orderKey)}
                style={{
                  background: expandedOrders.has(orderKey)
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                  color: expandedOrders.has(orderKey) ? "white" : "#333",
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (!expandedOrders.has(orderKey)) {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!expandedOrders.has(orderKey)) {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)";
                  }
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  {/* Icon Container */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: expandedOrders.has(orderKey)
                        ? "rgba(255, 255, 255, 0.2)"
                        : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={
                        expandedOrders.has(orderKey) ? "white" : "#667eea"
                      }
                      strokeWidth="2"
                      style={{
                        transition: "transform 0.3s ease",
                        transform: expandedOrders.has(orderKey)
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  <div>
                    <h3
                      style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}
                    >
                      {orderKey === "general"
                        ? "🏭 Genel Model Maliyetleri"
                        : `📦 Sipariş #${orderKey.slice(0, 8)}`}
                      {firmInfo && (
                        <span
                          style={{
                            marginLeft: "12px",
                            fontSize: "14px",
                            color: expandedOrders.has(orderKey)
                              ? "#e0e7ff"
                              : "#6366f1",
                            fontWeight: "500",
                          }}
                        >
                          ({firmInfo.firmName})
                        </span>
                      )}
                    </h3>
                    {orderInfo && (
                      <>
                        <p
                          style={{
                            margin: "8px 0 4px",
                            opacity: 0.95,
                            fontSize: "15px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              background: expandedOrders.has(orderKey)
                                ? "rgba(255, 255, 255, 0.3)"
                                : "#dbeafe",
                              color: expandedOrders.has(orderKey)
                                ? "white"
                                : "#1e3a8a",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                            </svg>
                            {firmInfo?.firmName || "Bilinmeyen Firma"}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            opacity: 0.85,
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          Adet: {orderInfo.quantity || "-"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      opacity: 0.85,
                      fontWeight: "500",
                      marginBottom: "4px",
                    }}
                  >
                    {costs.length} Maliyet Kalemi
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      letterSpacing: "-0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    {formatCurrency(groupTotal, "TRY")}
                  </div>
                  {orderQuantity > 0 && (
                    <div
                      style={{
                        fontSize: "14px",
                        opacity: 0.9,
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "12px", opacity: 0.8 }}>
                        Birim:
                      </span>
                      {formatCurrency(unitCost, "TRY")}
                    </div>
                  )}
                </div>
              </div>

              {/* Detaylar - Açıldığında Göster */}
              {expandedOrders.has(orderKey) && (
                <div
                  style={{
                    padding: "0",
                    animation: "slideDown 0.3s ease-out",
                    background: "#fafbfc",
                  }}
                >
                  <div
                    style={{
                      overflowX: "auto",
                      margin: "0",
                    }}
                  >
                    <table
                      className="items-table"
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8f9fa",
                            borderBottom: "2px solid #e8e8e8",
                          }}
                        >
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Maliyet Kalemi
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Kategori
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Birim 1
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Miktar 1
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Birim 2
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Miktar 2
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            3. Boyut (Ref)
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Fire %
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Net Miktar
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Birim Fiyat
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Toplam
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "right",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            TL Karşılığı
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Kullanım
                          </th>
                          <th
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#667eea",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.map((item) => {
                          const tryEquivalent = convertToTRY(
                            item.totalCost || 0,
                            item.currency || "TRY",
                            {
                              usdRate: item.usdRate,
                              eurRate: item.eurRate,
                              gbpRate: item.gbpRate,
                            }
                          );

                          return (
                            <tr key={item.modelCostId}>
                              <td>
                                <div className="item-name">
                                  <strong>{item.costItemName || "-"}</strong>
                                </div>
                              </td>
                              <td>
                                <span className="category-badge">
                                  {item.costCategoryName || "-"}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: "500" }}>
                                  {item.unit || "-"}
                                </span>
                              </td>
                              <td>
                                <strong>{item.quantity}</strong>
                              </td>
                              <td>
                                {item.unit2 ? (
                                  <span style={{ fontWeight: "500" }}>
                                    {item.unit2}
                                  </span>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.quantity2 ? (
                                  <strong>{item.quantity2}</strong>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.quantity3 && item.unit3 ? (
                                  <span
                                    style={{
                                      color: "#856404",
                                      fontSize: "0.9em",
                                    }}
                                  >
                                    <strong>{item.quantity3}</strong>
                                    <span style={{ margin: "0 4px" }}>×</span>
                                    {item.unit3}
                                  </span>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.wastagePercentage !== undefined &&
                                item.wastagePercentage !== null ? (
                                  <span
                                    style={{
                                      color: "#d32f2f",
                                      fontWeight: "600",
                                    }}
                                  >
                                    %{item.wastagePercentage}
                                  </span>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.actualQuantityNeeded ? (
                                  <strong style={{ color: "#2e7d32" }}>
                                    {formatNumber(item.actualQuantityNeeded)}
                                  </strong>
                                ) : (
                                  item.quantity
                                )}
                              </td>
                              <td className="price-cell">
                                {item.unitPrice &&
                                  formatCurrency(item.unitPrice, item.currency)}
                              </td>
                              <td className="price-cell">
                                <strong style={{ color: "#1976d2" }}>
                                  {item.totalCost &&
                                    formatCurrency(
                                      item.totalCost,
                                      item.currency
                                    )}
                                </strong>
                              </td>
                              <td className="price-cell">
                                <strong style={{ color: "#2e7d32" }}>
                                  {formatCurrency(tryEquivalent, "TRY")}
                                </strong>
                                {item.currency !== "TRY" && item.usdRate && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#666",
                                      marginTop: "2px",
                                    }}
                                  >
                                    1 {item.currency} ={" "}
                                    {item.currency === "USD"
                                      ? item.usdRate
                                      : item.currency === "EUR"
                                      ? item.eurRate
                                      : item.gbpRate}{" "}
                                    TL
                                  </div>
                                )}
                              </td>
                              <td>
                                {item.order?.workshop?.name ? (
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      color: "#2c3e50",
                                      fontWeight: "500",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "4px 8px",
                                      background: "#e8f5e9",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#2e7d32"
                                      strokeWidth="2"
                                    >
                                      <rect
                                        x="2"
                                        y="7"
                                        width="20"
                                        height="14"
                                        rx="2"
                                        ry="2"
                                      ></rect>
                                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                    </svg>
                                    {item.order.workshop.name}
                                  </span>
                                ) : item.usage ? (
                                  <span
                                    style={{ fontSize: "13px", color: "#666" }}
                                    title={item.usage}
                                  >
                                    {item.usage.substring(0, 20)}
                                    {item.usage.length > 20 ? "..." : ""}
                                  </span>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="delete-button"
                                    onClick={() => handleDelete(item)}
                                    title="Kaldır"
                                    style={{
                                      background: "#ffebee",
                                      border: "1px solid #ffcdd2",
                                      padding: "6px 12px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Eski tfoot ve boş mesaj - Kaldırıldı */}
      {modelCosts.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          <p style={{ color: "#999", fontSize: "16px" }}>
            Bu model için henüz maliyet kalemi eklenmemiş.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelCosts;
