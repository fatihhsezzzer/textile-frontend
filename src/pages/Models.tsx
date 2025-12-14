import React, { useState, useEffect } from "react";
import { Model } from "../types";
import { modelService } from "../services/dataService";
import { useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import "./Models.css";

const Models: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await modelService.getAll();
      setModels(data);
    } catch (error) {
      console.error("❌ Failed to load models:", error);
      alert("Modeller yüklenemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Benzersiz kategorileri ve sezonları al
  const categories = Array.from(
    new Set(models.map((m) => m.category).filter(Boolean))
  ).sort();
  const seasons = Array.from(
    new Set(models.map((m) => m.season).filter(Boolean))
  ).sort();

  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.season?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || model.category === selectedCategory;
    const matchesSeason =
      selectedSeason === "all" || model.season === selectedSeason;

    return matchesSearch && matchesCategory && matchesSeason;
  });

  // İstatistikler
  const totalModels = filteredModels.length;
  const totalEstimatedValue = filteredModels.reduce(
    (sum, model) => sum + (model.estimatedPrice || 0),
    0
  );
  const averagePrice = totalModels > 0 ? totalEstimatedValue / totalModels : 0;

  if (loading && models.length === 0) {
    return <PageLoader message="Modeller yükleniyor..." />;
  }

  return (
    <div
      style={{
        padding: "32px",
        background: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* Header Section */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "#666",
            marginBottom: "20px",
          }}
        >
          <span style={{ color: "#333", fontWeight: "500" }}>Ana Sayfa</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
          <span style={{ color: "#667eea", fontWeight: "600" }}>
            Model Raporları
          </span>
        </div>

        {/* Title and Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M12 18h0"></path>
                <path d="M12 14h0"></path>
                <path d="M12 10h0"></path>
              </svg>
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#1a1a1a",
                  letterSpacing: "-0.5px",
                }}
              >
                Model Raporları
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "15px",
                  color: "#666",
                  fontWeight: "400",
                }}
              >
                Tüm model maliyetleri ve detaylı analiz
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "20px 24px",
                borderRadius: "12px",
                minWidth: "140px",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Toplam Model
              </div>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "white",
                  letterSpacing: "-0.5px",
                }}
              >
                {totalModels}
              </div>
            </div>

            <div
              style={{
                background: "white",
                padding: "20px 24px",
                borderRadius: "12px",
                minWidth: "180px",
                border: "2px solid #e8e8e8",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Ortalama Fiyat
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#667eea",
                  letterSpacing: "-0.5px",
                }}
              >
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(averagePrice)}
              </div>
            </div>

            <div
              style={{
                background: "white",
                padding: "20px 24px",
                borderRadius: "12px",
                minWidth: "180px",
                border: "2px solid #e8e8e8",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Toplam Değer
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#10b981",
                  letterSpacing: "-0.5px",
                }}
              >
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(totalEstimatedValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div
          style={{
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
            fill="none"
            stroke="#667eea"
            strokeWidth="2"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Filtrele ve Ara
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Model adı, kodu ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px 12px 46px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "12px 14px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#333",
              cursor: "pointer",
              background: "white",
              transition: "all 0.2s ease",
            }}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Season Filter */}
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{
              padding: "12px 14px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#333",
              cursor: "pointer",
              background: "white",
              transition: "all 0.2s ease",
            }}
          >
            <option value="all">Tüm Sezonlar</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(searchTerm ||
          selectedCategory !== "all" ||
          selectedSeason !== "all") && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {searchTerm && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#f0f4ff",
                  color: "#667eea",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Arama: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#667eea",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCategory !== "all" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#f0f4ff",
                  color: "#667eea",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Kategori: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#667eea",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            {selectedSeason !== "all" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#f0f4ff",
                  color: "#667eea",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Sezon: {selectedSeason}
                <button
                  onClick={() => setSelectedSeason("all")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#667eea",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Models Table */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "2px solid #f0f0f0",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: "#333",
              letterSpacing: "-0.3px",
            }}
          >
            Model Listesi ({filteredModels.length})
          </h2>
        </div>

        {filteredModels.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#fafbfc",
                    borderBottom: "2px solid #e8e8e8",
                  }}
                >
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#667eea",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Model Bilgileri
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "center",
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
                      padding: "16px 24px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#667eea",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Sezon
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#667eea",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Renk
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#667eea",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Kumaş
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#667eea",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Tahmini Fiyat
                  </th>
                  <th
                    style={{
                      padding: "16px 24px",
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
                {filteredModels.map((model, index) => (
                  <tr
                    key={model.modelId}
                    style={{
                      background: index % 2 === 0 ? "white" : "#fafbfc",
                      borderBottom: "1px solid #f0f0f0",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f8f9ff";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(102, 126, 234, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        index % 2 === 0 ? "white" : "#fafbfc";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <td
                      style={{
                        padding: "20px 24px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "#1a1a1a",
                            marginBottom: "4px",
                          }}
                        >
                          {model.modelName}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            fontFamily: "monospace",
                          }}
                        >
                          {model.modelCode}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "center",
                      }}
                    >
                      {model.category ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#f0f4ff",
                            color: "#667eea",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          {model.category}
                        </span>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "center",
                      }}
                    >
                      {model.season ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#fff4e6",
                            color: "#f59e0b",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          {model.season}
                        </span>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "center",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      {model.color || "—"}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "center",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      {model.fabric || "—"}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "right",
                      }}
                    >
                      {model.estimatedPrice ? (
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "#10b981",
                          }}
                        >
                          {new Intl.NumberFormat("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(model.estimatedPrice)}
                        </span>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        textAlign: "center",
                      }}
                    >
                      <button
                        onClick={() =>
                          navigate(`/models/${model.modelId}/costs`)
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 18px",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(102, 126, 234, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(102, 126, 234, 0.3)";
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                        </svg>
                        Maliyet Detayları
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="#e0e0e0"
              style={{ marginBottom: "16px" }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "18px",
                fontWeight: "600",
                color: "#666",
              }}
            >
              Model bulunamadı
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#999",
              }}
            >
              {searchTerm ||
              selectedCategory !== "all" ||
              selectedSeason !== "all"
                ? "Arama ve filtre kriterlerine uygun model bulunamadı."
                : "Henüz hiç model eklenmemiş."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Models;
