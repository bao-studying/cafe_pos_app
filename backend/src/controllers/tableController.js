const Table = require("../models/Table");

// GET /api/tables — lấy toàn bộ sơ đồ bàn
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ createdAt: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// POST /api/tables — thêm 1 bàn mới vào sơ đồ
exports.createTable = async (req, res) => {
  try {
    const { label, x, y, shape, seats } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập tên/số bàn." });
    }

    const table = new Table({
      label: label.trim(),
      x: Number(x) || 40,
      y: Number(y) || 40,
      shape: shape === "round" ? "round" : "square",
      seats: Number(seats) || 4,
    });

    await table.save();
    res.status(201).json({ message: "Đã thêm bàn mới.", table });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// PATCH /api/tables/:id — cập nhật vị trí/thông tin bàn (dùng khi kéo-thả)
exports.updateTable = async (req, res) => {
  try {
    const { label, x, y, shape, seats } = req.body;
    const update = {};
    if (label !== undefined) update.label = label.trim();
    if (x !== undefined) update.x = Number(x);
    if (y !== undefined) update.y = Number(y);
    if (shape !== undefined)
      update.shape = shape === "round" ? "round" : "square";
    if (seats !== undefined) update.seats = Number(seats);

    const table = await Table.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!table) {
      return res.status(404).json({ message: "Không tìm thấy bàn." });
    }
    res.json({ message: "Đã cập nhật bàn.", table });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// DELETE /api/tables/:id — xoá 1 bàn khỏi sơ đồ
exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) {
      return res.status(404).json({ message: "Không tìm thấy bàn." });
    }
    res.json({ message: "Đã xoá bàn." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
