const Order = require("../models/Order");
const mongoose = require("mongoose");

exports.getOrderSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;

    const favorites = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "confirmed",
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalQty: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 1 },
    ]);

    if (favorites.length === 0) {
      return res.json({ message: "Chưa có lịch sử đơn hàng." });
    }

    res.status(200).json({
      favoriteProduct: favorites[0]._id,
      totalQuantity: favorites[0].totalQty,
      message: `Khách hàng thường gọi sản phẩm này nhất với ${favorites[0].totalQty} lần.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
