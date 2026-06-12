/**
 * Tính tồn lý thuyết cuối ca và độ lệch (variance) so với tồn thực tế.
 *
 * @param {Object} params
 * @param {number} params.theoreticalStart - Tồn lý thuyết đầu ca (theo subUnit)
 * @param {number} params.imported - Số lượng nhập kho trong ca (đã quy đổi sang subUnit)
 * @param {Array<{ productId: string, qtySold: number }>} params.soldItems - Sản phẩm đã bán trong ca
 * @param {Map<string, number>} params.recipeMap - Map productId(string) -> quantityNeeded (subUnit) cho ingredient hiện tại
 * @param {number} params.actualEnd - Tồn thực tế nhân viên kiểm cuối ca (theo subUnit)
 * @returns {{ theoreticalEnd: number, variance: number, variancePercent: number }}
 */
function calculateVariance({
  theoreticalStart = 0,
  imported = 0,
  soldItems = [],
  recipeMap = new Map(),
  actualEnd = 0,
}) {
  // Tổng lượng nguyên liệu đã tiêu hao = Σ (số lượng SP bán * định lượng recipe)
  const consumed = soldItems.reduce((sum, item) => {
    const needed = recipeMap.get(String(item.productId)) || 0;
    return sum + needed * (item.qtySold || 0);
  }, 0);

  const theoreticalEnd = theoreticalStart + imported - consumed;
  const variance = actualEnd - theoreticalEnd; // âm = hao hụt, dương = dư
  const variancePercent =
    theoreticalEnd !== 0 ? (variance / theoreticalEnd) * 100 : 0;

  return {
    theoreticalEnd,
    consumed,
    variance,
    variancePercent: Number(variancePercent.toFixed(2)),
  };
}

module.exports = { calculateVariance };
