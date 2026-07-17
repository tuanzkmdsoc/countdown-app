require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const DATA_FILE = path.join(__dirname, 'data.json');

if (!process.env.ADMIN_PASSWORD_HASH || !process.env.USER_PASSWORD_HASH) {
  console.error('LỖI: Thiếu ADMIN_PASSWORD_HASH hoặc USER_PASSWORD_HASH trong file .env');
  console.error('Hãy sao chép .env.example thành .env trước khi chạy server.');
  process.exit(1);
}

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Countdown data persistence (đọc/ghi file JSON đơn giản) ----------
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    const fallback = {
      eventName: 'Sự kiện đặc biệt',
      targetDate: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 12 * 3600 * 1000).toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Auth helpers ----------
function signToken(role) {
  return jwt.sign({ role }, JWT_SECRET, { expiresIn: '12h' });
}

function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này.' });
  }
  next();
}

// ---------- Routes ----------

// Đăng nhập chỉ bằng mật khẩu. Server so sánh với hash đã lưu, không bao giờ
// gửi hoặc lộ mật khẩu thật ra ngoài.
app.post('/api/login', async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Vui lòng nhập mật khẩu.' });
  }

  const isAdmin = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (isAdmin) {
    const token = signToken('admin');
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000 });
    return res.json({ role: 'admin' });
  }

  const isUser = await bcrypt.compare(password, process.env.USER_PASSWORD_HASH);
  if (isUser) {
    const token = signToken('user');
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000 });
    return res.json({ role: 'user' });
  }

  return res.status(401).json({ error: 'Bạn đã nhập sai hoặc bạn không phải là người được phép.' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

// Kiểm tra phiên đăng nhập hiện tại
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ role: req.user.role });
});

// Lấy dữ liệu đếm ngược — cần đăng nhập (admin hoặc user đều xem được)
app.get('/api/countdown', requireAuth, (req, res) => {
  res.json(readData());
});

// Cập nhật dữ liệu đếm ngược — chỉ admin
app.post('/api/countdown', requireAuth, requireAdmin, (req, res) => {
  const { eventName, targetDate } = req.body || {};
  if (!targetDate || isNaN(new Date(targetDate).getTime())) {
    return res.status(400).json({ error: 'Ngày giờ không hợp lệ.' });
  }
  const data = {
    eventName: (eventName && String(eventName).trim()) || 'Sự kiện đặc biệt',
    targetDate: new Date(targetDate).toISOString(),
  };
  writeData(data);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
