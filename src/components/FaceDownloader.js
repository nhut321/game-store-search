import React, { useState, useEffect } from "react";
import "./FaceDownloader.css";
import {
  checkFacesInR2,
  syncFacesFromCdnToR2,
  searchFacesByApi,
  BUCKET_NAME,
} from "../services/r2FaceService";

export default function FaceDownloader() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all"); // "all" | "f" | "m"
  const [searchResultsList, setSearchResultsList] = useState([]); // Danh sách kết quả khi tìm kiếm theo tên

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: "" });
  const [statusSource, setStatusSource] = useState(""); // "r2_existing" | "r2_synced"
  const [currentCode, setCurrentCode] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [faceImages, setFaceImages] = useState([]);
  const [isSingleFace, setIsSingleFace] = useState(false); // "Nó chỉ có 1 mặt"
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImg, setLightboxImg] = useState(null);

  // Animation preview
  const [animating, setAnimating] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(400); // Tốc độ hiển thị mỗi frame (ms) - mặc định 400ms cho mượt mà, chậm rãi

  // Animation player cycle qua các frame
  useEffect(() => {
    if (!animating || faceImages.length <= 1) return;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % faceImages.length);
    }, animSpeed);
    return () => clearInterval(interval);
  }, [animating, faceImages, animSpeed]);

  // Nhập text thuần túy — KHÔNG gọi API khi gõ phím để tối ưu hiệu năng
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setErrorMessage("");
    setSearchResultsList([]);
  };

  // Chỉ kích hoạt tìm kiếm khi bấm Enter hoặc click nút Tìm
  const handleSearchClick = async () => {
    const raw = searchTerm.trim();
    if (!raw) {
      setErrorMessage("Vui lòng nhập mã mặt (ví dụ: mf_v0411) hoặc tên mặt (ví dụ: Moon Cherub).");
      return;
    }

    setSearchResultsList([]);
    setErrorMessage("");

    // 1. Nếu người dùng nhập trực tiếp mã code (ví dụ: mf_v0411, ff_v0360, mf_m0010)
    const codeMatch = raw.match(/([a-zA-Z]{1,3}_[a-zA-Z0-9]+)/);
    if (codeMatch) {
      const code = codeMatch[1].toLowerCase();
      triggerSearch(code);
      return;
    }

    // 2. Nếu người dùng nhập tên mặt: Gọi server đúng 1 lần duy nhất
    setLoading(true);
    setProgress({ percent: 10, message: `Đang tra cứu tên "${raw}" từ server...` });

    try {
      const results = await searchFacesByApi(raw, genderFilter);
      setLoading(false);

      if (results.length === 0) {
        setErrorMessage(`Không tìm thấy mặt nào có tên chứa "${raw}". Bạn hãy thử nhập trực tiếp mã code (ví dụ: mf_v0411).`);
      } else if (results.length === 1) {
        // Chỉ có 1 kết quả -> tự động sync luôn
        const matched = results[0];
        triggerSearch(matched.fileName, matched.name);
      } else {
        // Có nhiều kết quả -> hiển thị danh sách cho người dùng click chọn
        setSearchResultsList(results);
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage("Không thể kết nối đến server để tra cứu tên mặt.");
    }
  };

  // Chọn 1 item từ danh sách kết quả tìm theo tên
  const handleSelectFromList = (item) => {
    setSearchResultsList([]);
    setSearchTerm(`${item.fileName} (${item.name})`);
    triggerSearch(item.fileName, item.name);
  };

  // Luồng kiểm tra R2 -> CDN Sync
  const triggerSearch = async (code, name = "") => {
    if (!code) return;
    setLoading(true);
    setErrorMessage("");
    setCurrentCode(code);
    setCurrentName(name);
    setFaceImages([]);
    setIsSingleFace(false);
    setStatusSource("");
    setProgress({ percent: 15, message: "Đang kiểm tra trên Cloudflare R2..." });

    try {
      // BƯỚC 1: Kiểm tra trên Cloudflare R2
      const r2Result = await checkFacesInR2(code);

      if (r2Result.found && r2Result.items.length > 0) {
        // Đã có trên R2 -> Load ra luôn
        setStatusSource("r2_existing");
        setFaceImages(r2Result.items);
        setIsSingleFace(r2Result.isSingle);
        setProgress({
          percent: 100,
          message: r2Result.isSingle
            ? "Mặt này đã có trên Cloudflare R2 (Nó chỉ có 1 mặt)!"
            : `Đã tìm thấy ${r2Result.items.length} mặt có sẵn trên Cloudflare R2!`,
        });
      } else {
        // BƯỚC 2: Chưa có trên R2 -> Tải từ cdn.aumix3d.com và upload tự động lên R2
        setStatusSource("r2_synced");
        setProgress({ percent: 25, message: "Chưa có trên R2. Đang đọc metadata từ aumix3d CDN..." });

        const syncResult = await syncFacesFromCdnToR2(code, (p) => {
          if (p.status === "downloading") {
            setProgress({ percent: 35, message: p.message });
          } else if (p.status === "uploading") {
            const pct = Math.round(35 + ((p.current / p.total) * 65));
            setProgress({
              percent: pct,
              message: p.message,
            });
          }
        });

        setFaceImages(syncResult.items);
        setIsSingleFace(syncResult.isSingle);
        setProgress({
          percent: 100,
          message: syncResult.isSingle
            ? "Đã đồng bộ 1 mặt lên Cloudflare R2 (Nó chỉ có 1 mặt)!"
            : `Đã tự động cào và upload ${syncResult.items.length} mặt lên Cloudflare R2 thành công!`,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Đã xảy ra lỗi trong quá trình tìm kiếm hoặc upload lên R2.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < faceImages.length; i++) {
      const item = faceImages[i];
      const filename = `${currentCode}_${item.num}.png`;
      await handleDownloadSingle(item.url, filename);
      await new Promise((r) => setTimeout(r, 150));
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert("Đã copy link Cloudflare R2:\n" + url);
  };

  return (
    <>
      {/* Nút bấm kích hoạt Popup Modal */}
      <button className="face-trigger-btn" onClick={() => setIsOpen(true)}>
        <span>🎭</span>
        <span>Mặt Audition & R2 Sync</span>
      </button>

      {/* Popup Modal */}
      {isOpen && (
        <div
          className="face-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="face-modal-content">
            {/* Header */}
            <div className="face-modal-header">
              <div>
                <h2>
                  <span>🎭</span> Quản Lý Mặt Audition & Cloudflare R2
                </h2>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                  Bucket: <strong style={{ color: "#10b981" }}>{BUCKET_NAME}</strong> · Tự động đồng bộ CDN
                </div>
              </div>
              <button className="face-modal-close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="face-modal-body">
              {/* Search Row */}
              <div className="face-search-row">
                <select
                  className="face-gender-select"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  disabled={loading}
                  title="Chọn giới tính mặt cần tìm"
                >
                  <option value="all">👥 Cả Nam & Nữ</option>
                  <option value="f">👩 Nữ</option>
                  <option value="m">👨 Nam</option>
                </select>

                <input
                  type="text"
                  className="face-input"
                  placeholder="Nhập tên mặt (richy, Moon...) hoặc mã (mf_v0411)..."
                  value={searchTerm}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchClick();
                  }}
                />
                <button
                  className="face-search-btn"
                  onClick={handleSearchClick}
                  disabled={loading}
                >
                  {loading ? "⏳ Đang xử lý..." : "🔍 Tìm & Sync"}
                </button>
              </div>

              {/* Danh sách nhiều mặt tìm thấy theo tên để người dùng chọn */}
              {searchResultsList.length > 0 && (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
                    Tìm thấy {searchResultsList.length} mặt khớp tên. Bấm vào mặt bạn muốn đồng bộ:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {searchResultsList.map((item, idx) => (
                      <div
                        key={idx}
                        className="face-api-item"
                        style={{ borderRadius: "6px" }}
                        onClick={() => handleSelectFromList(item)}
                      >
                        <div>
                          <strong style={{ color: "#fff", marginRight: "8px" }}>
                            {item.fileName}
                          </strong>
                          <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                            {item.name}
                          </span>
                        </div>
                        <span
                          className={`face-badge ${
                            item.gender === "m" || item.fileName.startsWith("mf")
                              ? "male"
                              : "female"
                          }`}
                        >
                          {item.gender === "m" || item.fileName.startsWith("mf") ? "Nam" : "Nữ"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tiến trình Progress */}
              {loading && (
                <div className="face-progress-box">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                    <span>{progress.message}</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="face-progress-bar-bg">
                    <div
                      className="face-progress-bar-fill"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Báo lỗi nếu có */}
              {errorMessage && (
                <div className="error-message" style={{ marginBottom: "16px" }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Thông báo đặc biệt khi "Nó chỉ có 1 mặt" */}
              {isSingleFace && faceImages.length > 0 && (
                <div
                  style={{
                    padding: "10px 16px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: "8px",
                    color: "#fbbf24",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>ℹ️</span>
                  <span>Mặt tĩnh không có metadata animation — <strong>Nó chỉ có 1 mặt</strong>.</span>
                </div>
              )}

              {/* Kết quả danh sách mặt */}
              {faceImages.length > 0 && (
                <div>
                  <div className="face-results-header">
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <strong style={{ color: "#fff", fontSize: "16px", marginRight: "4px" }}>
                        {currentCode}
                      </strong>
                      <span
                        className={`face-badge ${
                          currentCode.startsWith("ff") ? "female" : "male"
                        }`}
                      >
                        {currentCode.startsWith("ff") ? "👩 Nữ" : "👨 Nam"}
                      </span>
                      {currentName && (
                        <span style={{ color: "#94a3b8", fontSize: "13px", marginRight: "6px" }}>
                          ({currentName})
                        </span>
                      )}
                      <span
                        className="face-badge"
                        style={{
                          background:
                            statusSource === "r2_existing"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(59, 130, 246, 0.2)",
                          color: statusSource === "r2_existing" ? "#34d399" : "#60a5fa",
                        }}
                      >
                        {statusSource === "r2_existing"
                          ? "⚡ Có sẵn trên R2"
                          : "☁️ Vừa upload lên R2"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      {!isSingleFace && faceImages.length > 1 && (
                        <button
                          className="face-btn-mini"
                          style={{
                            padding: "6px 12px",
                            background: animating ? "rgba(255,255,255,0.1)" : "rgba(59, 130, 246, 0.3)",
                            color: "#fff",
                          }}
                          onClick={() => setAnimating(!animating)}
                        >
                          {animating ? "⏸ Tạm dừng Animation" : "▶️ Chạy Animation"}
                        </button>
                      )}
                      <button
                        className="face-btn-mini"
                        style={{
                          padding: "6px 14px",
                          background: "#10b981",
                          color: "#fff",
                          fontWeight: "600",
                        }}
                        onClick={handleDownloadAll}
                      >
                        📥 Tải {faceImages.length} Mặt
                      </button>
                    </div>
                  </div>

                  {/* Animation preview (chỉ hiện khi có nhiều frame) */}
                  {!isSingleFace && faceImages.length > 1 && animating && faceImages[frameIndex] && (
                    <div className="face-anim-box">
                      <div className="face-anim-avatar">
                        <img
                          src={faceImages[frameIndex].url}
                          alt="Face animated frame"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      </div>
                      <div style={{ fontSize: "13px", flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: "600", marginBottom: "4px" }}>
                          🎬 Chuyển động mặt Audition
                        </div>
                        <div style={{ color: "#94a3b8", marginBottom: "6px" }}>
                          Đang chạy Frame:{" "}
                          <strong style={{ color: "#10b981" }}>
                            #{faceImages[frameIndex].num}
                          </strong>{" "}
                          / #{faceImages[faceImages.length - 1].num}
                        </div>

                        {/* Điều khiển tốc độ animation */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Tốc độ:</span>
                          <input
                            type="range"
                            min="150"
                            max="800"
                            step="50"
                            value={animSpeed}
                            onChange={(e) => setAnimSpeed(Number(e.target.value))}
                            style={{ cursor: "pointer", accentColor: "#3b82f6", width: "120px" }}
                            title="Kéo sang phải để chạy chậm hơn"
                          />
                          <span style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", minWidth: "45px" }}>
                            {animSpeed}ms
                          </span>

                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="face-btn-mini"
                              style={{
                                padding: "2px 8px",
                                fontSize: "11px",
                                background: animSpeed >= 500 ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)",
                                color: "#fff",
                              }}
                              onClick={() => setAnimSpeed(500)}
                            >
                              🐢 Chậm
                            </button>
                            <button
                              type="button"
                              className="face-btn-mini"
                              style={{
                                padding: "2px 8px",
                                fontSize: "11px",
                                background: animSpeed === 350 || animSpeed === 400 ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)",
                                color: "#fff",
                              }}
                              onClick={() => setAnimSpeed(400)}
                            >
                              🚶 Vừa
                            </button>
                            <button
                              type="button"
                              className="face-btn-mini"
                              style={{
                                padding: "2px 8px",
                                fontSize: "11px",
                                background: animSpeed <= 250 ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)",
                                color: "#fff",
                              }}
                              onClick={() => setAnimSpeed(200)}
                            >
                              ⚡ Nhanh
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grid các frame ảnh mặt tải từ R2 */}
                  <div className="face-grid">
                    {faceImages.map((imgItem, idx) => (
                      <div key={idx} className="face-card">
                        <div
                          className="face-thumb-wrapper"
                          onClick={() => setLightboxImg(imgItem.url)}
                          title="Bấm để phóng to"
                        >
                          <img src={imgItem.url} alt={`Frame ${imgItem.num}`} loading="lazy" />
                          <span className="face-num-badge">#{imgItem.num}</span>
                        </div>

                        <div className="face-card-actions">
                          <button
                            className="face-btn-mini download"
                            onClick={() =>
                              handleDownloadSingle(
                                imgItem.url,
                                `${currentCode}_${imgItem.num}.png`
                              )
                            }
                            title="Tải PNG về máy"
                          >
                            📥 Tải
                          </button>
                          <button
                            className="face-btn-mini copy"
                            onClick={() => handleCopyLink(imgItem.url)}
                            title="Copy link R2"
                          >
                            🔗 Link
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox zoom ảnh to */}
      {lightboxImg && (
        <div className="face-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Enlarged view" />
        </div>
      )}
    </>
  );
}
