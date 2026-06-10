const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // Ví dụ: Cà phê, Trà, Nước ép
  price: { type: Number, required: true },
  description: String,
  imageUrl: String,
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Product", ProductSchema);
