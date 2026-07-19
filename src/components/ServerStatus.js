import React, { useEffect, useState } from 'react';
import './ServerStatus.css';

function ServerStatus({ serverWakingUp, loading, requestTime }) {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (serverWakingUp) {
      setShowNotification(true);
    }
  }, [serverWakingUp]);

  useEffect(() => {
    if (requestTime !== null && requestTime > 3000) {
      // Hiển thị thông báo nếu request lâu hơn 3 giây
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [requestTime]);

  if (!showNotification && requestTime === null) {
    return null;
  }

  return (
    <div className={`server-status ${serverWakingUp ? 'active' : ''} ${requestTime && requestTime > 3000 ? 'slow' : ''}`}>
      <div className="status-content">
        {serverWakingUp ? (
          <>
            <div className="spinner-small"></div>
            <span>⏳ Server đang bật lên... Vui lòng đợi</span>
          </>
        ) : requestTime && requestTime > 3000 ? (
          <>
            <span>✅ Server đã sẵn sàng!</span>
            <span className="request-time">Thời gian: {requestTime}ms</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default ServerStatus;
