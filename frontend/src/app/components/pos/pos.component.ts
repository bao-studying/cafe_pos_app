import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductService } from '../../services/product.service';
import { OrderService, CreateOrderItemPayload } from '../../services/order.service';
import { HttpClient } from '@angular/common/http';
import { HostListener } from '@angular/core';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  uid: string;
  product: Product;
  quantity: number;
  // Options
  size: 'S' | 'M' | 'L';
  temperature: 'hot' | 'ice' | 'warm';
  sugarPercent: number; // 0 | 25 | 50 | 75 | 100
  toppings: Topping[]; // selected toppings
  itemDiscountPercent: number; // % giảm riêng món này
  note: string;
  // Swipe state (touch)
  swipeOffset: number;
  isDragging: boolean;
  touchStartX: number;
}

export type PaymentMethod = 'cash' | 'transfer';

const SIZE_MULTIPLIER: Record<string, number> = { S: 0.9, M: 1.0, L: 1.2 };

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate(
          '280ms cubic-bezier(0.34,1.56,0.64,1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' })),
      ]),
    ]),
    trigger('fadeScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
      ]),
    ]),
    trigger('modalBackdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('180ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class PosComponent implements OnInit {
  currentUser: any = null;
  isUserMenuOpen = false;
  // ── Products ──────────────────────────────────────────
  searchQuery = '';
  selectedCategory = '';
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];

  // ── Toppings (load từ API) ────────────────────────────
  availableToppings: Topping[] = [];

  // ── Order ─────────────────────────────────────────────
  orderItems: OrderItem[] = [];
  tableNumber = '';
  orderType: 'Dine-in' | 'Takeaway' = 'Dine-in';

  // ── Discount toàn đơn ─────────────────────────────────
  discountPercent: number | null = null;

  // ── Payment ───────────────────────────────────────────
  paymentMethod: PaymentMethod = 'cash';
  cashReceived: number | null = null;
  cashReceivedRaw: number | null = null;
  // ── QR ────────────────────────────────────────────────
  readonly BANK_ID = 'MB';
  readonly ACCOUNT_NO = '0123456789';
  readonly ACCOUNT_NAME = 'QUAN CA PHE';

  // ── Drag drop ─────────────────────────────────────────
  isDraggingProduct = false;
  isDraggingCartItem = false;
  draggedProduct: Product | null = null;
  isOverCart = false;
  isOverTrash = false;
  // Biến hiện sản phẩm
  isLoading = true;

  // ── Modal ─────────────────────────────────────────────
  showPaymentModal = false;
  showSuccessModal = false;
  orderNumber = 0;
  // ── Trạng thái gửi đơn lên server ─────────────────────
  isSubmittingOrder = false;
  orderSubmitError = '';

  // ── Item note popup ───────────────────────────────────
  showItemPopup = false;
  editingItem: OrderItem | null = null;
  // Draft state (áp dụng khi bấm "Xác nhận")
  draft: {
    size: 'S' | 'M' | 'L';
    temperature: 'hot' | 'ice' | 'warm';
    sugarPercent: number;
    toppings: Topping[];
    itemDiscountPercent: number;
    note: string;
  } = this.emptyDraft();

  readonly SUGAR_OPTIONS = [0, 25, 50, 75, 100];
  readonly SIZE_LABELS: Record<string, string> = { S: 'S (−10%)', M: 'M', L: 'L (+20%)' };
  readonly TEMP_LABELS: Record<string, string> = { hot: '🔥 Nóng', ice: '🧊 Đá', warm: '☀️ Ấm' };

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private orderService: OrderService,
    private http: HttpClient,
    public router: Router,
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();

    this.loadProducts();
    this.loadToppings();
  }

  private loadProducts() {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (response: any) => {
        let arr: any[] = [];
        if (Array.isArray(response)) arr = response;
        else if (Array.isArray(response?.data)) arr = response.data;
        else if (Array.isArray(response?.products)) arr = response.products;
        else {
          console.error('API products sai format', response);
          this.isLoading = false;
          return;
        }

        this.allProducts = arr
          .map((p) => this.normalizeProduct(p))
          .filter((p) => p.category !== 'Nguyên liệu');
        this.filteredProducts = [...this.allProducts];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Không tải được sản phẩm:', err);
        this.isLoading = false;
      },
    });
  }

  private normalizeProduct(product: any): Product {
    return {
      id: product.id ?? product._id ?? String(product._id ?? ''),
      name: product.name ?? '',
      category: product.category ?? '',
      description: product.description ?? '',
      price: Number(product.price ?? 0),
      imageUrl: product.imageUrl ?? '',
    };
  }

  private loadToppings() {
    this.productService.getProducts().subscribe({
      next: (res: any) => {
        let arr: any[] = [];
        if (Array.isArray(res)) arr = res;
        else if (Array.isArray(res?.data)) arr = res.data;

        this.availableToppings = arr
          .filter((p) => p.category === 'Topping' && p.isActive !== false)
          .map((p) => ({
            id: p._id ?? p.id,
            name: p.name,
            price: Number(p.price ?? 0),
          }));
      },
      error: () => {
        this.availableToppings = [];
      },
    });
  }

  // ── Computed price cho 1 OrderItem ───────────────────
  itemUnitPrice(item: OrderItem): number {
    const base = Math.round(item.product.price * SIZE_MULTIPLIER[item.size]);
    const toppingSum = item.toppings.reduce((s, t) => s + t.price, 0);
    const beforeDiscount = base + toppingSum;
    if (item.itemDiscountPercent > 0) {
      return Math.round(beforeDiscount * (1 - item.itemDiscountPercent / 100));
    }
    return beforeDiscount;
  }

  itemLineTotal(item: OrderItem): number {
    return this.itemUnitPrice(item) * item.quantity;
  }

  // ── Getters ───────────────────────────────────────────
  get subtotal(): number {
    return this.orderItems.reduce((s, item) => s + this.itemLineTotal(item), 0);
  }

  get discountAmount(): number {
    if (!this.discountPercent || this.discountPercent <= 0) return 0;
    return Math.round(this.subtotal * (this.discountPercent / 100));
  }

  get orderTotal(): number {
    return this.subtotal - this.discountAmount;
  }

  get change(): number {
    if (!this.cashReceived) return 0;
    return Math.max(0, this.cashReceived - this.orderTotal);
  }

  get qrUrl(): string {
    const desc = encodeURIComponent(`Thanh toan don #${this.orderNumber || 'POS'}`);
    return `https://img.vietqr.io/image/${this.BANK_ID}-${this.ACCOUNT_NO}-compact2.png?amount=${this.orderTotal}&addInfo=${desc}&accountName=${encodeURIComponent(this.ACCOUNT_NAME)}`;
  }

  get userName(): string {
    return this.currentUser?.name ?? this.currentUser?.fullName ?? 'Thu ngân';
  }

  get cartItemCount(): number {
    return this.orderItems.reduce((s, i) => s + i.quantity, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-user-dropdown')) {
      this.isUserMenuOpen = false;
    }
  }

  // ── Search — realtime ─────────────────────────────────
  // Gọi trực tiếp từ (input) event, không cần debounce thêm
  filterProducts(query: string = this.searchQuery) {
    this.searchQuery = query; // ← thêm dòng này để giữ sync
    const q = query.toLowerCase().trim();
    this.filteredProducts = this.allProducts.filter((p) => {
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchCat = !this.selectedCategory || p.category === this.selectedCategory;
      return matchSearch && matchCat;
    });
  }

  selectType(category: string) {
    this.selectedCategory = category;
    this.filterProducts();
  }

  trackById(_: number, item: Product) {
    return item.id;
  }
  trackByOrderItem(_: number, item: OrderItem) {
    return item.uid;
  }
  trackByToppingId(_: number, t: Topping) {
    return t.id;
  }

  // ── Add to order ──────────────────────────────────────
  addToOrder(product: Product) {
    const idx = this.orderItems.findIndex((i) => i.product.id === product.id);
    if (idx !== -1) {
      this.orderItems[idx] = {
        ...this.orderItems[idx],
        quantity: this.orderItems[idx].quantity + 1,
      };
      this.orderItems = [...this.orderItems];
    } else {
      this.orderItems = [...this.orderItems, this.makeOrderItem(product)];
    }
  }

  private makeOrderItem(product: Product): OrderItem {
    return {
      uid: crypto.randomUUID(),
      product,
      quantity: 1,
      size: 'M',
      temperature: 'ice',
      sugarPercent: 100,
      toppings: [],
      itemDiscountPercent: 0,
      note: '',
      swipeOffset: 0,
      isDragging: false,
      touchStartX: 0,
    };
  }

  changeQuantity(item: OrderItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeItem(item);
      return;
    }
    const idx = this.orderItems.indexOf(item);
    if (idx !== -1) {
      this.orderItems[idx] = { ...item, quantity: newQty };
      this.orderItems = [...this.orderItems];
    }
  }

  removeItem(item: OrderItem) {
    this.orderItems = this.orderItems.filter((i) => i.uid !== item.uid);
  }

  // ── Item Popup ────────────────────────────────────────
  openItemPopup(item: OrderItem) {
    this.editingItem = item;
    this.draft = {
      size: item.size,
      temperature: item.temperature,
      sugarPercent: item.sugarPercent,
      toppings: [...item.toppings],
      itemDiscountPercent: item.itemDiscountPercent,
      note: item.note,
    };
    this.showItemPopup = true;
  }

  closeItemPopup() {
    this.showItemPopup = false;
    this.editingItem = null;
  }

  confirmItemPopup() {
    if (!this.editingItem) return;
    const idx = this.orderItems.findIndex((i) => i.uid === this.editingItem!.uid);
    if (idx === -1) return;
    this.orderItems[idx] = {
      ...this.orderItems[idx],
      size: this.draft.size,
      temperature: this.draft.temperature,
      sugarPercent: this.draft.sugarPercent,
      toppings: [...this.draft.toppings],
      itemDiscountPercent: this.draft.itemDiscountPercent,
      note: this.draft.note,
    };
    this.orderItems = [...this.orderItems];
    this.closeItemPopup();
  }

  isDraftToppingSelected(topping: Topping): boolean {
    return this.draft.toppings.some((t) => t.id === topping.id);
  }

  toggleDraftTopping(topping: Topping) {
    const idx = this.draft.toppings.findIndex((t) => t.id === topping.id);
    if (idx >= 0) this.draft.toppings.splice(idx, 1);
    else this.draft.toppings.push(topping);
  }

  /** Tính giá preview trong popup dựa trên draft */
  get draftPreviewPrice(): number {
    if (!this.editingItem) return 0;
    const base = Math.round(this.editingItem.product.price * SIZE_MULTIPLIER[this.draft.size]);
    const toppingSum = this.draft.toppings.reduce((s, t) => s + t.price, 0);
    const beforeDiscount = base + toppingSum;
    if (this.draft.itemDiscountPercent > 0) {
      return Math.round(beforeDiscount * (1 - this.draft.itemDiscountPercent / 100));
    }
    return beforeDiscount;
  }

  private emptyDraft() {
    return {
      size: 'M' as const,
      temperature: 'ice' as const,
      sugarPercent: 100,
      toppings: [] as Topping[],
      itemDiscountPercent: 0,
      note: '',
    };
  }

  // ── Swipe to delete ───────────────────────────────────
  onTouchStart(event: TouchEvent, item: OrderItem) {
    item.touchStartX = event.touches[0].clientX;
    item.isDragging = true;
  }

  onTouchMove(event: TouchEvent, item: OrderItem) {
    if (!item.isDragging) return;
    const dx = event.touches[0].clientX - item.touchStartX;
    item.swipeOffset = Math.min(0, dx);
  }

  onTouchEnd(item: OrderItem) {
    item.isDragging = false;
    if (item.swipeOffset < -80) this.removeItem(item);
    else item.swipeOffset = 0;
  }

  // ── CDK Drag ──────────────────────────────────────────
  // FIX: dùng event.item.data trực tiếp thay vì lưu state draggedProduct
  onProductDragStarted(product: Product) {
    this.isDraggingProduct = true;
    this.isDraggingCartItem = false;
    this.draggedProduct = product;
  }

  onCartItemDragStarted(_item: OrderItem) {
    this.isDraggingCartItem = true;
    this.isDraggingProduct = false;
  }

  onProductDragEnded() {
    this.isDraggingProduct = false;
    this.isDraggingCartItem = false;
    this.isOverCart = false;
    this.isOverTrash = false;
  }

  onCartDragEnter() {
    this.isOverCart = true;
  }
  onCartDragLeave() {
    this.isOverCart = false;
  }

  onDropIntoCart(event: CdkDragDrop<any, any, any>) {
    if (event.previousContainer !== event.container) {
      // FIX: lấy data trực tiếp từ event thay vì this.draggedProduct
      const product: Product = this.draggedProduct ?? event.item.data;
      if (product && product.id) {
        this.addToOrder(product);
      }
    }
    this.draggedProduct = null;
    this.isOverCart = false;
    this.isDraggingProduct = false;
  }

  onTrashDragEnter() {
    this.isOverTrash = true;
  }
  onTrashDragLeave() {
    this.isOverTrash = false;
  }

  onDropToTrash(event: CdkDragDrop<any, any, any>) {
    if (event.previousContainer !== event.container) {
      const candidate = event.item.data;
      if (candidate && 'product' in candidate) {
        this.removeItem(candidate as OrderItem);
      }
    }
    this.isOverTrash = false;
    this.isDraggingCartItem = false;
  }

  onDropReorder(event: CdkDragDrop<OrderItem[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.orderItems, event.previousIndex, event.currentIndex);
    }
  }

  // ── Discount ──────────────────────────────────────────
  clampDiscount() {
    if (this.discountPercent !== null) {
      if (this.discountPercent < 0) this.discountPercent = 0;
      if (this.discountPercent > 100) this.discountPercent = 100;
    }
  }

  // ── Payment ───────────────────────────────────────────
  openPaymentModal() {
    if (!this.orderItems.length) return;
    this.cashReceived = null;
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
  }

  confirmPayment() {
    if (
      this.paymentMethod === 'cash' &&
      (!this.cashReceived || this.cashReceived < this.orderTotal)
    )
      return;

    if (this.isSubmittingOrder) return;

    const userId = this.currentUser?.id;
    if (!userId) {
      this.orderSubmitError = 'Không xác định được tài khoản thu ngân, vui lòng đăng nhập lại.';
      return;
    }

    const payload = {
      userId,
      orderItems: this.orderItems.map(
        (item): CreateOrderItemPayload => ({
          productId: item.product.id,
          quantity: item.quantity,
          size: item.size,
          toppingIds: item.toppings.map((t) => t.id),
          itemDiscountPercent: item.itemDiscountPercent || 0,
        }),
      ),
      tableNumber: this.tableNumber,
      orderType: this.orderType,
      discountPercent: this.discountPercent || 0,
      paymentMethod: this.paymentMethod,
    };

    this.isSubmittingOrder = true;
    this.orderSubmitError = '';

    this.orderService.createOrder(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingOrder = false;
        // Lấy mã đơn thật từ server (VD: ORDER-1720000000000) thay vì random ở client
        const code: string = res?.order?.paymentCode || '';
        const numericPart = code.replace(/\D/g, '').slice(-4);
        this.orderNumber = numericPart
          ? Number(numericPart)
          : Math.floor(1000 + Math.random() * 9000);
        this.showPaymentModal = false;
        this.showSuccessModal = true;
      },
      error: (err) => {
        this.isSubmittingOrder = false;
        this.orderSubmitError = err?.error?.message || 'Không thể tạo đơn hàng, vui lòng thử lại.';
      },
    });
  }

  printBill() {
    window.print();
  }

  closeSuccessAndReset() {
    this.showSuccessModal = false;
    this.orderItems = [];
    this.tableNumber = '';
    this.orderType = 'Dine-in';
    this.discountPercent = null;
    this.cashReceived = null;
    this.paymentMethod = 'cash';
    this.orderSubmitError = '';
  }

  logout() {
    this.authService.clearToken();
    this.router.navigate(['/login']);
  }

  onCashInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    this.cashReceived = raw ? Number(raw) : null;
    // Đặt con trỏ về cuối sau khi format
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = formatted;
  }

  appendTripleZero(input: HTMLInputElement) {
    const raw = (input.value.replace(/\D/g, '') || '0') + '000';
    this.cashReceived = Number(raw);
    input.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
