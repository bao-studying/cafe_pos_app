import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyRevenue {
  _id: string; // 'YYYY-MM-DD'
  dailyRevenue: number;
  totalOrders: number;
}

export interface RevenueReport {
  totalRevenue: number;
  details: DailyRevenue[];
}

export interface HourlyRevenue {
  hour: number; // 0-23
  hourlyRevenue: number;
  totalOrders: number;
}

export interface HourlyRevenueReport {
  totalRevenue: number;
  hourly: HourlyRevenue[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiBaseUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  getRevenue(startDate: string, endDate: string): Observable<RevenueReport> {
    return this.http.get<RevenueReport>(
      `${this.apiUrl}/revenue?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  getHourlyRevenue(date: string): Observable<HourlyRevenueReport> {
    return this.http.get<HourlyRevenueReport>(`${this.apiUrl}/revenue-hourly?date=${date}`);
  }
}
