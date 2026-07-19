import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import SearchForm from './components/SearchForm';
import SearchResults from './components/SearchResults';
import SelectedItems from './components/SelectedItems';

function App() {
  const [gender, setGender] = useState('f');
  const [server, setServer] = useState('vtc');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        `https://aumix3d.com/api/vtc-store`,
        {
          params: {
            gender: gender,
            part: 'h',
            page: 1,
            limit: 20,
            shopType: 'normal',
            server: server,
            search: query
          }
        }
      );

      setResults(response.data.items || []);
    } catch (err) {
      setError(`Lỗi: ${err.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [gender, server]);

  const handleSelectItem = useCallback((item) => {
    const itemExists = selectedItems.some(
      (selected) => selected.fileName === item.fileName
    );

    if (itemExists) {
      setSelectedItems(selectedItems.filter(
        (selected) => selected.fileName !== item.fileName
      ));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  }, [selectedItems]);

  const isItemSelected = useCallback((fileName) => {
    return selectedItems.some((item) => item.fileName === fileName);
  }, [selectedItems]);

  const handleCopyFileNames = useCallback(() => {
    const fileNames = selectedItems.map((item) => item.fileName).join('\n');
    navigator.clipboard.writeText(fileNames).then(() => {
      alert('Đã copy tất cả fileName!');
    }).catch((err) => {
      console.error('Lỗi khi copy:', err);
    });
  }, [selectedItems]);

  const handleClearSelected = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">🎮 Game Store Search</h1>
        
        <div className="main-content">
          <div className="left-section">
            <SearchForm
              gender={gender}
              setGender={setGender}
              server={server}
              setServer={setServer}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearch}
              loading={loading}
            />

            {error && <div className="error-message">{error}</div>}

            <SearchResults
              results={results}
              loading={loading}
              onSelectItem={handleSelectItem}
              isItemSelected={isItemSelected}
            />
          </div>

          <div className="right-section">
            <SelectedItems
              items={selectedItems}
              onCopyFileNames={handleCopyFileNames}
              onClearSelected={handleClearSelected}
              onRemoveItem={(fileName) => {
                setSelectedItems(selectedItems.filter(
                  (item) => item.fileName !== fileName
                ));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
