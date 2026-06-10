const Product = require("../models/Product");

// 1. [ADMIN] Tạo món mới hoặc nguyên liệu mới
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      costPrice,
      quantity,
      description,
      imageUrl,
    } = req.body;

    const newProduct = new Product({
      name,
      category,
      price: category === "Nguyên liệu" ? 0 : price, // Nguyên liệu thì không cần giá bán công khai
      costPrice: costPrice || 0,
      quantity: quantity || 0,
      description,
      imageUrl,
      isActive: true,
    });

    await newProduct.save();
    res.status(201).json({
      success: true,
      message: "Thêm thành công!",
      data: newProduct,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. [PUBLIC/ADMIN] Lấy danh sách sản phẩm & nguyên liệu
exports.getAllProducts = async (req, res) => {
  try {
    const { category, isAdmin } = req.query;
    const filter = {};

    // NẾU LÀ NHÂN VIÊN/POS: Ẩn danh mục Nguyên liệu và chỉ lấy món đang hoạt động
    if (isAdmin !== "true") {
      filter.isActive = true;
      filter.category = { $ne: "Nguyên liệu" };
    }

    // Nếu có bộ lọc danh mục cụ thể từ client gửi lên
    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. [ADMIN] Cập nhật thông tin món / nguyên liệu
exports.updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu." });
    }

    res
      .status(200)
      .json({ success: true, message: "Cập nhật thành công!", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. [PUBLIC] Lấy chi tiết 1 món
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy." });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. ✅ ĐÃ BỔ SUNG: [ADMIN] Ẩn món (Soft delete — Đổi trạng thái isActive = false)
exports.deactivateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy món." });
    }

    res.status(200).json({
      success: true,
      message: `Món "${product.name}" đã được ẩn khỏi menu.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 6. [ADMIN] Xóa vĩnh viễn khỏi hệ thống
exports.deleteProductHard = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy món để xóa." });
    res
      .status(200)
      .json({ success: true, message: "Đã xóa vĩnh viễn khỏi hệ thống!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
