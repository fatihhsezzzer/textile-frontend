import React, { useState, useEffect } from "react";
import { Operator, Workshop } from "../types";
import { operatorService, workshopService } from "../services/dataService";
import "./ModelModal.css";

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (operator: Operator) => void;
  workshopId?: string; // Seçili atölye ID'si - opsiyonel
}

const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  workshopId,
}) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newOperator, setNewOperator] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    specialization: "",
    workshopId: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadOperators();
      loadWorkshops();
    }
  }, [isOpen, workshopId]);

  // workshopId prop'u geldiğinde newOperator'da da set et
  useEffect(() => {
    if (workshopId) {
      setNewOperator((prev) => ({
        ...prev,
        workshopId: workshopId,
      }));
    }
  }, [workshopId]);

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll();
      setOperators(data);
    } catch (error) {
      console.error("Operatörler yüklenemedi:", error);
    }
  };

  const loadWorkshops = async () => {
    try {
      const data = await workshopService.getAll();
      setWorkshops(data);
    } catch (error) {
      console.error("Atölyeler yüklenemedi:", error);
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const operatorData: any = {
        firstName: newOperator.firstName,
        lastName: newOperator.lastName,
        phone: newOperator.phone || undefined,
        email: newOperator.email || undefined,
        specialization: newOperator.specialization || undefined,
        workshopId: newOperator.workshopId || undefined,
      };
      const created = await operatorService.create(operatorData);
      setOperators([...operators, created]);
      setShowAddForm(false);
      setNewOperator({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        specialization: "",
        workshopId: "",
      });
      onSelect(created);
      onClose();
    } catch (error: any) {
      alert("Operatör eklenemedi: " + (error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Atölye seçiliyse sadece o atölyedeki operatörleri göster
  const filteredOperators = workshopId
    ? operators.filter((op) => op.workshopId === workshopId)
    : operators;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Operatör Seç</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {workshopId && filteredOperators.length === 0 && !showAddForm && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#dc3545",
                background: "#fff3cd",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            >
              ⚠️ Seçili atölyede kayıtlı operatör bulunmuyor. Lütfen önce
              operatör ekleyin.
            </div>
          )}

          {!showAddForm ? (
            <>
              <button
                className="add-new-button"
                onClick={() => setShowAddForm(true)}
              >
                + Yeni Operatör Ekle
              </button>

              <div className="items-list">
                {filteredOperators.map((operator) => (
                  <div
                    key={operator.operatorId}
                    className="item-card"
                    onClick={() => {
                      onSelect(operator);
                      onClose();
                    }}
                  >
                    <div className="item-name">
                      {operator.firstName} {operator.lastName}
                    </div>
                    {operator.specialization && (
                      <div className="item-detail">
                        🔧 {operator.specialization}
                      </div>
                    )}
                    {operator.workshop && (
                      <div className="item-detail">
                        🏭 {operator.workshop.name}
                      </div>
                    )}
                    {operator.phone && (
                      <div className="item-detail">📞 {operator.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleAddOperator} className="add-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Ad *</label>
                  <input
                    type="text"
                    value={newOperator.firstName}
                    onChange={(e) =>
                      setNewOperator({
                        ...newOperator,
                        firstName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Soyad *</label>
                  <input
                    type="text"
                    value={newOperator.lastName}
                    onChange={(e) =>
                      setNewOperator({
                        ...newOperator,
                        lastName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    value={newOperator.phone}
                    onChange={(e) =>
                      setNewOperator({ ...newOperator, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={newOperator.email}
                    onChange={(e) =>
                      setNewOperator({ ...newOperator, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Uzmanlık</label>
                <input
                  type="text"
                  value={newOperator.specialization}
                  onChange={(e) =>
                    setNewOperator({
                      ...newOperator,
                      specialization: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Atölye</label>
                <select
                  value={newOperator.workshopId}
                  onChange={(e) =>
                    setNewOperator({
                      ...newOperator,
                      workshopId: e.target.value,
                    })
                  }
                >
                  <option value="">Seçiniz</option>
                  {workshops.map((workshop) => (
                    <option
                      key={workshop.workshopId}
                      value={workshop.workshopId}
                    >
                      {workshop.name}
                    </option>
                  ))}
                </select>
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

export default OperatorModal;
