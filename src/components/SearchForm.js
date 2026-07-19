import React from 'react';
import './SearchForm.css';

function SearchForm({
  gender,
  setGender,
  server,
  setServer,
  searchQuery,
  setSearchQuery,
  onSearch,
  loading
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      onSearch(searchQuery);
    }
  };

  const handleSearch = () => {
    if (!loading) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="search-form">
      <h2>🔍 Tìm kiếm</h2>

      <div className="form-group">
        <label htmlFor="gender">Giới tính:</label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          disabled={loading}
        >
          <option value="f">👩 Nữ</option>
          <option value="m">👨 Nam</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="server">Server:</label>
        <select
          id="server"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          disabled={loading}
        >
          <option value="vtc">VTC</option>
          <option value="aubiz">AUBIZ</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="search">Tìm kiếm:</label>
        <div className="search-input-wrapper">
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tên item..."
            disabled={loading}
            className="search-input"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="search-button"
          >
            {loading ? '⏳ Đang tìm...' : '🔎 Tìm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchForm;
