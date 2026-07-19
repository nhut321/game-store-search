import React from 'react';
import './ItemCard.css';

function ItemCard({ item, onSelect, isSelected }) {
  const getImageUrl = () => {
    // API trả về fileName, chúng ta cần xây dựng URL cho ảnh
    // Điều chỉnh URL này theo cấu trúc thực tế của server
    return `https://aumix3d.com/item/${item.fileName}.webp`;
  };

  const handleImageError = (e) => {
    // e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="12" fill="%23999" text-anchor="middle" dy=".3em"%3EKhông ảnh%3C/text%3E%3C/svg%3E';
        e.target.src = `https://cdn.aumix3d.com/previews/${item.fileName}_skin2.webp`
  };

  return (
    <div
      className={`item-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item)}
    >
      <div className="item-image">
        <img
          src={getImageUrl()}
          alt={item.name}
          onError={handleImageError}
        />
        {isSelected && <div className="selected-badge">✓</div>}
      </div>
      <div className="item-info">
        <div className="item-name" title={item.name}>
          {item.name}
        </div>
        <div className="item-file-name" title={item.fileName}>
          {item.fileName}
        </div>
      </div>
    </div>
  );
}

export default ItemCard;
