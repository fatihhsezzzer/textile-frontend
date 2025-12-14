import React, { useState } from "react";
import { useEffect, useMemo } from "react";
import api from "../services/api";
import "./ModelistJobList.css";

interface ModelistJob {
  id: string;
  userFullName: string;
  patternCode: string;
  workDurationHours: number;
  firmName: string;
  photoUrl?: string;
  createdBy?: string;
  createdAt: string;
  status?: string; // Durum alanı
}

const ModelistJobList: React.FC = () => {
  const [jobs, setJobs] = useState<ModelistJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    show: boolean;
    imageUrl: string;
  }>({ show: false, imageUrl: "" });

  // Benzersiz kullanıcıları çıkar
  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(jobs.map((job) => job.userFullName)));
    return users.sort();
  }, [jobs]);

  // Filtrelenmiş işler
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesUser =
        selectedUser === "all" || job.userFullName === selectedUser;
      const matchesSearch =
        searchTerm === "" ||
        job.patternCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.userFullName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesUser && matchesSearch;
    });
  }, [jobs, selectedUser, searchTerm]);

  // İstatistikler
  const statistics = useMemo(() => {
    const filtered = filteredJobs;
    const totalHours = filtered.reduce(
      (sum, job) => sum + (job.workDurationHours || 0),
      0
    );
    return {
      totalJobs: filtered.length,
      totalHours: Math.floor(totalHours),
      totalMinutes: Math.round((totalHours % 1) * 60),
    };
  }, [filteredJobs]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await api.get("/PatternWorkLog");
        setJobs(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data || err.message || "Veri yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <div className="modelist-job-list-container">
      <h2>Desinatör İşleri Listesi</h2>

      {/* Filtreler ve Arama */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Kullanıcı:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tüm Kullanıcılar ({jobs.length})</option>
            {uniqueUsers.map((user) => (
              <option key={user} value={user}>
                {user} ({jobs.filter((j) => j.userFullName === user).length})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Ara:</label>
          <input
            type="text"
            placeholder="Desen kodu, firma veya kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* İstatistikler */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div className="statistics-section">
          <div className="stat-card">
            <div className="stat-value">{statistics.totalJobs}</div>
            <div className="stat-label">Toplam İş</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {statistics.totalHours}s {statistics.totalMinutes}dk
            </div>
            <div className="stat-label">Toplam Süre</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{uniqueUsers.length}</div>
            <div className="stat-label">Aktif Desinatör</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-list">Yükleniyor...</div>
      ) : error ? (
        <div className="empty-list">Hata: {error}</div>
      ) : (
        <div className="job-table-container">
          {filteredJobs.length === 0 ? (
            <div className="empty-list">
              {searchTerm || selectedUser !== "all"
                ? "Filtreye uygun kayıt bulunamadı."
                : "Kayıtlı iş bulunamadı."}
            </div>
          ) : (
            <table className="job-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Desen Kodu</th>
                  <th>Süre</th>
                  <th>Firma</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>Fotoğraf</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="user-cell">{job.userFullName}</td>
                    <td>{job.patternCode}</td>
                    <td className="duration-cell">
                      {job.workDurationHours.toFixed(2)} saat
                    </td>
                    <td>{job.firmName}</td>
                    <td>
                      <span
                        className={`status-badge status-${(
                          job.status || "Beklemede"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {job.status || "Beklemede"}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(job.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="photo-cell">
                      {job.photoUrl ? (
                        <button
                          onClick={() =>
                            setImagePreviewModal({
                              show: true,
                              imageUrl: job.photoUrl || "",
                            })
                          }
                          className="photo-link"
                        >
                          📷 Görüntüle
                        </button>
                      ) : (
                        <span className="no-photo">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            alt="Fotoğraf önizleme"
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

export default ModelistJobList;
