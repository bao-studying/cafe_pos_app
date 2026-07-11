import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiBaseUrl}/api/products`;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  addProduct(productData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, productData);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
  // Thêm quyền admin để không bị filter mất danh mục Nguyên liệu
  getProductsAdmin(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?isAdmin=true`);
  }

  // Cập nhật thông tin món ăn/nguyên liệu
  updateProduct(id: string, productData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, productData);
  }
}
