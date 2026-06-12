import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StockService } from '../stock/stock.service';
import { AuthService } from '../../../services/auth.service';


export interface Ingredient {
  _id: string;
  name: string;
  imageUrl: string;
  category: string;
  quantity: number; // tồn kho theo subUnit
  baseUnit: string;
  subUnit: string;
  conversionRate: number;
  minStockAlert: number;
  costPrice: number;
}

interface RecipeItem {
  productId: string;
  name: string;
  imageUrl: string;
  quantityNeeded: number;
  checked: boolean;
}

@Component({
  selector: 'app-admin-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '././admin-stock.component.html',
  styleUrl: './admin-stock.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStockComponent implements OnInit {
  readonly DEFAULT_IMAGE =
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop';

  ingredients: Ingredient[] = [];
  searchQuery = '';
  filteredIngredients: Ingredient[] = [];

  // ===== Modal: Cấu hình công thức =====
  isRecipeModalOpen = false;
  recipeTargetIngredient: Ingredient | null = null;
  recipeSearchQuery = '';
  recipeSearchResults: RecipeItem[] = [];
  recipeSelectedItems: RecipeItem[] = [];
  private recipeSearchTimer: any;

  // ===== Modal: Nhập kho =====
  isReceiptModalOpen = false;
  receiptTargetIngredient: Ingredient | null = null;
  receiptForm = { quantityImported: 0, totalPrice: 0 };

  // ===== Modal: Cấu hình đơn vị =====
  isUnitConfigOpen = false;
  unitConfigTarget: Ingredient | null = null;
  unitConfigForm = {
    baseUnit: '',
    subUnit: '',
    conversionRate: 1,
    minStockAlert: 0,
  };

  // ===== Modal: Cấu hình nguyên liệu =====
  isIngredientConfigOpen = false;
  ingredientConfigTarget: Ingredient | null = null;
  ingredientConfigForm = {
    baseUnit: '',
    subUnit: '',
    conversionRate: 1,
    minStockAlert: 0,
  };

  constructor(
    private stockService: StockService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadIngredients();
  }

  loadIngredients() {
    this.stockService.getIngredients().subscribe({
      next: (res) => {
        if (res.success) {
          this.ingredients = res.data;
          this.applyFilter();
        }
      },
      error: (err) => console.error('Lỗi tải nguyên liệu:', err),
    });
  }

  applyFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    let result = [...this.ingredients];
    if (q) {
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    // Đẩy nguyên liệu sắp hết hàng lên đầu
    result.sort((a, b) => {
      const aLow = a.quantity <= a.minStockAlert;
      const bLow = b.quantity <= b.minStockAlert;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return 0;
    });
    this.filteredIngredients = result;
    this.cdr.markForCheck();
  }

  isLowStock(ing: Ingredient): boolean {
    return ing.quantity <= (ing.minStockAlert || 0);
  }

  // Hiển thị tồn kho dạng "2 Bịch + 150 g"
  displayStock(ing: Ingredient): string {
    const rate = ing.conversionRate || 1;
    const baseQty = Math.floor(ing.quantity / rate);
    const subQty = Math.round(ing.quantity % rate);
    if (baseQty > 0 && subQty > 0) {
      return `${baseQty} ${ing.baseUnit} + ${subQty} ${ing.subUnit}`;
    }
    if (baseQty > 0) return `${baseQty} ${ing.baseUnit}`;
    return `${subQty} ${ing.subUnit}`;
  }

  trackById(_: number, item: Ingredient) {
    return item._id;
  }

  goBackToPos() {
    this.router.navigate(['/pos']);
  }

  // ============================================================
  // A. POPUP CẤU HÌNH CÔNG THỨC
  // ============================================================
  openRecipeModal(ing: Ingredient) {
    this.recipeTargetIngredient = ing;
    this.recipeSearchQuery = '';
    this.recipeSearchResults = [];
    this.recipeSelectedItems = [];
    this.isRecipeModalOpen = true;
    this.cdr.markForCheck();

    // Load công thức hiện có
    this.stockService.getRecipes(ing._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.recipeSelectedItems = res.data.map((r: any) => ({
            productId: r.productId._id,
            name: r.productId.name,
            imageUrl: r.productId.imageUrl,
            quantityNeeded: r.quantityNeeded,
            checked: true,
          }));
          this.cdr.markForCheck();
        }
      },
    });
  }

  onRecipeSearchInput() {
    clearTimeout(this.recipeSearchTimer);
    this.recipeSearchTimer = setTimeout(() => {
      this.stockService.searchProductsForRecipe(this.recipeSearchQuery).subscribe({
        next: (res) => {
          if (res.success) {
            const selectedIds = new Set(this.recipeSelectedItems.map((i) => i.productId));
            this.recipeSearchResults = res.data
              .filter((p: any) => !selectedIds.has(p._id))
              .map((p: any) => ({
                productId: p._id,
                name: p.name,
                imageUrl: p.imageUrl,
                quantityNeeded: 0,
                checked: false,
              }));
            this.cdr.markForCheck();
          }
        },
      });
    }, 300);
  }

  addProductToRecipe(item: RecipeItem) {
    item.checked = true;
    item.quantityNeeded = item.quantityNeeded || 1;
    this.recipeSelectedItems.push(item);
    this.recipeSearchResults = this.recipeSearchResults.filter(
      (r) => r.productId !== item.productId,
    );
    this.cdr.markForCheck();
  }

  removeProductFromRecipe(item: RecipeItem) {
    this.recipeSelectedItems = this.recipeSelectedItems.filter(
      (r) => r.productId !== item.productId,
    );
    this.cdr.markForCheck();
  }

  saveRecipe() {
    if (!this.recipeTargetIngredient) return;

    const items = this.recipeSelectedItems
      .filter((i) => i.quantityNeeded > 0)
      .map((i) => ({
        productId: i.productId,
        quantityNeeded: i.quantityNeeded,
      }));

    this.stockService.saveRecipes(this.recipeTargetIngredient._id, items).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Đã lưu công thức!');
          this.closeRecipeModal();
        }
      },
      error: (err) => alert(err.error?.message || 'Lỗi lưu công thức!'),
    });
  }

  closeRecipeModal() {
    this.isRecipeModalOpen = false;
    this.recipeTargetIngredient = null;
    this.cdr.markForCheck();
  }

  // ============================================================
  // B. POPUP NHẬP KHO
  // ============================================================
  openReceiptModal(ing: Ingredient) {
    this.receiptTargetIngredient = ing;
    this.receiptForm = { quantityImported: 0, totalPrice: 0 };
    this.isReceiptModalOpen = true;
    this.cdr.markForCheck();
  }

  submitReceipt() {
    if (!this.receiptTargetIngredient) return;
    if (this.receiptForm.quantityImported <= 0) {
      return alert('Vui lòng nhập số lượng nhập kho!');
    }

    const currentUser = this.authService.getUser();

    const payload = {
      ingredientId: this.receiptTargetIngredient._id,
      quantityImported: this.receiptForm.quantityImported,
      totalPrice: this.receiptForm.totalPrice,
      importedBy: currentUser?.id || currentUser?.name || 'unknown',
    };

    this.stockService.createReceipt(payload).subscribe({
      next: (res) => {
        if (res.success) {
          const ing = this.ingredients.find((i) => i._id === this.receiptTargetIngredient!._id);
          if (ing) ing.quantity = res.data.ingredient.quantity;
          this.applyFilter();
          alert('Nhập kho thành công!');
          this.closeReceiptModal();
        }
      },
      error: (err) => alert(err.error?.error || 'Lỗi nhập kho!'),
    });
  }

  closeReceiptModal() {
    this.isReceiptModalOpen = false;
    this.receiptTargetIngredient = null;
    this.cdr.markForCheck();
  }

  // ============================================================
  // C. CẤU HÌNH ĐƠN VỊ (baseUnit / subUnit / conversionRate / minStockAlert)
  // ============================================================
  openUnitConfig(ing: Ingredient) {
    this.unitConfigTarget = ing;
    this.unitConfigForm = {
      baseUnit: ing.baseUnit || 'Bịch',
      subUnit: ing.subUnit || 'g',
      conversionRate: ing.conversionRate || 1,
      minStockAlert: ing.minStockAlert || 0,
    };
    this.isUnitConfigOpen = true;
    this.cdr.markForCheck();
  }

  saveUnitConfig() {
    if (!this.unitConfigTarget) return;
    this.stockService
      .updateIngredientConfig(this.unitConfigTarget._id, this.unitConfigForm)
      .subscribe({
        next: (res) => {
          if (res.success) {
            const ing = this.ingredients.find((i) => i._id === this.unitConfigTarget!._id);
            if (ing) Object.assign(ing, res.data);
            this.applyFilter();
            this.closeUnitConfig();
          }
        },
        error: (err) => alert(err.error?.message || 'Lỗi cập nhật cấu hình!'),
      });
  }

  closeUnitConfig() {
    this.isUnitConfigOpen = false;
    this.unitConfigTarget = null;
    this.cdr.markForCheck();
  }
}
