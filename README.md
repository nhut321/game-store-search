# 🎮 Game Store Search

Trang web tìm kiếm item quần áo của game VTC.

## ✨ Tính năng

- 👩👨 **Chọn Giới tính**: Nam (m) / Nữ (f)
- 🖥️ **Chọn Server**: VTC / AUBIZ
- 🔍 **Tìm kiếm**: Nhập từ khóa và nhấn Enter hoặc click nút Tìm
- 📦 **Xem kết quả**: Hiển thị grid các item với ảnh
- ✅ **Chọn item**: Click vào item để thêm vào danh sách
- 📋 **Quản lý chọn**: Xem danh sách item đã chọn bên phải
- 📋 **Copy FileName**: Nút copy để lấy tất cả fileName
- 🗑️ **Xóa item**: Xóa từng item hoặc xóa tất cả
- ⏳ **Server Status**: Thông báo khi server đang bật lên (wake up notification)

## 🚀 Deploy trên Vercel

### 1. Clone repository
```bash
git clone https://github.com/nhut321/game-store-search.git
cd game-store-search
```

### 2. Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### 3. Deploy
```bash
vercel
```

Vercel sẽ hỏi một vài câu hỏi, bạn cứ ấn Enter để chọn mặc định.

### 4. Truy cập ứng dụng
```
https://your-project.vercel.app
```

---

## 🏃 Chạy cục bộ

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy dự án
```bash
npm start
```

Ứng dụng sẽ mở tại `http://localhost:3000`

---

## 📂 Cấu trúc dự án

```
game-store-search/
├── package.json
├── vercel.json (Vercel configuration)
├── README.md
├── .gitignore
├── public/
│   └── index.html
└── src/
    ├── index.js
    ├── index.css
    ├── App.js
    ├── App.css
    └── components/
        ├── SearchForm.js
        ├── SearchForm.css
        ├── SearchResults.js
        ├── SearchResults.css
        ├── ItemCard.js
        ├── ItemCard.css
        ├── SelectedItems.js
        ├── SelectedItems.css
        ├── ServerStatus.js
        └── ServerStatus.css
```

---

## 🛠️ Công nghệ sử dụng

- **React 18**: UI library
- **Axios**: HTTP client
- **CSS3**: Styling
- **Vercel**: Hosting & Proxy

---

## 📝 Features Chi tiết

### Server Wake-up Notification
- Khi bạn tìm kiếm, nếu server Vercel cần bật lên (cold start), sẽ hiển thị thông báo "⏳ Server đang bật lên"
- Khi request hoàn tất, sẽ hiển thị "✅ Server đã sẵn sàng" cùng với thời gian response
- Nếu response lâu hơn 3 giây, sẽ có thông báo đặc biệt cho người dùng biết

### Proxy Configuration
- File `vercel.json` cấu hình rewrite tất cả request `/api/*` đến `aumix3d.com`
- Giải quyết vấn đề CORS mà không cần backend riêng

---

## 📄 License

MIT
