import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CostCategory } from "../types";
import { costService } from "../services/dataService";
import "./CategoryForm.css";

interface CategoryFormProps {}

const CategoryForm: React.FC<CategoryFormProps> = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id && id !== "new");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<CostCategory | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
  });

  const loadCategory = React.useCallback(
    async (categoryId: string) => {
      try {
        setLoading(true);
        const data = await costService.getCostCategoryById(categoryId);
        setCategory(data);
        setFormData({
          categoryName: data.categoryName,
          description: data.description || "",
        });
      } catch (error) {
        console.error("❌ Failed to load category:", error);
        alert("Kategori yüklenemedi!");
        navigate("/cost");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (isEditing && id) {
      loadCategory(id);
    }
  }, [id, isEditing, loadCategory]);

  const handleSave = async () => {
    if (!formData.categoryName.trim()) {
      alert("Kategori adı zorunludur!");
      return;
    }

    try {
      setSaving(true);

      if (isEditing && category) {
        // Update existing category
        const updatedCategory = {
          ...category,
          ...formData,
        };
        await costService.updateCostCategory(
          category.costCategoryId,
          updatedCategory
        );
        alert("Kategori başarıyla güncellendi!");
      } else {
        // Create new category
        const newCategory = {
          ...formData,
          category: formData.categoryName, // Backend expects this field
          isActive: true,
        };
        await costService.createCostCategory(newCategory);
        alert("Kategori başarıyla oluşturuldu!");
      }

      navigate("/cost");
    } catch (error) {
      console.error("❌ Failed to save category:", error);
      alert("Kategori kaydedilemedi!");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!isEditing || !category) return;

    if (
      !window.confirm(
        "Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!"
      )
    ) {
      return;
    }

    try {
      await costService.deleteCostCategory(category.costCategoryId);
      alert("Kategori başarıyla silindi!");
      navigate("/cost");
    } catch (error) {
      console.error("❌ Failed to delete category:", error);
      alert(
        "Kategori silinemedi! Bu kategoriye bağlı maliyet kalemleri olabilir."
      );
    }
  };

  if (loading) {
    return (
      <div className="category-form-container">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="category-form-container">
      <div className="category-form-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate("/cost")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z" />
            </svg>
            Geri
          </button>
          <h1>{isEditing ? "Kategoriyi Düzenle" : "Yeni Kategori Oluştur"}</h1>
        </div>
        <div className="header-actions">
          {isEditing && (
            <button className="delete-button" onClick={handleDeleteCategory}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Sil
            </button>
          )}
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="category-form-content">
        <div className="form-section">
          <h2>Kategori Bilgileri</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Kategori Adı *</label>
              <input
                type="text"
                value={formData.categoryName}
                onChange={(e) =>
                  setFormData({ ...formData, categoryName: e.target.value })
                }
                placeholder="Örn: Hammaddeler, İşçilik, Genel Giderler"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Kategori hakkında açıklama (opsiyonel)"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;
