const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const connectDB = require("./config/db.js");
const User = require("./models/User.js");
const { initSocket } = require("./socket.js");

// 1. Cấu hình dotenv phải nằm ĐẦU TIÊN để nạp các biến môi trường
dotenv.config({ path: path.join(__dirname, "../.env") });

// 2. Gọi kết nối database
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const USERS = [
  {
    name: "Duong Gia Bao",
    phone: "0939743836",
    password: "2505",
    role: "admin",
  },
];

// API ĐĂNG NHẬP
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;

  // Tìm user khớp số điện thoại và mật khẩu
  const user = USERS.find((u) => u.phone === phone && u.password === password);

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Số điện thoại hoặc mật khẩu không chính xác!",
    });
  }

  // Đăng nhập thành công -> Trả về thông tin user kèm token giả định
  return res.json({
    success: true,
    message: "Đăng nhập thành công!",
    token: "fake-jwt-token-for-bao-2505",
    user: {
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  });
});

// Các tuyến đường API (Đã xóa bỏ các dòng trùng lặp)
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/stock", require("./routes/stockRoutes"));
app.use("/api/tables", require("./routes/tableRoutes"));
app.use("/api/shifts", require("./routes/shiftRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/pos", require("./routes/posRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));

// ==========================================
// 🚀 CẤU HÌNH ĐỂ TRẢ VỀ GIAO DIỆN FRONTEND TRÊN RENDER (ĐÃ FIX LỖI EXPRESS V5)
// ==========================================
// 1. Phục vụ các file tĩnh (html, css, js) từ thư mục dist của Frontend sau khi build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// 2. Dùng middleware thay cho app.get('*') để tránh triệt để lỗi PathError [TypeError] của Express v5
app.use((req, res, next) => {
  // Nếu request không bắt đầu bằng /api thì trả về file index.html của Frontend
  if (!req.url.startsWith("/api")) {
    return res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  }
  next();
});

// ==========================================
// KẾT NỐI SERVER VÀ SOCKET.IO (Chỉ khai báo DUY NHẤT một lần)
// ==========================================
const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server đang chạy mượt mà trên port ${PORT} (kèm Socket.io)`);
});
