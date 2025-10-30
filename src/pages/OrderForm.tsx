import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
} from "../types";
import {
  orderService,
  firmService,
  workshopService,
  exchangeRateService,
} from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import ModelModal from "../components/ModelModal";
import WorkshopModal from "../components/WorkshopModal";
import OperatorModal from "../components/OperatorModal";
import TechnicModal from "../components/TechnicModal";
import FirmModal from "../components/FirmModal";
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<OrderImage[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [showModelModal, setShowModelModal] = useState(false);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showTechnicModal, setShowTechnicModal] = useState(false);
  const [showFirmModal, setShowFirmModal] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  // Türkiye saati ile tarih string'i oluştur
  const getTurkeyDateString = (): string => {
    const now = new Date();
    const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    return turkeyTime.toISOString().split("T")[0];
  };

  const [newOrder, setNewOrder] = useState({
    acceptanceDate: getTurkeyDateString(),
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
    if (isEditMode && orderId) {
      loadOrderForEdit(orderId);
    }
  }, [isEditMode, orderId]);

  const loadCurrencies = async () => {
    try {
      const currenciesData = await exchangeRateService.getCurrencies();
      setCurrencies(currenciesData);
    } catch (error) {
      console.error("❌ Failed to load currencies:", error);
    }
  };

  const loadOrderForEdit = async (id: string) => {
    try {
      setLoading(true);
      const orders = await orderService.getAll();
      const order = orders.find((o) => o.orderId === id);

      if (!order) {
        alert("Sipariş bulunamadı!");
        handleGoBack();
        return;
      }

      setEditingOrder(order);
      setNewOrder({
        acceptanceDate: order.acceptanceDate
          ? order.acceptanceDate.split("T")[0]
          : "",
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

      if (order.orderTechnics && order.orderTechnics.length > 0) {
        const technics = order.orderTechnics
          .map((ot) => ot.technic)
          .filter((t): t is Technic => t !== undefined);
        setSelectedTechnics(technics);
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

    if (!selectedWorkshop) {
      alert("Lütfen bir atölye seçin!");
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
      if (!selectedWorkshop || !selectedWorkshop.workshopId) {
        throw new Error("Seçili atölye bulunamadı");
      }

      const orderTechnics = selectedTechnics.map((technic) => ({
        orderTechnicId: undefined,
        orderId: undefined,
        technicId: technic.technicId,
        technic: undefined,
      }));

      const orderData = {
        acceptanceDate: new Date(newOrder.acceptanceDate).toISOString(),
        firmId: selectedFirm.firmId,
        modelId: selectedModel.modelId,
        quantity: newOrder.quantity,
        unit: newOrder.unit,
        pieceCount:
          newOrder.unit === OrderUnit.Takim ? newOrder.pieceCount : undefined,
        price: newOrder.price ? parseFloat(newOrder.price) : undefined,
        priceCurrency: newOrder.currency,
        workshopId: selectedWorkshop.workshopId, // Artık zorunlu
        operatorId: selectedOperator?.operatorId || undefined,
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

      console.log("🚀 Submitting order with data:", orderData);
      console.log("👤 Selected operator:", selectedOperator);
      console.log("🏭 Selected workshop:", selectedWorkshop);

      let resultOrder: Order;

      if (isEditMode && editingOrder) {
        const orderTechnicsForUpdate = selectedTechnics.map((technic) => ({
          orderTechnicId: undefined,
          orderId: editingOrder.orderId,
          technicId: technic.technicId,
          technic: undefined,
        }));

        const updateData = {
          ...editingOrder,
          ...orderData,
          orderId: editingOrder.orderId,
          orderTechnics: orderTechnicsForUpdate,
          images: selectedImages.length > 0 ? [] : editingOrder.images,
        };

        await orderService.update(editingOrder.orderId, updateData as Order);
        resultOrder = updateData as Order;
      } else {
        resultOrder = await orderService.create(orderData as any);
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

      alert(`Sipariş başarıyla ${isEditMode ? "güncellendi" : "oluşturuldu"}!`);
      handleGoBack(); // Önceki sayfaya dön
    } catch (error: any) {
      alert(
        `Sipariş ${isEditMode ? "güncellenemedi" : "oluşturulamadı"}: ` +
          (error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTechnic = (technic: Technic) => {
    const isAlreadySelected = selectedTechnics.some(
      (t) => t.technicId === technic.technicId
    );
    if (isAlreadySelected) {
      setSelectedTechnics(
        selectedTechnics.filter((t) => t.technicId !== technic.technicId)
      );
    } else {
      setSelectedTechnics([...selectedTechnics, technic]);
    }
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
      <div className="orders-container">
        <div className="loading">Yükleniyor...</div>
      </div>
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
                <label>Kabul Tarihi *</label>
                <input
                  type="date"
                  value={newOrder.acceptanceDate}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      acceptanceDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Teslim Tarihi (Termin)</label>
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
                  value={
                    selectedModel
                      ? `${selectedModel.modelCode} - ${selectedModel.modelName}`
                      : ""
                  }
                  readOnly
                  placeholder="Model seçmek için tıklayın"
                  onClick={() => setShowModelModal(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowModelModal(true)}
                  className="select-button"
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
            <h3>Atölye ve Operatör</h3>

            <div className="form-group">
              <label>Atölye *</label>
              <div className="select-with-button">
                <input
                  type="text"
                  value={selectedWorkshop?.name || ""}
                  readOnly
                  placeholder="Atölye seçmek için tıklayın"
                  onClick={() => setShowWorkshopModal(true)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowWorkshopModal(true)}
                  className="select-button"
                >
                  Seç
                </button>
                {selectedWorkshop && (
                  <button
                    type="button"
                    onClick={() => setSelectedWorkshop(null)}
                    className="clear-button"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Operatör</label>
              <div className="select-with-button">
                <input
                  type="text"
                  value={
                    selectedOperator
                      ? `${selectedOperator.firstName} ${selectedOperator.lastName}`
                      : ""
                  }
                  readOnly
                  placeholder={
                    !selectedWorkshop
                      ? "Önce atölye seçiniz"
                      : "Operatör seçmek için tıklayın"
                  }
                  onClick={() => {
                    if (selectedWorkshop) {
                      setShowOperatorModal(true);
                    }
                  }}
                  disabled={!selectedWorkshop}
                  style={{
                    cursor: !selectedWorkshop ? "not-allowed" : "pointer",
                    opacity: !selectedWorkshop ? 0.6 : 1,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedWorkshop) {
                      setShowOperatorModal(true);
                    }
                  }}
                  className="select-button"
                  disabled={!selectedWorkshop}
                  style={{
                    cursor: !selectedWorkshop ? "not-allowed" : "pointer",
                    opacity: !selectedWorkshop ? 0.6 : 1,
                  }}
                >
                  Seç
                </button>
                {selectedOperator && (
                  <button
                    type="button"
                    onClick={() => setSelectedOperator(null)}
                    className="clear-button"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

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
        onSelect={(model) => setSelectedModel(model)}
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
    </div>
  );
};

export default OrderForm;
