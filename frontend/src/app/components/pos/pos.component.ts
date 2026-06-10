import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { ProductService } from '../../services/product.service';  
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  size: string;
  toppings: string[];
  // Swipe state
  swipeOffset: number;
  isDragging: boolean;
  touchStartX: number;
}

export type PaymentMethod = 'cash' | 'transfer';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate(
          '300ms cubic-bezier(0.34,1.56,0.64,1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' })),
      ]),
    ]),
    trigger('fadeScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
      ]),
    ]),
    trigger('modalBackdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class PosComponent implements OnInit {
  // ── User ──────────────────────────────────────────────
  currentUser: any = null;

  // ── Products ──────────────────────────────────────────
  searchQuery = '';
  selectedCategory = '';

  allProducts: Product[] = [
    {
      id: '1',
      name: 'Cà phê sữa đá',
      category: 'Cà phê',
      description: 'Đậm vị, thêm đá lạnh, ngọt vừa phải.',
      price: 32000,
      imageUrl:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: '2',
      name: 'Trà sữa trân châu',
      category: 'Trà',
      description: 'Trà sữa béo ngậy với trân châu mềm dai.',
      price: 39000,
      imageUrl:
        'https://images.unsplash.com/photo-1510627498534-cf7e9002facc?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: '3',
      name: 'Nước ép cam mật ong',
      category: 'Nước ép',
      description: 'Tươi mát, thanh ngọt tự nhiên.',
      price: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1542444459-db242f4e6f56?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: '4',
      name: 'Cà phê đen đá',
      category: 'Cà phê',
      description: 'Sự lựa chọn chuẩn vị cho người thích đắng.',
      price: 28000,
      imageUrl:
        'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: '5',
      name: 'Trà chanh mật ong',
      category: 'Trà',
      description: 'Sảng khoái với chanh tươi và mật ong thiên nhiên.',
      price: 35000,
      imageUrl:
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: '6',
      name: 'Bạc xỉu',
      category: 'Cà phê',
      description: 'Nhiều sữa ít cà phê, thơm béo dịu nhẹ.',
      price: 30000,
      imageUrl:
        'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=800&auto=format&fit=crop',
    },
  ];

  filteredProducts: Product[] = [];

  // ── Order ─────────────────────────────────────────────
  orderItems: OrderItem[] = [];
  tableNumber = '';
  orderType: 'Dine-in' | 'Takeaway' = 'Dine-in';

  // ── Discount ──────────────────────────────────────────
  discountPercent: number | null = null;

  // ── Payment ───────────────────────────────────────────
  paymentMethod: PaymentMethod = 'cash';
  cashReceived: number | null = null;

  // ── QR ────────────────────────────────────────────────
  // VietQR - thay bằng thông tin thật của quán
  readonly BANK_ID = 'MB'; // Mã ngân hàng VietQR
  readonly ACCOUNT_NO = '0123456789';
  readonly ACCOUNT_NAME = 'QUAN CA PHE';

  // ── Drag drop ─────────────────────────────────────────
  isDraggingProduct = false;
  isDraggingCartItem = false;
  isOverCart = false;
  isOverTrash = false;
  draggedProduct: Product | null = null;
  draggedCartItem: OrderItem | null = null;

  // ── Modal ─────────────────────────────────────────────
  showPaymentModal = false;
  showSuccessModal = false;
  orderNumber = 0;

  // ── Drop zone (cart) ──────────────────────────────────
  cartDropItems: Product[] = []; // dummy list cho CDK drop zone
  productDragList: Product[] = [];

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (response: any) => {
        // 1. Kiểm tra xem nếu response là mảng thì dùng luôn,
        // nếu response là Object chứa thuộc tính 'data' hoặc 'products' thì lấy cái đó.
        let productArray: Product[] = [];

        if (Array.isArray(response)) {
          productArray = response;
        } else if (response && Array.isArray(response.data)) {
          productArray = response.data; // Trường hợp BE trả về { data: [...] }
        } else if (response && Array.isArray(response.products)) {
          productArray = response.products; // Trường hợp BE trả về { products: [...] }
        } else {
          console.error('Dữ liệu API trả về không đúng định dạng mảng:', response);
          return;
        }

        // 🔥 LOGIC CỐT LÕI: Bây giờ lọc trên mảng chuẩn chắc chắn không lỗi
        this.allProducts = productArray.filter((p) => p.category !== 'Nguyên liệu');

        // Cập nhật lại các mảng bổ trợ cho giao diện POS
        this.filteredProducts = [...this.allProducts];
        this.productDragList = [...this.allProducts];

        // Ép Angular render lại giao diện
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Không thể tải danh sách sản phẩm từ DB:', err);
      },
    });
  }

  // ── Getters ───────────────────────────────────────────
  get subtotal(): number {
    return this.orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
    const amount = this.orderTotal;
    const desc = encodeURIComponent(`Thanh toan don #${this.orderNumber || 'POS'}`);
    return `https://img.vietqr.io/image/${this.BANK_ID}-${this.ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${desc}&accountName=${encodeURIComponent(this.ACCOUNT_NAME)}`;
  }

  get userName(): string {
    if (this.currentUser?.name) return this.currentUser.name;
    if (this.currentUser?.fullName) return this.currentUser.fullName;
    return 'Thu ngân';
  }

  get cartItemCount(): number {
    return this.orderItems.reduce((sum, i) => sum + i.quantity, 0);
  }

  // ── Product filter ────────────────────────────────────
  filterProducts() {
    this.filteredProducts = this.allProducts.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCat = !this.selectedCategory || p.category === this.selectedCategory;
      return matchSearch && matchCat;
    });
    this.cdr.markForCheck();
  }

  selectType(category: string) {
    this.selectedCategory = category;
    this.filterProducts();
  }

  trackById(_: number, item: Product) {
    return item.id;
  }
  trackByProductId(_: number, item: OrderItem) {
    return item.product.id;
  }

  // ── Add to order ──────────────────────────────────────
  addToOrder(product: Product) {
    const existing = this.orderItems.find((i) => i.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.orderItems.push({
        product,
        quantity: 1,
        size: 'M',
        toppings: [],
        swipeOffset: 0,
        isDragging: false,
        touchStartX: 0,
      });
    }
    this.cdr.markForCheck();
  }

  changeQuantity(item: OrderItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeItem(item);
    } else {
      item.quantity = newQty;
    }
    this.cdr.markForCheck();
  }

  removeItem(item: OrderItem) {
    this.orderItems = this.orderItems.filter((i) => i.product.id !== item.product.id);
    this.cdr.markForCheck();
  }

  // ── Swipe to delete ───────────────────────────────────
  onTouchStart(event: TouchEvent, item: OrderItem) {
    item.touchStartX = event.touches[0].clientX;
    item.isDragging = true;
  }

  onTouchMove(event: TouchEvent, item: OrderItem) {
    if (!item.isDragging) return;
    const dx = event.touches[0].clientX - item.touchStartX;
    item.swipeOffset = Math.min(0, dx); // chỉ trái
    this.cdr.markForCheck();
  }

  onTouchEnd(item: OrderItem) {
    item.isDragging = false;
    if (item.swipeOffset < -80) {
      this.removeItem(item);
    } else {
      item.swipeOffset = 0;
    }
    this.cdr.markForCheck();
  }

  // ── CDK Drag: kéo product card vào giỏ ───────────────
  onProductDragStarted(product: Product) {
    this.isDraggingProduct = true;
    this.draggedProduct = product;
    this.isDraggingCartItem = false;
    this.cdr.markForCheck();
  }

  onCartItemDragStarted(item: OrderItem) {
    this.isDraggingCartItem = true;
    this.draggedCartItem = item;
    this.isDraggingProduct = false;
    this.cdr.markForCheck();
  }

  onProductDragEnded() {
    this.isDraggingProduct = false;
    this.isDraggingCartItem = false;
    this.draggedProduct = null;
    this.draggedCartItem = null;
    this.isOverCart = false;
    this.isOverTrash = false;
    this.cdr.markForCheck();
  }

  onCartDragEnter() {
    this.isOverCart = true;
    this.cdr.markForCheck();
  }

  onCartDragLeave() {
    this.isOverCart = false;
    this.cdr.markForCheck();
  }

  onDropIntoCart(event: CdkDragDrop<any, any, any>) {
    if (event.previousContainer !== event.container) {
      const product = event.previousContainer.data[event.previousIndex] as Product;
      if (product) this.addToOrder(product);
    }
    this.isOverCart = false;
    this.isDraggingProduct = false;
    this.cdr.markForCheck();
  }

  onTrashDragEnter() {
    this.isOverTrash = true;
    this.cdr.markForCheck();
  }

  onTrashDragLeave() {
    this.isOverTrash = false;
    this.cdr.markForCheck();
  }

  onDropToTrash(event: CdkDragDrop<any, any, any>) {
    if (event.previousContainer !== event.container) {
      const candidate = event.previousContainer.data[event.previousIndex];
      if (candidate && 'product' in candidate) {
        this.removeItem(candidate as OrderItem);
      }
    }
    this.isOverTrash = false;
    this.isDraggingCartItem = false;
    this.cdr.markForCheck();
  }

  // Kéo sắp xếp lại trong giỏ
  onDropReorder(event: CdkDragDrop<OrderItem[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.orderItems, event.previousIndex, event.currentIndex);
      this.cdr.markForCheck();
    }
  }

  // ── Discount ──────────────────────────────────────────
  clampDiscount() {
    if (this.discountPercent !== null) {
      if (this.discountPercent < 0) this.discountPercent = 0;
      if (this.discountPercent > 100) this.discountPercent = 100;
    }
    this.cdr.markForCheck();
  }

  // ── Payment modal ─────────────────────────────────────
  openPaymentModal() {
    if (this.orderItems.length === 0) return;
    this.cashReceived = null;
    this.showPaymentModal = true;
    this.cdr.markForCheck();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.cdr.markForCheck();
  }

  confirmPayment() {
    if (
      this.paymentMethod === 'cash' &&
      (!this.cashReceived || this.cashReceived < this.orderTotal)
    )
      return;
    this.orderNumber = Math.floor(1000 + Math.random() * 9000);
    this.showPaymentModal = false;
    this.showSuccessModal = true;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  // ── Logout ────────────────────────────────────────────
  logout() {
    this.authService.clearToken();
    this.router.navigate(['/login']);
  }
}
