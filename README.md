# Trang đếm ngược — Đăng nhập bằng mật khẩu (Admin / User)

Ứng dụng gồm **frontend** (HTML/CSS/JS thuần) và **backend** (Node.js + Express).
Mật khẩu được lưu ở backend dưới dạng **đã băm (bcrypt hash)** — không lưu ở dạng chữ
thường, không gửi về trình duyệt, và không ai xem được kể cả khi mở "View Source".

## 1. Cài đặt

Yêu cầu: đã cài [Node.js](https://nodejs.org) (bản 18 trở lên).

```bash
cd countdown-app
npm install
cp .env.example .env
```

## 2. Đổi mật khẩu (khuyến nghị trước khi dùng thật)

Mật khẩu mặc định trong `.env.example` chỉ để demo:
- Quản trị viên: `admin123`
- Người xem: `user123`

Để đặt mật khẩu riêng, tạo mã băm bằng lệnh:

```bash
npm run hash-password -- "mật khẩu mới của bạn"
```

Lệnh sẽ in ra một chuỗi hash, ví dụ:
```
$2a$12$abc123....
```

Sao chép chuỗi đó vào file `.env`, thay cho `ADMIN_PASSWORD_HASH` hoặc
`USER_PASSWORD_HASH`. Mật khẩu gốc không được lưu lại ở bất kỳ đâu.

Cũng nên đổi `JWT_SECRET` trong `.env` thành một chuỗi ngẫu nhiên dài, bí mật.

## 3. Chạy server

```bash
npm start
```

Mở trình duyệt tại: `http://localhost:3000`

## 4. Cách hoạt động

- Người dùng chỉ cần **nhập mật khẩu**, không cần tên đăng nhập.
- Server so sánh mật khẩu nhập vào với hai hash đã lưu (`ADMIN_PASSWORD_HASH`,
  `USER_PASSWORD_HASH`) bằng `bcrypt.compare()`. Server tự xác định vai trò
  (admin hay user) dựa trên hash nào khớp.
- Sau khi đăng nhập thành công, server cấp một **JWT** lưu trong cookie
  `httpOnly` (JavaScript ở trình duyệt không đọc được cookie này).
- Mọi yêu cầu xem hoặc sửa dữ liệu đếm ngược đều được server kiểm tra lại
  qua middleware `requireAuth` / `requireAdmin` — không dựa vào bất cứ điều
  gì gửi từ frontend để quyết định quyền hạn.
- Dữ liệu đếm ngược (tên sự kiện + ngày giờ đích) được lưu trong `data.json`
  ở server, dùng chung cho tất cả người xem.

## 5. Cấu trúc thư mục

```
countdown-app/
├── server.js              # Backend Express: xác thực, API, lưu dữ liệu
├── package.json
├── .env.example            # Mẫu cấu hình — sao chép thành .env
├── scripts/
│   └── hash-password.js    # Công cụ tạo hash mật khẩu mới
└── public/
    ├── index.html           # Giao diện
    ├── styles.css
    └── app.js               # Gọi API backend, không lưu bí mật ở client
```

## 6. Triển khai thật (production)

- Chạy sau một reverse proxy có HTTPS (Nginx, Caddy, v.v.) để cookie được
  bảo vệ qua kênh mã hóa.
- Đặt `JWT_SECRET` và các hash mật khẩu qua biến môi trường của nền tảng
  triển khai (Render, Railway, VPS...) thay vì để trong file `.env` commit
  lên Git.
- Nếu cần nhiều tài khoản admin/user hoặc đổi mật khẩu từ giao diện, nên
  chuyển từ `data.json`/`.env` sang một cơ sở dữ liệu thật (PostgreSQL,
  SQLite, MongoDB...).
