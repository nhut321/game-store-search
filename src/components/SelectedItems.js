import React from 'react';
import './SelectedItems.css';

function SelectedItems({
  items,
  onCopyFileNames,
  onClearSelected,
  onRemoveItem
}) {
  return (
    <div className="selected-items">
      <h2>📋 Item đã chọn ({items.length})</h2>

      <div className="selected-actions">
        <button
          onClick={onCopyFileNames}
          disabled={items.length === 0}
          className="btn-copy"
          title="Copy tất cả fileName vào clipboard"
        >
          📋 Copy FileNames
        </button>
        <button
          onClick={onClearSelected}
          disabled={items.length === 0}
          className="btn-clear"
          title="Xóa tất cả item đã chọn"
        >
          🗑️ Xóa tất cả
        </button>
      </div>

      {/* <div className="selected-list">
        {items.length === 0 ? (
          <div className="empty-message">
            Chưa chọn item nào
          </div>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>FileName</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.fileName}>
                  <td className="index">{index + 1}</td>
                  <td className="name" title={item.name}>
                    {item.name}
                  </td>
                  <td className="file-name" title={item.fileName}>
                    {item.fileName}
                  </td>
                  <td className="action">
                    <button
                      onClick={() => onRemoveItem(item.fileName)}
                      className="btn-remove"
                      title="Xóa item này"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div> */}

      {items.length > 0 && (
        <div className="file-names-preview">
          <h3>Preview FileNames:</h3>
          <div className="file-names-text">
            {items.map((item, index) => (
              <div key={item.fileName} className="file-name-line">
                {item.fileName}
              </div>
            ))}
          </div>
        </div>
      )}
      <a className='link selected-list' target="_blank" href="https://zozostudio2011-bot.github.io/test/">Trang convert file</a>
    </div>
  );
}

export default SelectedItems;
