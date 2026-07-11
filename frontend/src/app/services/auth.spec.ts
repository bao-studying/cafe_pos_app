import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  // Gửi yêu cầu đăng ký tài khoản sang BE
  register(userData: any): Observable<any> {
    console.log('📤 REGISTER - Dữ liệu gửi lên:', userData);
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap(
        (response) => {
          console.log('✅ REGISTER - Phản hồi thành công:', response);
        },
        (error) => {
          console.error('❌ REGISTER - Lỗi:', error);
        },
      ),
      catchError((error) => {
        console.error('🔴 REGISTER - Chi tiết lỗi:', error);
        throw error;
      }),
    );
  }

  // Gửi yêu cầu đăng nhập sang BE
  login(credentials: any): Observable<any> {
    console.log('📤 LOGIN - Dữ liệu gửi lên:', credentials);
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(
        (response) => {
          console.log('✅ LOGIN - Phản hồi thành công:', response);
        },
        (error) => {
          console.error('❌ LOGIN - Lỗi:', error);
        },
      ),
      catchError((error) => {
        console.error('🔴 LOGIN - Chi tiết lỗi:', error);
        throw error;
      }),
    );
  }

  // Lưu token vào bộ nhớ trình duyệt (LocalStorage)
  saveToken(token: string): void {
    localStorage.setItem('token', token);
    console.log('💾 Token đã lưu vào localStorage');
  }

  // Lấy token ra khi cần sử dụng ở các chức năng khác
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Xóa token khi Đăng xuất
  clearToken() {
    localStorage.removeItem('token');
    console.log('🗑️ Token đã xóa khỏi localStorage');
  }

  // Hàm kiểm tra xem user đã đăng nhập chưa (Dùng cho AuthGuard sau này nếu cần)
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Đăng xuất
  logout(): void {
    localStorage.removeItem('token');
    console.log('👋 Đã đăng xuất');
  }
}
