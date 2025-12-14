import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import FirmModal from "../components/FirmModal";
import { Firm } from "../types";
import "./ModelistJobTracker.css";

interface ModelistJob {
  userName: string;
  patternCode: string;
  workDuration: string;
  firmName: string;
  photo?: File | null;
  status?: string; // Durum alanı
}

interface MyJob {
  id: string;
  userFullName: string;
  patternCode: string;
  workDurationHours: number;
  firmName: string;
  photoUrl?: string;
  status?: string;
  createdAt: string;
}

const ModelistJobTracker: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<Omit<ModelistJob, "userName">>({
    patternCode: "",
    workDuration: "",
    firmName: "",
    photo: null,
    status: "Beklemede", // Varsayılan durum
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Kendi işleri için state'ler
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  // Düzenleme için state'ler
  const [editingJob, setEditingJob] = useState<MyJob | null>(null);
  const [editForm, setEditForm] = useState({
    patternCode: "",
    workDuration: "",
    firmName: "",
    status: "Beklemede",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Kullanıcının kendi işlerini yükle
  const loadMyJobs = useCallback(async () => {
    if (!user) return;

    setJobsLoading(true);
    try {
      const response = await api.get("/PatternWorkLog");
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      // Sadece kendi işlerini filtrele
      const myJobsData = response.data.filter(
        (job: MyJob) => job.userFullName === fullName
      );
      setMyJobs(myJobsData);
    } catch (err) {
      console.error("İşler yüklenemedi:", err);
    } finally {
      setJobsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyJobs();
  }, [loadMyJobs]);

  // Status güncelleme
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    setUpdatingJobId(jobId);
    try {
      // Mevcut job'u bul ve status'unu güncelle
      const currentJob = myJobs.find((j) => j.id === jobId);
      if (!currentJob) {
        alert("İş bulunamadı!");
        return;
      }

      // Eğer Tamamlandı'ya geçiyorsa ve çalışma süresi yoksa sor
      if (
        newStatus === "Tamamlandı" &&
        (!currentJob.workDurationHours || currentJob.workDurationHours === 0)
      ) {
        const duration = prompt(
          "Lütfen çalışma süresini saat cinsinden girin:"
        );
        if (!duration || isNaN(parseFloat(duration))) {
          alert("Geçerli bir süre girilmedi. İşlem iptal edildi.");
          setUpdatingJobId(null);
          return;
        }

        // Süre ile birlikte güncelle
        await api.put(`/PatternWorkLog/${jobId}`, {
          status: newStatus,
          workDurationHours: parseFloat(duration),
        });

        setMyJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: newStatus,
                  workDurationHours: parseFloat(duration),
                }
              : job
          )
        );
      } else {
        // Normal status güncellemesi
        await api.put(`/PatternWorkLog/${jobId}`, {
          status: newStatus,
        });

        setMyJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        );
      }
    } catch (err: any) {
      console.error("Status güncellenemedi:", err);
      // Eğer hata olursa, backend'de status endpoint yoktur
      // Manuel olarak güncellemeyi deneyelim
      try {
        await api.patch(`/PatternWorkLog/${jobId}`, { status: newStatus });
        setMyJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        );
      } catch (patchErr) {
        console.error("PATCH de başarısız:", patchErr);
        alert(
          "Durum güncellenirken bir hata oluştu! Backend endpoint'i kontrol edin."
        );
      }
    } finally {
      setUpdatingJobId(null);
    }
  };

  // Düzenleme modalını aç
  const handleEditClick = (job: MyJob) => {
    setEditingJob(job);
    setEditForm({
      patternCode: job.patternCode,
      workDuration: job.workDurationHours.toString(),
      firmName: job.firmName,
      status: job.status || "Beklemede",
    });
  };

  // Düzenleme formundaki değişiklikler
  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Düzenlemeyi kaydet
  const handleEditSubmit = async () => {
    if (!editingJob) return;

    setEditLoading(true);
    try {
      await api.put(`/PatternWorkLog/${editingJob.id}/edit`, {
        patternCode: editForm.patternCode,
        workDurationHours: parseFloat(editForm.workDuration),
        firmName: editForm.firmName,
        status: editForm.status,
      });

      // Listeyi güncelle
      setMyJobs((prev) =>
        prev.map((job) =>
          job.id === editingJob.id
            ? {
                ...job,
                patternCode: editForm.patternCode,
                workDurationHours: parseFloat(editForm.workDuration),
                firmName: editForm.firmName,
                status: editForm.status,
              }
            : job
        )
      );

      setEditingJob(null);
      alert("İş başarıyla güncellendi!");
    } catch (err: any) {
      console.error("Güncelleme hatası:", err);
      alert("Güncelleme sırasında bir hata oluştu!");
    } finally {
      setEditLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, photo: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleFirmSelect = (firm: Firm) => {
    setSelectedFirm(firm);
    setForm((prev) => ({ ...prev, firmName: firm.firmName }));
    setIsFirmModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Firma seçimi kontrolü
    if (!selectedFirm || !form.firmName) {
      setError("Lütfen bir firma seçiniz");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const fullName = `${user?.firstName || ""} ${
        user?.lastName || ""
      }`.trim();
      console.log("FullName:", fullName);
      console.log("WorkDuration:", form.workDuration);

      const formData = new FormData();
      formData.append("UserName", fullName);
      formData.append("PatternCode", form.patternCode);
      formData.append("WorkDuration", form.workDuration);
      formData.append("FirmName", form.firmName);
      if (form.status) {
        formData.append("Status", form.status);
      }
      if (form.photo) {
        formData.append("photo", form.photo);
      }

      await api.post("/PatternWorkLog", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(true);
      setForm({
        patternCode: "",
        workDuration: "",
        firmName: "",
        photo: null,
        status: "Beklemede",
      });
      setSelectedFirm(null);
      setPreview(null);

      // Listeyi yenile
      await loadMyJobs();

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data || err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modelist-job-tracker-container">
      <h2>Desinatör İş Takip</h2>

      {/* Tab Navigation */}
      <div className="tracker-tabs">
        <button
          className={`tracker-tab ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          ➕ Yeni İş Ekle
        </button>
        <button
          className={`tracker-tab ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          📋 İşlerim ({myJobs.length})
        </button>
      </div>

      {activeTab === "form" ? (
        <>
          {success && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#d4edda",
                color: "#155724",
                border: "1px solid #c3e6cb",
                borderRadius: "4px",
              }}
            >
              ✓ Kayıt başarıyla eklendi!
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#f8d7da",
                color: "#721c24",
                border: "1px solid #f5c6cb",
                borderRadius: "4px",
              }}
            >
              ✗ Hata: {error}
            </div>
          )}
          <form className="modelist-job-form" onSubmit={handleSubmit}>
            <div className="user-info-display">
              <span className="user-info-label">Kullanıcı:</span>
              <span className="user-info-value">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <label>
              Desen Kodu:
              <input
                type="text"
                name="patternCode"
                value={form.patternCode}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Çalışma Süresi (dk):
              <input
                type="number"
                name="workDuration"
                value={form.workDuration}
                onChange={handleChange}
                min="1"
              />
            </label>
            <label>
              Firma:
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="text"
                  name="firmName"
                  value={form.firmName}
                  onChange={handleChange}
                  required
                  readOnly
                  placeholder="Firma seçin"
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    backgroundColor: selectedFirm ? "#e8f5e9" : "white",
                    borderColor: selectedFirm ? "#4caf50" : "#ddd",
                    fontWeight: selectedFirm ? "500" : "normal",
                  }}
                  onClick={() => setIsFirmModalOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsFirmModalOpen(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: selectedFirm ? "#4caf50" : "#2980b9",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  {selectedFirm ? "✓ Seçildi" : "Firma Seç"}
                </button>
              </div>
            </label>
            <label>
              Durum:
              <select
                name="status"
                value={form.status || "Beklemede"}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #dfe6e9",
                  borderRadius: "8px",
                  fontSize: "15px",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                <option value="Beklemede">Beklemede</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal">İptal</option>
                <option value="Onay Bekliyor">Onay Bekliyor</option>
              </select>
            </label>
            <div className="photo-upload-wrapper">
              <span className="photo-upload-label">Fotoğraf Ekle:</span>
              <label className="photo-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <div className="photo-upload-content">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Fotoğraf Önizleme"
                      className="photo-upload-preview"
                    />
                  ) : (
                    <>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2980b9"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        ></rect>
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 15v2"></path>
                        <path d="M12 7v2"></path>
                      </svg>
                      <span className="photo-upload-text">
                        Fotoğraf seçin veya sürükleyin
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </>
      ) : (
        /* İşlerim Listesi */
        <div className="my-jobs-section">
          {jobsLoading ? (
            <div className="jobs-loading">Yükleniyor...</div>
          ) : myJobs.length === 0 ? (
            <div className="no-jobs">
              <p>Henüz kayıtlı işiniz bulunmuyor.</p>
              <button
                className="add-first-job-btn"
                onClick={() => setActiveTab("form")}
              >
                ➕ İlk İşinizi Ekleyin
              </button>
            </div>
          ) : (
            <div className="my-jobs-table-container">
              <table className="my-jobs-table">
                <thead>
                  <tr>
                    <th>Desen Kodu</th>
                    <th>Firma</th>
                    <th>Süre</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                    <th>Fotoğraf</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {myJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="pattern-code">{job.patternCode}</td>
                      <td>{job.firmName}</td>
                      <td>{job.workDurationHours.toFixed(2)} saat</td>
                      <td>
                        <select
                          className={`status-select status-${(
                            job.status || "Beklemede"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                          value={job.status || "Beklemede"}
                          onChange={(e) =>
                            handleStatusChange(job.id, e.target.value)
                          }
                          disabled={updatingJobId === job.id}
                        >
                          <option value="Beklemede">Beklemede</option>
                          <option value="Devam Ediyor">Devam Ediyor</option>
                          <option value="Tamamlandı">Tamamlandı</option>
                          <option value="İptal">İptal</option>
                          <option value="Onay Bekliyor">Onay Bekliyor</option>
                        </select>
                        {updatingJobId === job.id && (
                          <span className="updating-indicator">...</span>
                        )}
                      </td>
                      <td className="date-cell">
                        {new Date(job.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td>
                        {job.photoUrl ? (
                          <button
                            className="photo-view-btn"
                            onClick={() =>
                              setImagePreviewModal({
                                show: true,
                                imageUrl: job.photoUrl || "",
                              })
                            }
                          >
                            📷
                          </button>
                        ) : (
                          <span className="no-photo">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="edit-job-btn"
                          onClick={() => handleEditClick(job)}
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewModal.show && (
        <div
          className="image-preview-modal-overlay"
          onClick={() => setImagePreviewModal({ show: false, imageUrl: "" })}
        >
          <div className="image-preview-modal-content">
            <button
              className="image-preview-close"
              onClick={() =>
                setImagePreviewModal({ show: false, imageUrl: "" })
              }
            >
              ✕
            </button>
            <img src={imagePreviewModal.imageUrl} alt="Fotoğraf" />
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="edit-modal-overlay" onClick={() => setEditingJob(null)}>
          <div
            className="edit-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="edit-modal-header">
              <h3>İş Düzenle</h3>
              <button
                className="edit-modal-close"
                onClick={() => setEditingJob(null)}
              >
                ✕
              </button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-form-group">
                <label>Desen Kodu</label>
                <input
                  type="text"
                  name="patternCode"
                  value={editForm.patternCode}
                  onChange={handleEditFormChange}
                  placeholder="Desen kodu"
                />
              </div>
              <div className="edit-form-group">
                <label>Çalışma Süresi (Saat)</label>
                <input
                  type="number"
                  name="workDuration"
                  value={editForm.workDuration}
                  onChange={handleEditFormChange}
                  placeholder="Süre (saat)"
                  step="0.5"
                  min="0"
                />
              </div>
              <div className="edit-form-group">
                <label>Firma</label>
                <input
                  type="text"
                  name="firmName"
                  value={editForm.firmName}
                  onChange={handleEditFormChange}
                  placeholder="Firma adı"
                />
              </div>
              <div className="edit-form-group">
                <label>Durum</label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditFormChange}
                >
                  <option value="Beklemede">Beklemede</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal">İptal</option>
                  <option value="Onay Bekliyor">Onay Bekliyor</option>
                </select>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button
                className="edit-cancel-btn"
                onClick={() => setEditingJob(null)}
                disabled={editLoading}
              >
                İptal
              </button>
              <button
                className="edit-save-btn"
                onClick={handleEditSubmit}
                disabled={editLoading}
              >
                {editLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FirmModal
        isOpen={isFirmModalOpen}
        onClose={() => setIsFirmModalOpen(false)}
        onFirmSelect={handleFirmSelect}
        selectedFirmId={selectedFirm?.firmId}
      />
    </div>
  );
};

export default ModelistJobTracker;
