// apps/frontend/erp-portal/src/shared/components/CameraModal.jsx

import { useEffect, useRef, useState } from "react";
import { FaTimes, FaRedo, FaCheck } from "react-icons/fa"; // Bỏ FaCamera vì không dùng icon đó nữa
import "../styles/camera-modal.css";

export default function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Lỗi Camera:", err);
        setError("Không thể truy cập Camera. Vui lòng cấp quyền.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setImage(dataUrl);
  };

  const handleRetake = () => {
    setImage(null);
    // Cần gán lại stream cho video khi chụp lại
    setTimeout(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, 100);
  };

  const handleConfirm = () => {
    if (image) {
      onCapture(image);
      onClose();
    }
  };

  return (
    <div className="camera-modal-overlay">
      <div className="camera-modal-content">
        <div className="camera-header">
          <h3>Chấm công khuôn mặt</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="camera-body">
          {error ? (
            <div className="camera-error">{error}</div>
          ) : (
            <div className="video-wrapper" onClick={!image ? handleSnap : undefined} style={{ cursor: !image ? 'pointer' : 'default' }}>
              {/* === HƯỚNG DẪN NGƯỜI DÙNG === */}
              {!image && (
                <div className="camera-guide-text" style={{
                    position: 'absolute', 
                    zIndex: 10, 
                    color: 'white', 
                    background: 'rgba(0,0,0,0.5)', 
                    padding: '5px 10px', 
                    borderRadius: '20px',
                    pointerEvents: 'none'
                }}>
                    Chạm vào màn hình để chấm công
                </div>
              )}

              {!image ? (
                <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
              ) : (
                <img src={image} alt="Captured" className="photo-preview" />
              )}
              
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          )}
        </div>

        {/* Footer chỉ hiện nút khi ĐÃ có ảnh */}
        <div className="camera-footer" style={{ minHeight: '60px' }}>
          {!image ? (
             /* === ĐÃ XÓA NÚT CHỤP Ở ĐÂY === */
             <div className="text-muted small">Đang tìm khuôn mặt...</div>
          ) : (
            <div className="action-buttons">
              <button className="btn-retake" onClick={handleRetake}>
                <FaRedo /> Chấm công lại
              </button>
              <button className="btn-confirm" onClick={handleConfirm}>
                <FaCheck /> Xác nhận chấm công
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}