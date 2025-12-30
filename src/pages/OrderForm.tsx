import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  Order,
  Model,
  Workshop,
  Operator,
  Technic,
  Firm,
  OrderImage,
  Currency,
  OrderUnit,
  OrderStatus,
  ModelPriceHistory,
  ModelPriceHistoryItem,
  User,
} from "../types";
import {
  orderService,
  firmService,
  workshopService,
  exchangeRateService,
  costService,
  modelService,
  userService,
} from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import ModelModal from "../components/ModelModal";
import WorkshopModal from "../components/WorkshopModal";
import OperatorModal from "../components/OperatorModal";
import TechnicModal from "../components/TechnicModal";
import FirmModal from "../components/FirmModal";
import PageLoader from "../components/PageLoader";
import "./OrderForm.css";

const OrderForm: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!orderId;

  // Geri gitme için history tracking
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1); // Bir önceki sayfaya git
    } else {
      navigate("/"); // Eğer history yoksa ana sayfaya git
    }
  };

  const [loading, setLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null
  );
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(
    null
  );
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [selectedTechnics, setSelectedTechnics] = useState<Technic[]>([]);
  const [selectedModelist, setSelectedModelist] = useState<User | null>(null);
  const [modelists, setModelists] = useState<User[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<OrderImage[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [priceHistory, setPriceHistory] = useState<ModelPriceHistory | null>(
    null
  );
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);

  const [showModelModal, setShowModelModal] = useState(false);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showTechnicModal, setShowTechnicModal] = useState(false);
  const [showFirmModal, setShowFirmModal] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });
  const [qrPrintModal, setQrPrintModal] = useState<{
    show: boolean;
    order: Order | null;
    qrCodeDataUrl: string | null;
  }>({ show: false, order: null, qrCodeDataUrl: null });

  const [newOrder, setNewOrder] = useState({
    deadline: "",
    quantity: 1,
    unit: OrderUnit.Adet,
    pieceCount: 1,
    price: "",
    currency: "TRY",
    priority: "",
    note: "",
    invoice: "",
    invoiceNumber: "",
  });

  useEffect(() => {
    loadCurrencies();
    loadModelists();
    if (isEditMode && orderId) {
      loadOrderForEdit(orderId);
    } else {
      // Yeni sipariş için otomatik olarak "Atanmamış İşler" atölyesini seç
      loadDefaultWorkshop();
    }
  }, [isEditMode, orderId]);

  const loadModelists = async () => {
    try {
      const modelistsData = await userService.getModelists();
      setModelists(modelistsData);
    } catch (error) {
      console.error("❌ Modelistler yüklenemedi:", error);
    }
  };

  const loadDefaultWorkshop = async () => {
    try {
      const workshops = await workshopService.getAll();
      const atanmamisWorkshop = workshops.find(
        (w) => w.name && w.name.toLowerCase().includes("atanmamış")
      );
      if (atanmamisWorkshop) {
        setSelectedWorkshop(atanmamisWorkshop);
      }
    } catch (error) {
      console.error("❌ Atölyeler yüklenemedi:", error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const currenciesData = await exchangeRateService.getCurrencies();
      setCurrencies(currenciesData);
    } catch (error) {
      console.error("❌ Failed to load currencies:", error);
    }
  };

  const loadModelCostsAndAutoFill = async (modelId: string) => {
    try {
      setLoadingPriceHistory(true);
      const history = await modelService.getPriceHistory(modelId);
      setPriceHistory(history);

      // Eğer fiyat geçmişi varsa modal aç
      if (history.priceHistory && history.priceHistory.length > 0) {
        setShowPriceHistoryModal(true);
      } else {
      }
    } catch (error) {
      console.error("❌ Fiyat geçmişi yüklenemedi:", error);
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  const handlePriceSelect = (priceItem: ModelPriceHistoryItem) => {
    // Birim tipini OrderUnit enum'una çevir
    let orderUnit = OrderUnit.Adet;
    const unitName = priceItem.orderUnitName.toLowerCase();
    if (unitName.includes("takım") || unitName.includes("takim")) {
      orderUnit = OrderUnit.Takim;
    } else if (unitName.includes("metre")) {
      orderUnit = OrderUnit.Metre;
    }

    // Fiyat ve birimi otomatik doldur
    setNewOrder((prev) => ({
      ...prev,
      price: priceItem.price.toFixed(2),
      unit: orderUnit,
      currency: priceItem.priceCurrency,
    }));

    setShowPriceHistoryModal(false);
  };

  const loadOrderForEdit = async (id: string) => {
    try {
      setLoading(true);
      // Önce mevcut seçimleri temizle
      setSelectedTechnics([]);

      // Detaylı sipariş bilgisini getById ile al
      const order = await orderService.getById(id);

      if (!order) {
        alert("Sipariş bulunamadı!");
        handleGoBack();
        return;
      }

      setEditingOrder(order);
      setNewOrder({
        deadline: order.deadline ? order.deadline.split("T")[0] : "",
        quantity: order.quantity || 1,
        unit: order.unit !== undefined ? order.unit : OrderUnit.Adet,
        pieceCount: order.pieceCount || 1,
        price: order.price?.toString() || "",
        currency: order.priceCurrency || order.currency || "TRY",
        priority: order.priority || "",
        note: order.note || "",
        invoice: order.invoice || "",
        invoiceNumber: order.invoiceNumber || "",
      });

      setSelectedFirm(order.firm || null);
      setSelectedModel(order.model || null);
      setSelectedWorkshop(order.workshop || null);
      setSelectedOperator(order.operator || null);

      // Load selected modelist if modelistUserId exists
      if (order.modelistUserId && modelists.length > 0) {
        const modelist = modelists.find(
          (m) => m.userId === order.modelistUserId
        );
        setSelectedModelist(modelist || null);
      } else {
        setSelectedModelist(null);
      }

      if (order.orderTechnics && order.orderTechnics.length > 0) {
        const technics = order.orderTechnics
          .map((ot) => ot.technic)
          .filter((t): t is Technic => t !== undefined);
        // Duplicate'leri kaldır (technicId'ye göre)
        const uniqueTechnics = technics.filter(
          (technic, index, self) =>
            index === self.findIndex((t) => t.technicId === technic.technicId)
        );
        setSelectedTechnics(uniqueTechnics);
      } else {
        // Sipariş teknik içermiyorsa listeyi temizle
        setSelectedTechnics([]);
      }

      if (order.images && order.images.length > 0) {
        setExistingImages(order.images);
      }
    } catch (error) {
      console.error("❌ Failed to load order:", error);
      alert("Sipariş yüklenemedi!");
      handleGoBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModel) {
      alert("Lütfen bir model seçin!");
      return;
    }

    if (!selectedFirm) {
      alert("Lütfen bir firma seçin!");
      return;
    }

    try {
      setLoading(true);

      if (!selectedFirm || !selectedFirm.firmId) {
        throw new Error("Seçili firma bulunamadı");
      }
      if (!selectedModel || !selectedModel.modelId) {
        throw new Error("Seçili model bulunamadı");
      }

      // Atölye otomatik ataması
      let workshopToUse = selectedWorkshop;

      // Yeni sipariş oluştururken VEYA workshop seçili değilse otomatik ata
      if (!isEditMode || !workshopToUse) {
        try {
          const workshops = await workshopService.getAll();

          // Eğer digital/dijital/sticket/bsn/numune teknikleri seçildiyse desinatör atölyesini ata
          const hasDesignTechnic = selectedTechnics.some(
            (t) =>
              t.name.toLowerCase().includes("digital") ||
              t.name.toLowerCase().includes("dijital") ||
              t.name.toLowerCase().includes("sticket") ||
              t.name.toLowerCase().includes("sticker") ||
              t.name.toLowerCase().includes("bsn") ||
              t.name.toLowerCase().includes("numune")
          );

          if (hasDesignTechnic) {
            // Desinatör atölyesini bul
            workshopToUse =
              workshops.find(
                (w) => w.name && w.name.toLowerCase().includes("desinatör")
              ) || null;

            if (!workshopToUse) {
              workshopToUse =
                workshops.find(
                  (w) => w.name && w.name.toLowerCase().includes("atanmamış")
                ) || null;
            }
          } else {
            // Atanmamış İşler atölyesini bul
            workshopToUse =
              workshops.find(
                (w) => w.name && w.name.toLowerCase().includes("atanmamış")
              ) || null;
          }
        } catch (error) {
          console.error("❌ Atölyeler yüklenemedi:", error);
        }
      }

      const orderTechnics = selectedTechnics.map((technic) => ({
        orderTechnicId: undefined,
        orderId: undefined,
        technicId: technic.technicId,
        technic: undefined,
      }));

      // Status'u otomatik belirle: "Atanmamış İşler" atölyesi seçilirse veya atölye yoksa Atanmadı, diğer atölyeler için İşlemde
      const orderStatus =
        !workshopToUse ||
        (workshopToUse.name &&
          workshopToUse.name.toLowerCase().includes("atanmamış"))
          ? OrderStatus.Atanmadi
          : OrderStatus.Islemde;

      const orderData = {
        acceptanceDate: new Date().toISOString(), // Kabul tarihi şu an
        firmId: selectedFirm.firmId,
        modelId: selectedModel.modelId,
        quantity: newOrder.quantity,
        orderUnitId: newOrder.unit, // Backend orderUnitId bekliyor
        pieceCount:
          newOrder.unit === OrderUnit.Takim ? newOrder.pieceCount : undefined,
        price: newOrder.price ? parseFloat(newOrder.price) : undefined,
        priceCurrency: newOrder.currency,
        workshopId: workshopToUse?.workshopId || undefined,
        operatorId: selectedOperator?.operatorId || undefined,
        modelistUserId: selectedModelist?.userId || undefined, // Include modelist if selected
        status: orderStatus, // Otomatik belirlenen status
        orderStatusId: orderStatus, // Status ID'yi de gönder
        priority: newOrder.priority || undefined,
        deadline: newOrder.deadline
          ? new Date(newOrder.deadline).toISOString()
          : undefined,
        note: newOrder.note || undefined,
        invoice: newOrder.invoice || undefined,
        invoiceNumber: newOrder.invoiceNumber || undefined,
        createdBy: user?.userId || "unknown-user",
        isActive: true,
        orderTechnics: orderTechnics,
        images: [],
      };
      let resultOrder: Order;

      if (isEditMode && editingOrder) {
        const orderTechnicsForUpdate = selectedTechnics.map((technic) => ({
          orderTechnicId: undefined,
          orderId: editingOrder.orderId,
          technicId: technic.technicId,
          technic: undefined,
        }));

        // Backend'e sadece gerekli alanları gönder, nested objeler olmasın
        // Edit mode'da mevcut statüyü koru - statü değişikliği sadece atölye üzerinden yapılmalı
        const currentStatus = editingOrder.status || OrderStatus.Atanmadi;

        const updateData = {
          orderId: editingOrder.orderId,
          acceptanceDate: editingOrder.acceptanceDate, // Kabul tarihini koru
          completionDate: editingOrder.completionDate,
          deadline: newOrder.deadline
            ? new Date(newOrder.deadline).toISOString()
            : undefined,
          firmId: selectedFirm.firmId,
          modelId: selectedModel.modelId,
          quantity: newOrder.quantity,
          orderUnitId: newOrder.unit,
          pieceCount:
            newOrder.unit === OrderUnit.Takim ? newOrder.pieceCount : undefined,
          price: newOrder.price ? parseFloat(newOrder.price) : undefined,
          priceCurrency: newOrder.currency,
          workshopId: selectedWorkshop?.workshopId || undefined,
          operatorId: selectedOperator?.operatorId || undefined,
          modelistUserId: selectedModelist?.userId || undefined, // Include modelist if selected
          priority: newOrder.priority || undefined,
          note: newOrder.note || undefined,
          invoice: newOrder.invoice || undefined,
          invoiceNumber: newOrder.invoiceNumber || undefined,
          status: currentStatus,
          orderStatusId: currentStatus, // Mevcut statüyü koru
          qrCodeUrl: editingOrder.qrCodeUrl,
          createdAt: editingOrder.createdAt,
          createdBy: editingOrder.createdBy,
          updatedAt: editingOrder.updatedAt,
          updatedBy: editingOrder.updatedBy,
          isActive: editingOrder.isActive,
          orderTechnics: orderTechnicsForUpdate, // Teknikleri de gönder
        };

        await orderService.update(
          editingOrder.orderId,
          updateData as unknown as Order
        );
        resultOrder = updateData as unknown as Order;
      } else {
        resultOrder = await orderService.create(orderData as any);
        if (resultOrder.qrCodeUrl) {
        } else {
          console.warn("⚠️ QR Code URL not found in response");
        }
      }

      // Resimleri yükle
      if (selectedImages.length > 0 && resultOrder.orderId) {
        try {
          await orderService.uploadImages(resultOrder.orderId, selectedImages);
        } catch (error) {
          console.error("❌ Image upload failed:", error);
          alert("Resimler yüklenemedi, ancak sipariş kaydedildi.");
        }
      }

      // Yeni sipariş oluşturulduğunda QR modal göster
      if (!isEditMode && resultOrder) {
        setLoading(false);

        // QR Code URL'den QR kod oluştur
        let qrDataUrl: string | null = null;
        if (resultOrder.qrCodeUrl) {
          try {
            qrDataUrl = await QRCode.toDataURL(resultOrder.qrCodeUrl, {
              width: 400,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
              errorCorrectionLevel: "H",
            });
          } catch (qrError) {
            console.error("❌ Failed to generate QR code:", qrError);
          }
        } else {
          console.warn(
            "⚠️ No QR Code URL in response, cannot generate QR code"
          );
        }

        setQrPrintModal({
          show: true,
          order: resultOrder,
          qrCodeDataUrl: qrDataUrl,
        });
        return; // Modal kapatılınca handleGoBack çağrılacak
      }

      alert("Sipariş başarıyla güncellendi!");
      handleGoBack(); // Önceki sayfaya dön
    } catch (error: any) {
      console.error("❌ Order submission error:", error);

      let errorMessage = `Sipariş ${
        isEditMode ? "güncellenemedi" : "oluşturulamadı"
      }`;

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage =
          "İşlem zaman aşımına uğradı. Sipariş oluşturulmuş olabilir, lütfen sipariş listesini kontrol edin.";
      } else if (error.response?.data) {
        errorMessage += `: ${error.response.data}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTechnic = (technic: Technic) => {
    setSelectedTechnics((prev) => {
      const isAlreadySelected = prev.some(
        (t) => t.technicId === technic.technicId
      );

      if (isAlreadySelected) {
        // Zaten seçili ise kaldır
        return prev.filter((t) => t.technicId !== technic.technicId);
      } else {
        // Seçili değilse ekle
        return [...prev, technic];
      }
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages([...selectedImages, ...files]);
      const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
      setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const handleRemoveExistingImage = async (imageId: string) => {
    if (!window.confirm("Bu resmi silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await orderService.deleteImage(imageId);
      setExistingImages(
        existingImages.filter((img) => img.orderImageId !== imageId)
      );
      alert("Resim başarıyla silindi!");
    } catch (error) {
      console.error("❌ Failed to delete image:", error);
      alert("Resim silinirken hata oluştu!");
    }
  };

  if (loading) {
    return (
      <PageLoader
        message={
          isEditMode ? "Sipariş güncelleniyor..." : "Sipariş oluşturuluyor..."
        }
      />
    );
  }

  return (
    <div className="orders-container">
      <div className="order-form-container">
        <div className="form-header">
          <h2>{isEditMode ? "Sipariş Düzenle" : "Yeni Sipariş Oluştur"}</h2>
        </div>

        <form onSubmit={handleSubmitOrder} className="order-form" noValidate>
          <div className="form-section">
            <h3>Temel Bilgiler</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Termin Tarihi</label>
                <input
                  type="date"
                  value={newOrder.deadline}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      deadline: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Firma *</label>
              <div className="select-with-button">
                <input
                  type="text"
                  value={selectedFirm?.firmName || ""}
                  readOnly
                  placeholder="Firma seçmek için tıklayın"
                  onClick={() => setShowFirmModal(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowFirmModal(true)}
                  className="select-button"
                >
                  Seç
                </button>
                {selectedFirm && (
                  <button
                    type="button"
                    onClick={() => setSelectedFirm(null)}
                    className="clear-button"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Model *</label>
              <div className="select-with-button">
                <input
                  type="text"
                  value={selectedModel ? selectedModel.modelName : ""}
                  readOnly
                  placeholder={
                    selectedFirm
                      ? "Model seçmek için tıklayın"
                      : "Önce firma seçiniz"
                  }
                  onClick={() => {
                    if (!selectedFirm) {
                      alert("Lütfen önce bir firma seçiniz!");
                      return;
                    }
                    setShowModelModal(true);
                  }}
                  style={{
                    cursor: selectedFirm ? "pointer" : "not-allowed",
                    opacity: selectedFirm ? 1 : 0.6,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedFirm) {
                      alert("Lütfen önce bir firma seçiniz!");
                      return;
                    }
                    setShowModelModal(true);
                  }}
                  className="select-button"
                  disabled={!selectedFirm}
                  style={{
                    opacity: selectedFirm ? 1 : 0.5,
                    cursor: selectedFirm ? "pointer" : "not-allowed",
                  }}
                >
                  Seç
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Miktar *</label>
                <input
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      quantity: parseInt(e.target.value),
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Birim *</label>
                <select
                  value={newOrder.unit}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      unit: parseInt(e.target.value) as OrderUnit,
                    })
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                    fontSize: "14px",
                  }}
                  required
                >
                  <option value={OrderUnit.Adet}>Adet</option>
                  <option value={OrderUnit.Metre}>Metre</option>
                  <option value={OrderUnit.Takim}>Takım</option>
                </select>
              </div>
              {newOrder.unit === OrderUnit.Takim && (
                <div className="form-group">
                  <label>Takımda Parça Sayısı *</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.pieceCount}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        pieceCount: parseInt(e.target.value),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Bir takımda kaç parça var?"
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Birim Fiyat</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOrder.price}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, price: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Döviz Cinsi</label>
                <select
                  value={newOrder.currency}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, currency: e.target.value })
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                    fontSize: "14px",
                  }}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Teknikler</h3>

            {/* Düzenleme modunda ve modelist atanmışsa bilgi kutusu göster */}
            {isEditMode && editingOrder?.modelistUser && (
              <div
                style={{
                  background: "#e3f2fd",
                  border: "1px solid #2196f3",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2196f3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1976d2",
                      marginBottom: "4px",
                    }}
                  >
                    Desinatör Atanmış
                  </div>
                  <div style={{ fontSize: "13px", color: "#555" }}>
                    {editingOrder.modelistUser.firstName}{" "}
                    {editingOrder.modelistUser.lastName}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Teknikler</label>
              <div className="select-with-button">
                <input
                  type="text"
                  value={
                    selectedTechnics.length > 0
                      ? `${
                          selectedTechnics.length
                        } teknik seçildi: ${selectedTechnics
                          .map((t) => t.name)
                          .join(", ")}`
                      : ""
                  }
                  readOnly
                  placeholder="Teknik seçmek için tıklayın"
                  onClick={() => setShowTechnicModal(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowTechnicModal(true)}
                  className="select-button"
                >
                  Seç
                </button>
                {selectedTechnics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTechnics([])}
                    className="clear-button"
                  >
                    Temizle
                  </button>
                )}
              </div>
              {selectedTechnics.length > 0 && (
                <div className="selected-technics">
                  {selectedTechnics.map((technic) => (
                    <span key={technic.technicId} className="technic-tag">
                      {technic.name}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTechnics(
                            selectedTechnics.filter(
                              (t) => t.technicId !== technic.technicId
                            )
                          )
                        }
                        className="remove-technic"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modelist selection - only show for digital or sticket techniques */}
            {selectedTechnics.some(
              (t) =>
                t.name.toLowerCase().includes("digital") ||
                t.name.toLowerCase().includes("dijital") ||
                t.name.toLowerCase().includes("sticket") ||
                t.name.toLowerCase().includes("sticker") ||
                t.name.toLowerCase().includes("bsn") ||
                t.name.toLowerCase().includes("numune")
            ) && (
              <div className="form-group">
                <label>Modelist</label>
                <select
                  value={selectedModelist?.userId || ""}
                  onChange={(e) => {
                    const modelist = modelists.find(
                      (m) => m.userId === e.target.value
                    );
                    setSelectedModelist(modelist || null);
                  }}
                >
                  <option value="">Modelist seçin</option>
                  {modelists.map((modelist) => (
                    <option key={modelist.userId} value={modelist.userId}>
                      {modelist.firstName} {modelist.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Resimler</h3>

            {isEditMode && existingImages.length > 0 && (
              <div className="form-group">
                <label>Mevcut Resimler</label>
                <div className="image-preview-grid">
                  {existingImages.map((image) => {
                    // API base URL'den image URL'i oluştur
                    const imageUrl = image.imageUrl?.startsWith("http")
                      ? image.imageUrl
                      : `https://api.bulutalbum.com${image.imageUrl}`;

                    return (
                      <div
                        key={image.orderImageId}
                        className="image-preview-item"
                      >
                        <img
                          src={imageUrl}
                          alt={image.description || "Sipariş resmi"}
                          onClick={() =>
                            setImagePreviewModal({ show: true, imageUrl })
                          }
                          style={{ cursor: "pointer" }}
                          onError={(e) => {
                            console.error("Image load error:", imageUrl);
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em">Resim yüklenemedi</text></svg>';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveExistingImage(image.orderImageId)
                          }
                          className="remove-image-btn"
                          title="Resmi sil"
                        >
                          ×
                        </button>
                        {image.description && (
                          <div className="image-description">
                            {image.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>
                {isEditMode ? "Yeni Resim Ekle" : "Sipariş Resimleri"}
              </label>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="image-input"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="image-upload-label">
                  <div className="upload-content">
                    <span className="upload-icon">📷</span>
                    <span>Resim Seç (Çoklu seçim yapabilirsiniz)</span>
                  </div>
                </label>
              </div>

              {imagePreviewUrls.length > 0 && (
                <div className="image-preview-grid">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="image-preview-item">
                      <img
                        src={url}
                        alt={`Önizleme ${index + 1}`}
                        onClick={() =>
                          setImagePreviewModal({ show: true, imageUrl: url })
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="remove-image-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Öncelik ve Notlar</h3>

            <div className="form-group">
              <label>Öncelik</label>
              <select
                value={newOrder.priority}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, priority: e.target.value })
                }
              >
                <option value="">Seçiniz</option>
                <option value="Düşük">Düşük</option>
                <option value="Normal">Normal</option>
                <option value="Orta">Orta</option>
                <option value="Yüksek">Yüksek</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notlar</label>
              <textarea
                value={newOrder.note}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, note: e.target.value })
                }
                rows={3}
                placeholder="Sipariş ile ilgili notlar..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleGoBack}
              className="cancel-button"
            >
              İptal
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading
                ? "Kaydediliyor..."
                : isEditMode
                ? "Sipariş Güncelle"
                : "Sipariş Oluştur"}
            </button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <ModelModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        onSelect={(model) => {
          setSelectedModel(model);
          if (model && !isEditMode) {
            loadModelCostsAndAutoFill(model.modelId);
          }
        }}
        firmId={selectedFirm?.firmId}
        selectedFirm={selectedFirm}
      />
      <WorkshopModal
        isOpen={showWorkshopModal}
        onClose={() => setShowWorkshopModal(false)}
        onSelect={(workshop) => setSelectedWorkshop(workshop)}
      />
      <OperatorModal
        isOpen={showOperatorModal}
        onClose={() => setShowOperatorModal(false)}
        onSelect={(operator) => setSelectedOperator(operator)}
        workshopId={selectedWorkshop?.workshopId}
      />
      <TechnicModal
        isOpen={showTechnicModal}
        onClose={() => setShowTechnicModal(false)}
        onSelectTechnic={handleSelectTechnic}
        selectedTechnics={selectedTechnics}
        onClearAll={() => setSelectedTechnics([])}
      />
      <FirmModal
        isOpen={showFirmModal}
        onClose={() => setShowFirmModal(false)}
        onFirmSelect={(firm) => {
          setSelectedFirm(firm);
          setShowFirmModal(false);
        }}
        selectedFirmId={selectedFirm?.firmId}
      />

      {/* Image Preview Modal */}
      {imagePreviewModal.show && (
        <div
          className="image-preview-modal"
          onClick={() => setImagePreviewModal({ show: false, imageUrl: "" })}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            cursor: "pointer",
          }}
        >
          <button
            onClick={() => setImagePreviewModal({ show: false, imageUrl: "" })}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 10001,
            }}
          >
            ×
          </button>
          <img
            src={imagePreviewModal.imageUrl}
            alt="Büyük önizleme"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}

      {/* QR Print Modal */}
      {qrPrintModal.show && qrPrintModal.order && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "15px",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: "0 0 8px 0", fontSize: "24px" }}>
                ✅ Sipariş Başarıyla Oluşturuldu!
              </h2>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
                Sipariş No: <strong>{qrPrintModal.order.orderId}</strong>
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "16px",
                  color: "#333",
                  marginBottom: "15px",
                  fontWeight: "600",
                }}
              >
                📋 Sipariş Bilgileri
              </p>
              <div
                style={{
                  textAlign: "left",
                  background: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                <p style={{ margin: "6px 0" }}>
                  <strong>Firma:</strong>{" "}
                  {qrPrintModal.order.firm?.firmName ||
                    selectedFirm?.firmName ||
                    "-"}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Model:</strong>{" "}
                  {qrPrintModal.order.model?.modelName ||
                    selectedModel?.modelName ||
                    "-"}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Miktar:</strong> {qrPrintModal.order.quantity}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Atölye:</strong>{" "}
                  {qrPrintModal.order.workshop?.name ||
                    selectedWorkshop?.name ||
                    "-"}
                </p>
              </div>
            </div>

            {qrPrintModal.qrCodeDataUrl ? (
              <>
                <div
                  style={{
                    background: "#f0f4ff",
                    padding: "15px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#667eea",
                      marginBottom: "10px",
                      fontWeight: "600",
                    }}
                  >
                    📱 QR Kod Hazır
                  </p>
                  <div
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}
                  >
                    <img
                      src={qrPrintModal.qrCodeDataUrl}
                      alt="Order QR Code"
                      style={{
                        width: "200px",
                        height: "200px",
                        display: "block",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "11px",
                      color: "#666",
                      wordBreak: "break-all",
                    }}
                  >
                    {qrPrintModal.order.qrCodeUrl}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (
                        printWindow &&
                        qrPrintModal.qrCodeDataUrl &&
                        qrPrintModal.order
                      ) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>QR Kod - ${
                                qrPrintModal.order.orderId
                              }</title>
                              <style>
                                body {
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  justify-content: center;
                                  min-height: 100vh;
                                  margin: 0;
                                  font-family: Arial, sans-serif;
                                }
                                .qr-container {
                                  text-align: center;
                                  padding: 20px;
                                }
                                img {
                                  width: 350px;
                                  height: 350px;
                                  margin: 20px 0;
                                }
                                .info {
                                  margin: 10px 0;
                                  font-size: 14px;
                                }
                                @media print {
                                  body { margin: 0; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="qr-container">
                                <h2>Sipariş QR Kodu</h2>
                                <img src="${
                                  qrPrintModal.qrCodeDataUrl
                                }" alt="QR Code" />
                                <div class="info"><strong>Sipariş No:</strong> ${
                                  qrPrintModal.order.orderId
                                }</div>
                                <div class="info"><strong>Firma:</strong> ${
                                  qrPrintModal.order.firm?.firmName ||
                                  selectedFirm?.firmName ||
                                  "-"
                                }</div>
                                <div class="info"><strong>Model:</strong> ${
                                  qrPrintModal.order.model?.modelName ||
                                  selectedModel?.modelName ||
                                  "-"
                                }</div>
                                <div class="info"><strong>Miktar:</strong> ${
                                  qrPrintModal.order.quantity
                                }</div>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }
                    }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    🖨️ QR Kodu Yazdır
                  </button>

                  <a
                    href={qrPrintModal.qrCodeDataUrl || ""}
                    download={`order-${qrPrintModal.order.orderId}-qr.png`}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      textDecoration: "none",
                      cursor: "pointer",
                      display: "inline-block",
                      transition: "transform 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    📥 QR Kodu İndir
                  </a>
                </div>
              </>
            ) : (
              <div
                style={{
                  background: "#fff3cd",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  color: "#856404",
                  fontSize: "14px",
                }}
              >
                <p>⚠️ QR kod oluşturulamadı.</p>
                {qrPrintModal.order.qrCodeUrl && (
                  <p style={{ fontSize: "11px", marginTop: "8px" }}>
                    URL alındı ama QR kod generate edilemedi:{" "}
                    {qrPrintModal.order.qrCodeUrl}
                  </p>
                )}
                {!qrPrintModal.order.qrCodeUrl && (
                  <p style={{ fontSize: "11px", marginTop: "8px" }}>
                    Backend'den QR URL alınamadı.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setQrPrintModal({
                  show: false,
                  order: null,
                  qrCodeDataUrl: null,
                });
                handleGoBack();
              }}
              style={{
                marginTop: "15px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "500",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Kapat ve Siparişlere Dön
            </button>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {showPriceHistoryModal && priceHistory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={() => setShowPriceHistoryModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "16px", color: "#2c3e50" }}>
              {priceHistory.modelName}
            </h3>
            <p style={{ marginBottom: "20px", color: "#7f8c8d" }}>
              Daha önce verilen fiyatları seçebilirsiniz
            </p>

            {loadingPriceHistory ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                Yükleniyor...
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {priceHistory.priceHistory.map((item) => (
                  <div
                    key={item.orderId}
                    style={{
                      border: "1px solid #dfe6e9",
                      borderRadius: "8px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backgroundColor: "#f8f9fa",
                    }}
                    onClick={() => handlePriceSelect(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.backgroundColor = "#e3f2fd";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dfe6e9";
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ fontWeight: "600", color: "#2980b9" }}>
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: item.priceCurrency,
                        }).format(item.price)}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#7f8c8d",
                        }}
                      >
                        {new Date(item.acceptanceDate).toLocaleDateString(
                          "tr-TR"
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#34495e",
                        display: "flex",
                        gap: "16px",
                      }}
                    >
                      <span>
                        <strong>Firma:</strong> {item.firmName}
                      </span>
                      <span>
                        <strong>Miktar:</strong> {item.quantity}{" "}
                        {item.orderUnitName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPriceHistoryModal(false)}
              style={{
                marginTop: "20px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "500",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;
