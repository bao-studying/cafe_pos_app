import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = 'http://localhost:5000/api/orders';

  constructor(private http: HttpClient) {}

  createOrder(payload: CreateOrderPayload): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }
}
