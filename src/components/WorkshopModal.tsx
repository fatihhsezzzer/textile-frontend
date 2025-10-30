import React, { useState, useEffect } from "react";
import { Workshop } from "../types";
import { workshopService } from "../services/dataService";
import "./ModelModal.css";

interface WorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (workshop: Workshop) => void;
}

const WorkshopModal: React.FC<WorkshopModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({
    name: "",
    description: "",
    location: "",
    contactPerson: "",
    phone: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadWorkshops();
    }
  }, [isOpen]);

  const loadWorkshops = async () => {
    try {
      const data = await workshopService.getAll();
      setWorkshops(data);
    } catch (error) {
      console.error("Atölyeler yüklenemedi:", error);
    }
  };

  const handleAddWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const workshopData: any = {
        name: newWorkshop.name,
        description: newWorkshop.description || undefined,
        location: newWorkshop.location || undefined,
        contactPerson: newWorkshop.contactPerson || undefined,
        phone: newWorkshop.phone || undefined,
      };

      const created = await workshopService.create(workshopData);
      setWorkshops([...workshops, created]);
      setShowAddForm(false);
      setNewWorkshop({
        name: "",
        description: "",
        location: "",
        contactPerson: "",
        phone: "",
      });
      onSelect(created);
      onClose();
    } catch (error: any) {
      alert("Atölye eklenemedi: " + (error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Atölye Seç</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {!showAddForm ? (
            <>
              <button
                className="add-new-button"
                onClick={() => setShowAddForm(true)}
              >
                + Yeni Atölye Ekle
              </button>

              <div className="items-list">
                {workshops.map((workshop) => (
                  <div
                    key={workshop.workshopId}
                    className="item-card"
                    onClick={() => {
                      onSelect(workshop);
                      onClose();
                    }}
                  >
                    <div className="item-name">{workshop.name}</div>
                    {workshop.location && (
                      <div className="item-detail">📍 {workshop.location}</div>
                    )}
                    {workshop.contactPerson && (
                      <div className="item-detail">
                        👤 {workshop.contactPerson}
                      </div>
                    )}
                    {workshop.phone && (
                      <div className="item-detail">📞 {workshop.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleAddWorkshop} className="add-form">
              <div className="form-group">
                <label>Atölye Adı *</label>
                <input
                  type="text"
                  value={newWorkshop.name}
                  onChange={(e) =>
                    setNewWorkshop({ ...newWorkshop, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={newWorkshop.description}
                  onChange={(e) =>
                    setNewWorkshop({
                      ...newWorkshop,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Konum</label>
                <input
                  type="text"
                  value={newWorkshop.location}
                  onChange={(e) =>
                    setNewWorkshop({ ...newWorkshop, location: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>İletişim Kişisi</label>
                  <input
                    type="text"
                    value={newWorkshop.contactPerson}
                    onChange={(e) =>
                      setNewWorkshop({
                        ...newWorkshop,
                        contactPerson: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    value={newWorkshop.phone}
                    onChange={(e) =>
                      setNewWorkshop({ ...newWorkshop, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="cancel-button"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-button"
                >
                  {loading ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopModal;
