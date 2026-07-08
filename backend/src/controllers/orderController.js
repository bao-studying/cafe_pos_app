const Order = require("../models/Order");
const Product = require("../models/Product");

// Khớp đúng hệ số size đang dùng ở frontend (pos.component.ts -> SIZE_MULTIPLIER)
const SIZE_MULTIPLIER = { S: 0.9, M: 1.0, L: 1.2 };

exports.createOrder = async (req, res) => {
  try {
    const {
      userId,
      orderItems,
      tableNumber,
      orderType,
      discountPercent,
      paymentMethod,
    } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin người tạo đơn (userId)." });
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn ít nhất một món để tạo đơn." });
    }

    // Gom tất cả id cần tra giá: sản phẩm chính + topping (topping cũng là Product)
    const productIds = orderItems.map((item) => item.productId);
    const toppingIds = orderItems.flatMap((item) =>
      Array.isArray(item.toppingIds) ? item.toppingIds : [],
    );
    const allIds = [...new Set([...productIds, ...toppingIds])];

    const products = await Product.find({ _id: { $in: allIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Kiểm tra đủ sản phẩm chính (topping thiếu thì bỏ qua, không chặn đơn)
    const missingMainProduct = productIds.find((id) => !productMap.has(id));
    if (missingMainProduct) {
      return res
        .status(404)
        .json({ message: "Một hoặc nhiều món không tồn tại." });
    }

    let subtotal = 0;
    const items = orderItems.map((item) => {
      const product = productMap.get(item.productId);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const size = ["S", "M", "L"].includes(item.size) ? item.size : "M";
      const multiplier = SIZE_MULTIPLIER[size];

      const toppingIds = Array.isArray(item.toppingIds) ? item.toppingIds : [];
      const toppings = toppingIds
        .map((tid) => productMap.get(tid))
        .filter(Boolean)
        .map((t) => ({ name: t.name, price: t.price }));
      const toppingSum = toppings.reduce((s, t) => s + t.price, 0);

      const base = Math.round(product.price * multiplier);
      const beforeItemDiscount = base + toppingSum;

      const itemDiscountPercent = Math.min(
        100,
        Math.max(0, Number(item.itemDiscountPercent) || 0),
      );
      const unitPrice =
        itemDiscountPercent > 0
          ? Math.round(beforeItemDiscount * (1 - itemDiscountPercent / 100))
          : beforeItemDiscount;

      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      return {
        product: product._id,
        productName: product.name,
        quantity,
        size,
        toppings,
        itemDiscountPercent,
        unitPrice,
        lineTotal,
      };
    });

    const safeDiscountPercent = Math.min(
      100,
      Math.max(0, Number(discountPercent) || 0),
    );
    const discountAmount =
      safeDiscountPercent > 0
        ? Math.round(subtotal * (safeDiscountPercent / 100))
        : 0;
    const totalAmount = subtotal - discountAmount;

    const newOrder = new Order({
      user: userId,
      orderItems: items,
      tableNumber: tableNumber ? `${tableNumber}` : "",
      orderType: orderType || "Dine-in",
      subtotal,
      discountPercent: safeDiscountPercent,
      discountAmount,
      totalAmount,
      paymentMethod: paymentMethod === "transfer" ? "transfer" : "cash",
      paymentCode: `ORDER-${Date.now()}`,
      status: "confirmed", // Thanh toán xong ngay tại quầy nên xác nhận luôn, không cần qua bước duyệt riêng
    });

    await newOrder.save();

    res.status(201).json({
      message: "Tạo đơn hàng thành công!",
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};
