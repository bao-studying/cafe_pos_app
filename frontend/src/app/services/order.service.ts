import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
  size: 'S' | 'M' | 'L';
  toppingIds: string[];
  itemDiscountPercent: number;
}

export interface CreateOrderPayload {
  userId: string;
  orderItems: CreateOrderItemPayload[];
  tableNumber: string;
  orderType: 'Dine-in' | 'Takeaway';
  discountPercent: number;
  paymentMethod: 'cash' | 'transfer';
}

export interface OrderItemRecord {
  product: string;
  productName: string;
  quantity: number;
  size: 'S' | 'M' | 'L';
  toppings: { name: string; price: number }[];
  itemDiscountPercent: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderRecord {
  _id: string;
  user: { _id: string; name: string } | string;
  orderItems: OrderItemRecord[];
  tableNumber: string;
  orderType: 'Dine-in' | 'Takeaway';
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'transfer';
  paymentCode: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilter {
  status?: 'all' | 'pending' | 'confirmed' | 'cancelled';
  orderType?: 'all' | 'Dine-in' | 'Takeaway';
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${environment.apiBaseUrl}/api/orders`;

  // Phát sự kiện mỗi khi có đơn được tạo/đổi trạng thái, để các trang khác
  // (VD: Dashboard doanh thu) tự động làm mới dữ liệu mà không cần F5.
  // Dùng BehaviorSubject(0) để có giá trị phát ngay lúc subscribe (bị bỏ qua bằng skip(1)
  // ở nơi lắng nghe), các lần tăng số tiếp theo mới là cập nhật thật.
  private orderUpdatedSource = new BehaviorSubject<number>(0);
  orderUpdated$ = this.orderUpdatedSource.asObservable();

  constructor(private http: HttpClient) {}

  private notifyOrderUpdated() {
    this.orderUpdatedSource.next(this.orderUpdatedSource.value + 1);
  }

  createOrder(payload: CreateOrderPayload): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload).pipe(tap(() => this.notifyOrderUpdated()));
  }

  // ── Dùng cho màn Quản lý đơn hàng (admin) ──
  getOrders(filter: OrderFilter = {}): Observable<OrderRecord[]> {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return this.http.get<OrderRecord[]>(`${this.apiUrl}${query ? '?' + query : ''}`);
  }

  getOrderById(id: string): Observable<OrderRecord> {
    return this.http.get<OrderRecord>(`${this.apiUrl}/${id}`);
  }

  updateOrderStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled'): Observable<any> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(tap(() => this.notifyOrderUpdated()));
  }
}
