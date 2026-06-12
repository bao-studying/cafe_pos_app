const mongoose = require("mongoose");
const Product = require("../models/Product");
const Recipe = require("../models/Recipe");
const StockReceipt = require("../models/StockReceipt");
const StaffStockReport = require("../models/StaffStockReport");
const { calculateVariance } = require("../utils/stockVariance");

// ============================================================
// 1. NGUYÊN LIỆU (Ingredients) — tái sử dụng Product
// ============================================================

// GET /api/stock/ingredients
exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await Product.find({ category: "Nguyên liệu" }).sort({
      name: 1,
    });
    res.status(200).json({ success: true, data: ingredients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/stock/ingredients/:id/config
// Cập nhật đơn vị quy đổi (baseUnit, subUnit, conversionRate, minStockAlert)
exports.updateIngredientConfig = async (req, res) => {
  try {
    const { baseUnit, subUnit, conversionRate, minStockAlert } = req.body;
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { baseUnit, subUnit, conversionRate, minStockAlert },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nguyên liệu." });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Cập nhật cấu hình thành công!",
        data: updated,
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/stock/products-search?q=...
// Dùng cho popup cấu hình công thức: tìm món bán (loại trừ Nguyên liệu)
exports.searchProductsForRecipe = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { category: { $ne: "Nguyên liệu" }, isActive: true };
    if (q) filter.name = { $regex: q, $options: "i" };
    const products = await Product.find(filter).limit(20).sort({ name: 1 });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 2. CÔNG THỨC (Recipe)
// ============================================================

// GET /api/stock/recipes/:ingredientId
exports.getRecipesByIngredient = async (req, res) => {
  try {
    const recipes = await Recipe.find({
      ingredientId: req.params.ingredientId,
    }).populate("productId", "name imageUrl category price");

    res.status(200).json({ success: true, data: recipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/stock/recipes/:ingredientId
// Body: { items: [{ productId, quantityNeeded }] }
// Thay thế toàn bộ công thức hiện có của nguyên liệu này
exports.saveRecipesForIngredient = async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { items } = req.body; // [{ productId, quantityNeeded }]

    if (!Array.isArray(items)) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu items không hợp lệ." });
    }

    // Xoá hết công thức cũ của nguyên liệu này, rồi thêm lại theo danh sách mới
    await Recipe.deleteMany({ ingredientId });

    const docs = items
      .filter((it) => it.productId && Number(it.quantityNeeded) > 0)
      .map((it) => ({
        ingredientId,
        productId: it.productId,
        quantityNeeded: Number(it.quantityNeeded),
      }));

    if (docs.length > 0) {
      await Recipe.insertMany(docs);
    }

    const result = await Recipe.find({ ingredientId }).populate(
      "productId",
      "name imageUrl category price",
    );

    res.status(200).json({
      success: true,
      message: "Lưu công thức thành công!",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 3. NHẬP KHO (Stock Receipt)
// ============================================================

// POST /api/stock/receipts
// Body: { ingredientId, quantityImported, totalPrice, importedBy }
exports.createStockReceipt = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { ingredientId, quantityImported, totalPrice, importedBy } = req.body;

    if (!ingredientId || !quantityImported || quantityImported <= 0) {
      throw new Error("Vui lòng nhập số lượng nhập kho hợp lệ.");
    }

    const ingredient = await Product.findById(ingredientId).session(session);
    if (!ingredient) throw new Error("Không tìm thấy nguyên liệu.");

    // Quy đổi từ baseUnit -> subUnit để cộng vào tồn kho
    const addedSub =
      Number(quantityImported) * (ingredient.conversionRate || 1);

    ingredient.quantity = (ingredient.quantity || 0) + addedSub;
    // Cập nhật giá vốn theo lần nhập gần nhất (đơn giá / subUnit)
    if (totalPrice && addedSub > 0) {
      ingredient.costPrice = Number((totalPrice / addedSub).toFixed(2));
    }
    await ingredient.save({ session });

    const receipt = await StockReceipt.create(
      [
        {
          ingredientId,
          quantityImported,
          totalPrice: totalPrice || 0,
          importedBy: importedBy || "",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Nhập kho thành công!",
      data: { receipt: receipt[0], ingredient },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/stock/receipts/:ingredientId
exports.getReceiptHistory = async (req, res) => {
  try {
    const receipts = await StockReceipt.find({
      ingredientId: req.params.ingredientId,
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: receipts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 4. KIỂM KHO NHÂN VIÊN (Staff Stock Report) + ĐỐI CHIẾU HAO HỤT
// ============================================================

// POST /api/stock/reports
// Body: {
//   staffId, staffName, note,
//   details: [{ ingredientId, actualBaseQty, actualSubQty }],
//   soldItems: [{ productId, qtySold }]  // optional - lấy từ Order/Ca làm việc
// }
exports.submitStaffReport = async (req, res) => {
  try {
    const { staffId, staffName, note, details, soldItems } = req.body;

    if (!staffId || !Array.isArray(details) || details.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu dữ liệu kiểm kho." });
    }

    const ingredientIds = details.map((d) => d.ingredientId);
    const ingredients = await Product.find({ _id: { $in: ingredientIds } });
    const ingredientMap = new Map(ingredients.map((i) => [String(i._id), i]));

    // Lấy toàn bộ recipe liên quan để build recipeMap theo từng ingredient
    const recipes = await Recipe.find({ ingredientId: { $in: ingredientIds } });

    const reportDetails = [];

    for (const d of details) {
      const ingredient = ingredientMap.get(String(d.ingredientId));
      if (!ingredient) continue;

      const conversionRate = ingredient.conversionRate || 1;
      const actualBaseQty = Number(d.actualBaseQty) || 0;
      const actualSubQty = Number(d.actualSubQty) || 0;
      const totalActualSub = actualBaseQty * conversionRate + actualSubQty;

      // Tồn lý thuyết đầu ca = tồn hiện tại trong DB (snapshot tại thời điểm kiểm)
      const theoreticalStart = ingredient.quantity || 0;

      // Build recipeMap cho riêng ingredient này: productId -> quantityNeeded
      const recipeMap = new Map(
        recipes
          .filter((r) => String(r.ingredientId) === String(d.ingredientId))
          .map((r) => [String(r.productId), r.quantityNeeded]),
      );

      // imported trong ca: tạm để 0 (chưa có module Ca làm việc để lọc theo khoảng thời gian)
      const { theoreticalEnd, variance, variancePercent } = calculateVariance({
        theoreticalStart,
        imported: 0,
        soldItems: soldItems || [],
        recipeMap,
        actualEnd: totalActualSub,
      });

      reportDetails.push({
        ingredientId: d.ingredientId,
        actualBaseQty,
        actualSubQty,
        totalActualSub,
        theoreticalSub: theoreticalEnd,
        variance,
        variancePercent,
      });

      // Cập nhật tồn kho thực tế làm chuẩn mới sau khi kiểm
      ingredient.quantity = totalActualSub;
      await ingredient.save();
    }

    const report = await StaffStockReport.create({
      staffId,
      staffName: staffName || "",
      note: note || "",
      details: reportDetails,
    });

    res.status(201).json({
      success: true,
      message: "Đã lưu báo cáo kiểm kho!",
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/stock/reports
exports.getStaffReports = async (req, res) => {
  try {
    const reports = await StaffStockReport.find()
      .populate("details.ingredientId", "name imageUrl subUnit")
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
