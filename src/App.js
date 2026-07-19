import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import SearchForm from './components/SearchForm';
import SearchResults from './components/SearchResults';
import SelectedItems from './components/SelectedItems';
import ServerStatus from './components/ServerStatus';

function App() {
  const [gender, setGender] = useState('f');
  const [server, setServer] = useState('vtc');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverWakingUp, setServerWakingUp] = useState(false);
  const [requestTime, setRequestTime] = useState(null);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    setServerWakingUp(true);
    const startTime = Date.now();

    try {
      // Sử dụng /api proxy thay vì direct URL
      const response = await axios.get('/api/vtc-store', {
        params: {
          gender: gender,
          part: 'h',
          page: 1,
          limit: 20,
          shopType: 'normal',
          server: server,
          search: query
        },
        timeout: 30000 // Timeout 30 giây cho server wake up
      });

      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      setRequestTime(timeTaken);

      setResults(response.data.items || []);
      
      // Nếu request lâu > 3 giây, có thể là server vừa wake up
      if (timeTaken > 3000) {
        console.log(`Server wake up time: ${timeTaken}ms`);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('⏱️ Server đang bật lên, vui lòng thử lại...');
      } else {
        setError(`❌ Lỗi: ${err.message}`);
      }
      setResults([]);
    } finally {
      setLoading(false);
      setServerWakingUp(false);
    }
  }, [gender, server]);

  const handleGenderChange = (newGender) => {
    setGender(newGender);
    setSelectedItems([]); // Xoá tất cả item
  };

  const handleSelectItem = useCallback((item) => {
    const itemExists = selectedItems.some(
      (selected) => selected.fileName === item.fileName
    );

    if (itemExists) {
      // Nếu đã chọn rồi, bỏ chọn
      setSelectedItems(selectedItems.filter(
        (selected) => selected.fileName !== item.fileName
      ));
    } else {
      // Nếu chưa chọn, kiểm tra xem có item với part này chưa
      const hasSamePart = selectedItems.some(
        (selected) => selected.part === item.part
      );

      if (hasSamePart) {
        // Nếu đã có item với part này, thay thế nó
        const updatedItems = selectedItems.filter(
          (selected) => selected.part !== item.part
        );
        setSelectedItems([...updatedItems, item]);
      } else {
        // Nếu chưa có, thêm mới
        setSelectedItems([...selectedItems, item]);
      }
    }
  }, [selectedItems]);

  const isItemSelected = useCallback((fileName) => {
    return selectedItems.some((item) => item.fileName === fileName);
  }, [selectedItems]);

  const handleCopyFileNames = useCallback(() => {
    const fileNames = selectedItems.map((item) => item.fileName).join('\n');
    navigator.clipboard.writeText(fileNames);
  }, [selectedItems]);

  const handleClearSelected = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">🎮 Game Store Search</h1>
        
        <ServerStatus 
          serverWakingUp={serverWakingUp} 
          loading={loading}
          requestTime={requestTime}
        />
        
        <div className="main-content">
          <div className="left-section">
            <SearchForm
              gender={gender}
              setGender={handleGenderChange}
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
