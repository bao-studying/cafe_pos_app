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
        quantity: { type: Number, default: 1, min: 1 },
        size: { type: String, enum: ["S", "M", "L"], default: "M" },
        toppings: [String],
      },
    ],
    tableNumber: { type: String, default: "" },
    orderType: {
      type: String,
      enum: ["Dine-in", "Takeaway"],
      default: "Dine-in",
    },
    totalAmount: { type: Number, required: true, default: 0 },
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
