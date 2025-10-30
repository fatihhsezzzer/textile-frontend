import React, { useState, useEffect } from "react";
import { orderService } from "../services/dataService";
import { OrderImage } from "../types";
import "./ImageManager.css";

interface ImageManagerProps {
  orderId: string;
  onClose: () => void;
}

const ImageManager: React.FC<ImageManagerProps> = ({ orderId, onClose }) => {
  const [images, setImages] = useState<OrderImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  useEffect(() => {
    loadImages();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadImages = async () => {
    try {
      setLoading(true);
      const orderImages = await orderService.getImages(orderId);
      setImages(orderImages);
    } catch (error) {
      console.error("Images could not be loaded:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const result = await orderService.uploadImages(orderId, files);
      console.log("Upload result:", result);
      await loadImages(); // Refresh the image list
      alert(`${result.images.length} resim başarıyla yüklendi!`);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Resim yükleme sırasında hata oluştu!");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Bu resmi silmek istediğinizden emin misiniz?")) return;

    try {
      await orderService.deleteImage(imageId);
      await loadImages(); // Refresh the image list
      alert("Resim başarıyla silindi!");
    } catch (error) {
      console.error("Image deletion failed:", error);
      alert("Resim silme sırasında hata oluştu!");
    }
  };

  return (
    <div className="image-manager-overlay" onClick={onClose}>
      <div className="image-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-manager-header">
          <h3>Sipariş Resimleri</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="image-manager-content">
          {/* Upload Section */}
          <div className="upload-section">
            <label htmlFor="image-upload" className="upload-button">
              {uploading ? "Yükleniyor..." : "Resim Ekle"}
            </label>
            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </div>

          {/* Images Grid */}
          {loading ? (
            <div className="loading">Resimler yükleniyor...</div>
          ) : (
            <div className="images-grid">
              {images.length === 0 ? (
                <div className="no-images">
                  Bu sipariş için henüz resim yüklenmemiş.
                </div>
              ) : (
                images.map((image) => {
                  const imageUrl = `${
                    process.env.REACT_APP_API_URL ||
                    "https://api.bulutalbum.com"
                  }${image.imageUrl}`;

                  return (
                    <div key={image.orderImageId} className="image-item">
                      <img
                        src={imageUrl}
                        alt={image.description || "Sipariş resmi"}
                        className="order-image"
                        onClick={() =>
                          setImagePreviewModal({ show: true, imageUrl })
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <div className="image-actions">
                        <p className="image-description">{image.description}</p>
                        <button
                          className="delete-image-button"
                          onClick={() => handleDeleteImage(image.orderImageId)}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

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
            zIndex: 10001,
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
              zIndex: 10002,
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

export default ImageManager;
