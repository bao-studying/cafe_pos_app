const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: { type: String, default: "" }, // snapshot tên món tại thời điểm đặt
        quantity: { type: Number, default: 1, min: 1 },
        size: { type: String, enum: ["S", "M", "L"], default: "M" },
        toppings: [
          {
            name: { type: String, required: true },
            price: { type: Number, required: true, default: 0 }, // snapshot giá topping
          },
        ],
        itemDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
        unitPrice: { type: Number, required: true, default: 0 }, // giá 1 phần sau size + topping + giảm giá riêng món
        lineTotal: { type: Number, required: true, default: 0 }, // unitPrice * quantity
      },
    ],
    tableNumber: { type: String, default: "" },
    orderType: {
      type: String,
      enum: ["Dine-in", "Takeaway"],
      default: "Dine-in",
    },
    subtotal: { type: Number, required: true, default: 0 }, // tổng trước giảm giá toàn đơn
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 }, // subtotal - discountAmount
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer"],
      default: "cash",
    },
    paymentCode: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", OrderSchema);
