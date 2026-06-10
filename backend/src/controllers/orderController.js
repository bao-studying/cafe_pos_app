const Order = require("../models/Order");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    const { userId, orderItems, tableNumber, orderType } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn ít nhất một món để tạo đơn." });
    }

    const productIds = orderItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return res.status(404).json({ message: "Một hoặc nhiều món không tồn tại." });
    }

    let totalAmount = 0;
    const items = orderItems.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId);
      const quantity = Number(item.quantity) || 1;
      const lineTotal = product.price * quantity;
      totalAmount += lineTotal;

      return {
        product: product._id,
        quantity,
        size: item.size || "M",
        toppings: Array.isArray(item.toppings) ? item.toppings : [],
      };
    });

    const newOrder = new Order({
      user: userId,
      orderItems: items,
      tableNumber: tableNumber ? `${tableNumber}` : "",
      orderType: orderType || "Dine-in",
      totalAmount,
      paymentCode: `ORDER-${Date.now()}`,
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
