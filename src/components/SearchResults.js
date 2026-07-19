import React from 'react';
import ItemCard from './ItemCard';
import './SearchResults.css';

function SearchResults({ results, loading, onSelectItem, isItemSelected }) {
  if (loading) {
    return (
      <div className="search-results loading">
        <div className="spinner"></div>
        <p>Đang tìm kiếm...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-results empty">
        <p>Không tìm thấy kết quả</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <h2>📦 Kết quả tìm kiếm ({results.length})</h2>
      <div className="results-grid">
        {results.map((item) => (
          <ItemCard
            key={item.fileName}
            item={item}
            onSelect={onSelectItem}
            isSelected={isItemSelected(item.fileName)}
          />
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
