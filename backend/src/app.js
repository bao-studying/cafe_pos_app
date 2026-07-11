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

  const user = USERS.find((u) => u.phone === phone && u.password === password);

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Số điện thoại hoặc mật khẩu không chính xác!",
    });
  }

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
app.get("/api/orders/test", (req, res) => {
  res.json({ success: true, message: "Route Orders đang hoạt động!" });
});
// ==========================================
// ĐOẠN 1: SỬA LẠI ĐƯỜNG DẪN TUYỆT ĐỐI CHO ROUTE (FIX LỖI 404 TRÊN RENDER)
// ==========================================
app.use("/api/auth", require(path.join(__dirname, "routes/authRoutes")));

app.use("/api/orders", require(path.join(__dirname, "routes/orderRoutes")));
app.use("/api/products", require(path.join(__dirname, "routes/productRoutes")));
app.use("/api/admin", require(path.join(__dirname, "routes/adminRoutes")));
app.use("/api/users", require(path.join(__dirname, "routes/userRoutes")));
app.use("/api/payment", require(path.join(__dirname, "routes/paymentRoutes")));
app.use("/api/stock", require(path.join(__dirname, "routes/stockRoutes")));
app.use("/api/tables", require(path.join(__dirname, "routes/tableRoutes")));
app.use("/api/shifts", require(path.join(__dirname, "routes/shiftRoutes")));
app.use("/api/attendance", require(path.join(__dirname, "routes/attendanceRoutes")));
app.use("/api/payroll", require(path.join(__dirname, "routes/payrollRoutes")));
app.use("/api/pos", require(path.join(__dirname, "routes/posRoutes")));
app.use("/api/schedule", require(path.join(__dirname, "routes/scheduleRoutes")));

// ==========================================
// ĐOẠN 2: CẤU HÌNH PHỤC VỤ ANGULAR STATIC (ĐẶT Ở CUỐI FILE)
// ==========================================
const frontendPath = path.join(process.cwd(), "../frontend/dist/lab1/browser");

// Cấu hình phục vụ file tĩnh (js, css, hình ảnh) từ thư mục browser
app.use(express.static(frontendPath, { index: "index.csr.html" }));

// Bẫy lỗi 404 cho riêng các request gọi vào /api nhưng không tồn tại
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ success: false, message: `API không tồn tại: ${req.originalUrl}` });
});

// Tất cả các request KHÔNG PHẢI /api thì đều ném về file index.csr.html của Angular
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.csr.html"));
});

// ==========================================
// ĐOẠN 3: KẾT NỐI SERVER VÀ SOCKET.IO
// ==========================================
const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server đang chạy mượt mà trên port ${PORT} (kèm Socket.io)`);
});
