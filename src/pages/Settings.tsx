import React, { useState, useEffect } from "react";
import { settingsService } from "../services/dataService";
import { Settings as SettingsType } from "../types";
import PageLoader from "../components/PageLoader";
import "./Settings.css";

const Settings: React.FC = () => {
  const [currentSettings, setCurrentSettings] = useState<SettingsType | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    settingsName: "Varsayılan Ayarlar",
    profitMargin: 40,
    overheadCostRate: 40,
  });
  const [formErrors, setFormErrors] = useState<{
    profitMargin?: string;
    overheadCostRate?: string;
  }>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Varsayılan ayarı getir (ilk ayar)
      const data = await settingsService.getDefault();
      setCurrentSettings(data);
      setFormData({
        settingsName: data.settingsName,
        profitMargin: data.profitMargin,
        overheadCostRate: data.overheadCostRate,
      });
    } catch (error) {
      console.error("❌ Ayarlar yüklenirken hata:", error);
      // Ayar yoksa varsayılan değerlerle devam et
      setCurrentSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    if (formData.profitMargin < 0 || formData.profitMargin > 100) {
      errors.profitMargin = "Kar marjı 0-100 arasında olmalıdır";
    }

    if (formData.overheadCostRate < 0 || formData.overheadCostRate > 100) {
      errors.overheadCostRate = "Genel gider oranı 0-100 arasında olmalıdır";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      if (currentSettings) {
        // Güncelleme
        await settingsService.update(currentSettings.settingsId, {
          ...currentSettings,
          ...formData,
        });
        console.log("✅ Ayarlar güncellendi");
      } else {
        // Yeni ayar oluşturma
        await settingsService.create(formData as any);
        console.log("✅ Yeni ayar oluşturuldu");
      }
      loadSettings();
    } catch (error: any) {
      console.error("❌ Ayarlar kaydedilirken hata:", error);
      alert(error.response?.data || "Ayarlar kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader message="Ayarlar yükleniyor..." />;
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1>
            <span className="icon">⚙️</span>
            Sistem Ayarları
          </h1>
          <p className="subtitle">
            Kar marjı ve genel gider oranlarını düzenleyin
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="settings-form-container">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-section">
            <h3>Fiyatlandırma Ayarları</h3>
            <p className="section-description">
              Maliyetler üzerine eklenecek kar marjı ve genel gider oranlarını
              belirleyin
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Kar Marjı (%) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.profitMargin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profitMargin: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className={formErrors.profitMargin ? "error" : ""}
                />
                {formErrors.profitMargin && (
                  <span className="error-message">
                    {formErrors.profitMargin}
                  </span>
                )}
                <span className="help-text">
                  Maliyet üzerine eklenecek kar oranı (0-100)
                </span>
              </div>

              <div className="form-group">
                <label>
                  Genel Gider Oranı (%) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.overheadCostRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overheadCostRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className={formErrors.overheadCostRate ? "error" : ""}
                />
                {formErrors.overheadCostRate && (
                  <span className="error-message">
                    {formErrors.overheadCostRate}
                  </span>
                )}
                <span className="help-text">
                  Maliyet üzerine eklenecek genel gider oranı (0-100)
                </span>
              </div>
            </div>
          </div>

          <div className="form-section calculation-preview">
            <h3>Hesaplama Örneği</h3>
            <div className="preview-content">
              <div className="preview-item">
                <span>Maliyet:</span>
                <strong>1.000 TL</strong>
              </div>
              <div className="preview-item">
                <span>Genel Gider ({formData.overheadCostRate}%):</span>
                <strong>
                  +{((1000 * formData.overheadCostRate) / 100).toFixed(2)} TL
                </strong>
              </div>
              <div className="preview-item">
                <span>Ara Toplam:</span>
                <strong>
                  {(1000 + (1000 * formData.overheadCostRate) / 100).toFixed(2)}{" "}
                  TL
                </strong>
              </div>
              <div className="preview-item">
                <span>Kar Marjı ({formData.profitMargin}%):</span>
                <strong>
                  +
                  {(
                    ((1000 + (1000 * formData.overheadCostRate) / 100) *
                      formData.profitMargin) /
                    100
                  ).toFixed(2)}{" "}
                  TL
                </strong>
              </div>
              <div className="preview-item total">
                <span>Toplam Satış Fiyatı:</span>
                <strong className="total-price">
                  {(
                    1000 +
                    (1000 * formData.overheadCostRate) / 100 +
                    ((1000 + (1000 * formData.overheadCostRate) / 100) *
                      formData.profitMargin) /
                      100
                  ).toFixed(2)}{" "}
                  TL
                </strong>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>

          {currentSettings && (
            <div className="settings-info-footer">
              <div className="info-item">
                <span className="info-label">Son Güncelleme:</span>
                <span className="info-value">
                  {currentSettings.updatedAt
                    ? new Date(currentSettings.updatedAt).toLocaleString(
                        "tr-TR"
                      )
                    : new Date(currentSettings.createdAt).toLocaleString(
                        "tr-TR"
                      )}
                </span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Settings;
