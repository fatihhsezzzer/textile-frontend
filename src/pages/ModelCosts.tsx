import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ModelCost, Model, Firm } from "../types";
import {
  costService,
  modelService,
  firmService,
} from "../services/dataService";
import {
  formatCurrency,
  formatNumber,
  turkishIncludes,
} from "../utils/formatters";
import "./CostManagement.css";

const ModelCosts: React.FC = () => {
  const { modelId, firmId } = useParams<{
    modelId?: string;
    firmId?: string;
  }>();
  const navigate = useNavigate();

  // State
  const [firms, setFirms] = useState<Firm[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ModelCost | null>(null);
  const [firmSearchTerm, setFirmSearchTerm] = useState("");
  const [modelSearchTerm, setModelSearchTerm] = useState("");

  useEffect(() => {
    if (modelId) {
      // Model detayı görünümü
      loadModel();
      loadModelCosts();
    } else if (firmId) {
      // Firma modelleri görünümü
      loadFirmModels();
    } else {
      // Firma listesi görünümü
      loadFirms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, firmId]);

  const loadFirms = async () => {
    try {
      setLoading(true);
      const data = await firmService.getFirms();
      setFirms(data);
    } catch (error) {
      console.error("❌ Failed to load firms:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFirmModels = async () => {
    if (!firmId) return;
    try {
      setLoading(true);
      const [allModels, allFirms] = await Promise.all([
        modelService.getAll(),
        firmService.getFirms(),
      ]);
      const firmModels = allModels.filter((m) => m.firmId === firmId);
      setModels(firmModels);
      setFirms(allFirms);
    } catch (error) {
      console.error("❌ Failed to load firm models:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadModel = async () => {
    if (!modelId) return;
    try {
      const [allModels, allFirms] = await Promise.all([
        modelService.getAll(),
        firmService.getFirms(),
      ]);
      const found = allModels.find((m) => m.modelId === modelId);
      setModel(found || null);
      setFirms(allFirms);
    } catch (error) {
      console.error("❌ Failed to load model:", error);
    }
  };

  const loadModelCosts = async () => {
    if (!modelId) return;
    try {
      setLoading(true);
      const data = await costService.getModelCosts(modelId);
      // İlk kayıttaki firma bilgisini kontrol et
      if (data.length > 0) {
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

  const handleEdit = (item: ModelCost) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleUpdateModelCost = async (updatedItem: ModelCost) => {
    try {
      setLoading(true);
      await costService.updateModelCost(updatedItem.modelCostId, updatedItem);
      alert("Model maliyeti başarıyla güncellendi!");
      setShowEditModal(false);
      setEditingItem(null);
      loadModelCosts();
    } catch (error: any) {
      console.error("❌ Failed to update model cost:", error);
      alert("Model maliyeti güncellenemedi!");
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

  // Order'lara göre grupla
  const groupByOrder = () => {
    const grouped = new Map<string, ModelCost[]>();

    modelCosts.forEach((cost) => {
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

  // ============================================
  // RENDER: Firma Listesi Görünümü
  // ============================================
  if (!firmId && !modelId) {
    if (loading) {
      return (
        <div className="cost-management-container">
          <div className="loading">Yükleniyor...</div>
        </div>
      );
    }

    const filteredFirms = firms.filter(
      (firm) =>
        turkishIncludes(firm.firmName, firmSearchTerm) ||
        turkishIncludes(firm.firmCode, firmSearchTerm) ||
        turkishIncludes(firm.contactPerson || "", firmSearchTerm) ||
        turkishIncludes(firm.phone || "", firmSearchTerm) ||
        turkishIncludes(firm.email || "", firmSearchTerm)
    );

    return (
      <div className="cost-management-container">
        <div className="cost-management-header">
          <div className="header-content">
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                color: "#1a1a1a",
              }}
            >
              Firma Bazlı Model Maliyetleri
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "14px",
                color: "#666",
              }}
            >
              Firma seçerek modellere ulaşın ({filteredFirms.length}/
              {firms.length} firma)
            </p>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Arama */}
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: "400px" }}>
              <input
                type="text"
                placeholder="Firma ara... (kod, ad, iletişim)"
                value={firmSearchTerm}
                onChange={(e) => setFirmSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 42px",
                  fontSize: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#667eea")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
              />
              <svg
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#999"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                  }}
                >
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Firma Kodu
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Firma Adı
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    İletişim
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "right",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFirms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      Arama kriterlerine uygun firma bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredFirms.map((firm, index) => (
                    <tr
                      key={firm.firmId}
                      onClick={() =>
                        navigate(`/model-costs/firm/${firm.firmId}`)
                      }
                      style={{
                        cursor: "pointer",
                        background: index % 2 === 0 ? "white" : "#f9fafb",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f0f4ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          index % 2 === 0 ? "white" : "#f9fafb";
                      }}
                    >
                      <td
                        style={{
                          padding: "16px",
                          borderTop: "1px solid #e8e8e8",
                          fontSize: "14px",
                          color: "#666",
                          fontWeight: "500",
                        }}
                      >
                        {firm.firmCode}
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderTop: "1px solid #e8e8e8",
                          fontSize: "15px",
                          color: "#1a1a1a",
                          fontWeight: "600",
                        }}
                      >
                        {firm.firmName}
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderTop: "1px solid #e8e8e8",
                          fontSize: "13px",
                          color: "#666",
                        }}
                      >
                        {firm.phone || firm.email || "-"}
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderTop: "1px solid #e8e8e8",
                          textAlign: "right",
                        }}
                      >
                        <button
                          style={{
                            padding: "8px 16px",
                            background: "#667eea",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#5568d3";
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#667eea";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          Modelleri Gör →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Firma Modelleri Görünümü
  // ============================================
  if (firmId && !modelId) {
    if (loading) {
      return (
        <div className="cost-management-container">
          <div className="loading">Yükleniyor...</div>
        </div>
      );
    }

    const currentFirm = firms.find((f) => f.firmId === firmId);

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
                onClick={() => navigate("/model-costs")}
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
                Firmalar
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
              <span style={{ color: "#333", fontWeight: "500" }}>
                {currentFirm?.firmName || "Firma"}
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                color: "#1a1a1a",
              }}
            >
              📦 {currentFirm?.firmName} - Modeller
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "14px",
                color: "#666",
              }}
            >
              Model seçerek maliyet detaylarına ulaşın ({models.length} model)
            </p>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Arama */}
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: "400px" }}>
              <input
                type="text"
                placeholder="Model ara... (kod, ad, kategori, sezon)"
                value={modelSearchTerm}
                onChange={(e) => setModelSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 42px",
                  fontSize: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#667eea")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
              />
              <svg
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#999"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
          {models.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
                color: "#666",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              Bu firmaya ait model bulunmuyor.
            </div>
          ) : (
            (() => {
              const filteredModels = models.filter(
                (model) =>
                  turkishIncludes(model.modelName, modelSearchTerm) ||
                  turkishIncludes(model.modelCode, modelSearchTerm) ||
                  turkishIncludes(model.category || "", modelSearchTerm) ||
                  turkishIncludes(model.season || "", modelSearchTerm)
              );

              return (
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                        }}
                      >
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          Model Kodu
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          Model Adı
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          Kategori
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          Sezon
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "right",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModels.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "#666",
                              fontSize: "14px",
                            }}
                          >
                            Arama kriterlerine uygun model bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredModels.map((model, index) => (
                          <tr
                            key={model.modelId}
                            onClick={() =>
                              navigate(`/model-costs/model/${model.modelId}`)
                            }
                            style={{
                              cursor: "pointer",
                              background: index % 2 === 0 ? "white" : "#f9fafb",
                              transition: "background-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f0f4ff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                index % 2 === 0 ? "white" : "#f9fafb";
                            }}
                          >
                            <td
                              style={{
                                padding: "16px",
                                borderTop: "1px solid #e8e8e8",
                                fontSize: "14px",
                                color: "#666",
                                fontWeight: "500",
                              }}
                            >
                              {model.modelCode}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                borderTop: "1px solid #e8e8e8",
                                fontSize: "15px",
                                color: "#1a1a1a",
                                fontWeight: "600",
                              }}
                            >
                              👔 {model.modelName}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                borderTop: "1px solid #e8e8e8",
                                fontSize: "13px",
                                color: "#666",
                              }}
                            >
                              {model.category || "-"}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                borderTop: "1px solid #e8e8e8",
                                fontSize: "13px",
                                color: "#666",
                              }}
                            >
                              {model.season || "-"}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                borderTop: "1px solid #e8e8e8",
                                textAlign: "right",
                              }}
                            >
                              <button
                                style={{
                                  padding: "8px 16px",
                                  background: "#667eea",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#5568d3";
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#667eea";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                Maliyetleri Gör →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Model Detayı ve Maliyetler
  // ============================================
  if (loading && modelCosts.length === 0) {
    return (
      <div className="cost-management-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  if (!loading && modelCosts.length === 0 && modelId) {
    const modelFirmId = model?.firmId;
    const currentFirm = firms.find((f) => f.firmId === modelFirmId);

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
                onClick={() => navigate("/model-costs")}
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
                Firmalar
              </span>
              {modelFirmId && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                  <span
                    onClick={() => navigate(`/model-costs/firm/${modelFirmId}`)}
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
                    {currentFirm?.firmName || "Firma"}
                  </span>
                </>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
              <span style={{ color: "#333", fontWeight: "500" }}>
                {model?.modelName || "Model"}
              </span>
            </div>

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
              onClick={() => navigate("/model-costs")}
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
              Firmalar
            </span>
            {model?.firmId && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
                <span
                  onClick={() => navigate(`/model-costs/firm/${model.firmId}`)}
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
                  {firms.find((f) => f.firmId === model.firmId)?.firmName ||
                    "Firma"}
                </span>
              </>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            <span style={{ color: "#333", fontWeight: "500" }}>
              {model?.modelName || "Model"}
            </span>
          </div>
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

          // Debug: orderInfo'yu konsola bas
          // Debug: Kur bilgisini kontrol et
          const firstCost = costs[0];

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
                        : `📦 Sipariş #${orderKey}`}
                    </h3>
                    {orderInfo && (
                      <>
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
                    {/* Sipariş Tarihi - exchangeRateDate'den al */}
                    {firstCost?.exchangeRateDate && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          opacity: 0.85,
                          fontSize: "13px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {new Date(
                          firstCost.exchangeRateDate
                        ).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    {/* Döviz Kurları - orderInfo dışında */}
                    <p
                      style={{
                        margin: "4px 0 0",
                        opacity: 0.85,
                        fontSize: "12px",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span>
                        Kurlar{" "}
                        {firstCost?.createdAt &&
                          `(${new Date(firstCost.createdAt).toLocaleDateString(
                            "tr-TR"
                          )})`}
                        :
                      </span>
                      <span
                        style={{
                          background: expandedOrders.has(orderKey)
                            ? "rgba(255,255,255,0.2)"
                            : "#e0f2fe",
                          color: expandedOrders.has(orderKey)
                            ? "white"
                            : "#0369a1",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        USD: {firstCost?.usdRate?.toFixed(4) || "Yok"}
                      </span>
                      <span
                        style={{
                          background: expandedOrders.has(orderKey)
                            ? "rgba(255,255,255,0.2)"
                            : "#fef3c7",
                          color: expandedOrders.has(orderKey)
                            ? "white"
                            : "#92400e",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        EUR: {firstCost?.eurRate?.toFixed(4) || "Yok"}
                      </span>
                    </p>
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
                                <div
                                  className="action-buttons"
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    justifyContent: "center",
                                  }}
                                >
                                  <button
                                    onClick={() => handleEdit(item)}
                                    title="Düzenle"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      border: "none",
                                      padding: "8px 14px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      color: "white",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      boxShadow:
                                        "0 2px 8px rgba(102, 126, 234, 0.3)",
                                      transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(-2px)";
                                      e.currentTarget.style.boxShadow =
                                        "0 4px 12px rgba(102, 126, 234, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(0)";
                                      e.currentTarget.style.boxShadow =
                                        "0 2px 8px rgba(102, 126, 234, 0.3)";
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item)}
                                    title="Sil"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                      border: "none",
                                      padding: "8px 14px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      color: "white",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      boxShadow:
                                        "0 2px 8px rgba(245, 87, 108, 0.3)",
                                      transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(-2px)";
                                      e.currentTarget.style.boxShadow =
                                        "0 4px 12px rgba(245, 87, 108, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(0)";
                                      e.currentTarget.style.boxShadow =
                                        "0 2px 8px rgba(245, 87, 108, 0.3)";
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Sil
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

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <EditModelCostModal
          item={editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={handleUpdateModelCost}
        />
      )}
    </div>
  );
};

// Edit Modal Component
interface EditModalProps {
  item: ModelCost;
  onClose: () => void;
  onSave: (item: ModelCost) => void;
}

const EditModelCostModal: React.FC<EditModalProps> = ({
  item,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ModelCost>(item);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof ModelCost, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: "24px",
            borderBottom: "1px solid #e8e8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#1a1a1a",
            }}
          >
            Miktar Düzenle
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: "#999",
              lineHeight: "1",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.color = "#333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "#999";
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div
            className="modal-body"
            style={{
              padding: "24px",
            }}
          >
            {/* Maliyet Kalemi Bilgisi - Sadece Gösterim */}
            <div
              style={{
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "24px",
                border: "1px solid #e9ecef",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <span
                  style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}
                >
                  Maliyet Kalemi:
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "14px",
                    color: "#1a1a1a",
                    fontWeight: "600",
                  }}
                >
                  {formData.costItemName}
                </span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span
                  style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}
                >
                  Kategori:
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "14px",
                    color: "#1a1a1a",
                  }}
                >
                  {formData.costCategoryName}
                </span>
              </div>
              <div>
                <span
                  style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}
                >
                  Birim Fiyat:
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "14px",
                    color: "#1a1a1a",
                    fontWeight: "600",
                  }}
                >
                  {formData.unitPrice} {formData.currency}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Quantity 1 - Always shown */}
              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333",
                  }}
                >
                  Miktar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity || ""}
                  onChange={(e) =>
                    handleChange("quantity", parseFloat(e.target.value) || 0)
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#667eea")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e0e0e0")
                  }
                />
              </div>
              <div className="form-group">
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333",
                  }}
                >
                  Birim
                </label>
                <input
                  type="text"
                  value={formData.unit || ""}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "2px solid #e8e8e8",
                    borderRadius: "8px",
                    background: "#f5f5f5",
                    color: "#999",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              {/* Quantity 2 - Only if exists */}
              {formData.quantity2 !== undefined &&
                formData.quantity2 !== null && (
                  <>
                    <div className="form-group">
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Miktar 2
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.quantity2 || ""}
                        onChange={(e) =>
                          handleChange(
                            "quantity2",
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "2px solid #e0e0e0",
                          borderRadius: "8px",
                          outline: "none",
                          transition: "border-color 0.2s ease",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#667eea")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#e0e0e0")
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Birim 2
                      </label>
                      <input
                        type="text"
                        value={formData.unit2 || ""}
                        readOnly
                        disabled
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "2px solid #e8e8e8",
                          borderRadius: "8px",
                          background: "#f5f5f5",
                          color: "#999",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                  </>
                )}

              {/* Quantity 3 - Only if exists */}
              {formData.quantity3 !== undefined &&
                formData.quantity3 !== null && (
                  <>
                    <div className="form-group">
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Miktar 3 (Ref)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.quantity3 || ""}
                        onChange={(e) =>
                          handleChange(
                            "quantity3",
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "2px solid #e0e0e0",
                          borderRadius: "8px",
                          outline: "none",
                          transition: "border-color 0.2s ease",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#667eea")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#e0e0e0")
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Birim 3 (Ref)
                      </label>
                      <input
                        type="text"
                        value={formData.unit3 || ""}
                        readOnly
                        disabled
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "2px solid #e8e8e8",
                          borderRadius: "8px",
                          background: "#f5f5f5",
                          color: "#999",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                  </>
                )}
            </div>
          </div>
          <div
            className="modal-footer"
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e8e8e8",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                border: "2px solid #e0e0e0",
                background: "white",
                color: "#666",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#999";
                e.currentTarget.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.color = "#666";
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelCosts;
