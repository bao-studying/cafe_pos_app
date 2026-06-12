const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    }, // Món bán ra (category !== 'Nguyên liệu')
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    }, // Nguyên liệu (category === 'Nguyên liệu')
    quantityNeeded: { type: Number, required: true, min: 0 }, // Lượng tiêu hao tính theo subUnit của ingredient / 1 sản phẩm
  },
  { timestamps: true },
);

RecipeSchema.index({ productId: 1, ingredientId: 1 }, { unique: true });

module.exports = mongoose.model("Recipe", RecipeSchema);
