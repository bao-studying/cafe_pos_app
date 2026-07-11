import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CafeTable {
  _id: string;
  label: string;
  x: number;
  y: number;
  shape: 'square' | 'round';
  seats: number;
}

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private apiUrl = `${environment.apiBaseUrl}/api/tables`;

  constructor(private http: HttpClient) {}

  getTables(): Observable<CafeTable[]> {
    return this.http.get<CafeTable[]>(this.apiUrl);
  }

  createTable(data: Partial<CafeTable>): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateTable(id: string, data: Partial<CafeTable>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteTable(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
