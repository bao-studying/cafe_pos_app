import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StockService {
  private apiUrl = `${environment.apiBaseUrl}/api/stock`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // Tự động đính kèm Bearer Token cho mọi request
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // ===== Ingredients =====
  getIngredients(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ingredients`, {
      headers: this.getAuthHeaders(),
    });
  }

  updateIngredientConfig(id: string, config: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ingredients/${id}/config`, config, {
      headers: this.getAuthHeaders(),
    });
  }

  // ===== Recipe =====
  getRecipes(ingredientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recipes/${ingredientId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  saveRecipes(ingredientId: string, items: any[]): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/recipes/${ingredientId}`,
      { items },
      { headers: this.getAuthHeaders() },
    );
  }

  searchProductsForRecipe(q: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/products-search`, {
      params: { q },
      headers: this.getAuthHeaders(),
    });
  }

  // ===== Stock Receipt =====
  createReceipt(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/receipts`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  getReceiptHistory(ingredientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/receipts/${ingredientId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ===== Staff Stock Report =====
  submitStaffReport(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  getStaffReports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports`, {
      headers: this.getAuthHeaders(),
    });
  }
}
