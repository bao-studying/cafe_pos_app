import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderRecord, OrderFilter } from '../../../services/order.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css',
})
export class AdminOrdersComponent implements OnInit {
  orders: OrderRecord[] = [];
  isLoading = true;
  loadError = '';

  // ── Bộ lọc ──
  filterStatus: 'all' | 'pending' | 'confirmed' | 'cancelled' = 'all';
  filterOrderType: 'all' | 'Dine-in' | 'Takeaway' = 'all';
  filterStartDate = '';
  filterEndDate = '';
  searchTerm = '';

  // ── Panel chi tiết (slide-in) ──
  selectedOrder: OrderRecord | null = null;
  isUpdatingStatus = false;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.loadError = '';

    const filter: OrderFilter = {
      status: this.filterStatus,
      orderType: this.filterOrderType,
      startDate: this.filterStartDate || undefined,
      endDate: this.filterEndDate || undefined,
      search: this.searchTerm.trim() || undefined,
    };

    this.orderService.getOrders(filter).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;

        // Tự động chọn đơn đầu tiên nếu có dữ liệu để tránh trống panel bên phải
        if (orders.length > 0 && !this.selectedOrder) {
          this.selectedOrder = orders[0];
        } else if (orders.length === 0) {
          this.selectedOrder = null;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Không tải được danh sách đơn hàng.';
        this.cdr.detectChanges();
      },
    });
  }

  resetFilters() {
    this.filterStatus = 'all';
    this.filterOrderType = 'all';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.searchTerm = '';
    this.loadOrders();
  }

  // ── Panel chi tiết ──
  openDetail(order: OrderRecord) {
    this.selectedOrder = order;
  }

  closeDetail() {
    this.selectedOrder = null;
  }

  get customerName(): string {
    const u = this.selectedOrder?.user;
    if (!u) return '—';
    return typeof u === 'string' ? u : u.name || '—';
  }

  orderUserName(order: OrderRecord): string {
    const u = order.user;
    if (!u) return '—';
    return typeof u === 'string' ? u : u.name || '—';
  }

  statusLabel(status: string): string {
    return status === 'pending' ? 'Chờ xử lý' : status === 'confirmed' ? 'Đã xác nhận' : 'Đã huỷ';
  }

  changeStatus(order: OrderRecord, newStatus: 'pending' | 'confirmed' | 'cancelled') {
    if (order.status === newStatus) return;
    if (newStatus === 'cancelled' && !confirm(`Huỷ đơn ${order.paymentCode}?`)) return;

    this.isUpdatingStatus = true;

    this.orderService.updateOrderStatus(order._id, newStatus).subscribe({
      next: () => {
        order.status = newStatus;
        if (this.selectedOrder && this.selectedOrder._id === order._id) {
          this.selectedOrder = { ...this.selectedOrder, status: newStatus };
        }

        // Không cần tự phát orderUpdated$ ở đây — order.service.ts đã tự làm việc này
        // bên trong updateOrderStatus() (dùng tap()), nên Dashboard sẽ tự làm mới.

        this.isUpdatingStatus = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUpdatingStatus = false;
        alert(err?.error?.message || 'Không thể cập nhật trạng thái đơn hàng.');
        this.cdr.detectChanges();
      },
    });
  }

  get filteredCount(): number {
    return this.orders.length;
  }

  get totalRevenueShown(): number {
    return this.orders
      .filter((o) => o.status === 'confirmed')
      .reduce((s, o) => s + o.totalAmount, 0);
  }
}
