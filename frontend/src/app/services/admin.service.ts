import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DailyRevenue {
  _id: string; // 'YYYY-MM-DD'
  dailyRevenue: number;
  totalOrders: number;
}

export interface RevenueReport {
  totalRevenue: number;
  details: DailyRevenue[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = 'http://localhost:5000/api/admin';

  constructor(private http: HttpClient) {}

  getRevenue(startDate: string, endDate: string): Observable<RevenueReport> {
    return this.http.get<RevenueReport>(
      `${this.apiUrl}/revenue?startDate=${startDate}&endDate=${endDate}`,
    );
  }
}
