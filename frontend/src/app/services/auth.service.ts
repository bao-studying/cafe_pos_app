import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; // ✅ Fix lỗi thiếu import toán tử tap

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Đồng bộ với API Backend chạy ở port 5000 của bạn
  private apiUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) {}

  /**
   * ═══════════════════════════════════════════════════════════════════
   * 🔐 CHỨC NĂNG XÁC THỰC & ĐĂNG NHẬP / ĐĂNG KÝ
   * ═══════════════════════════════════════════════════════════════════
   */

  // Gửi yêu cầu đăng ký tài khoản sang BE
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  // ✅ GỘP HÀM LOGIN: Vừa gọi API vừa tự động lưu Token + Thông tin User đầy đủ
  login(credentials: { phone: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.success || res.token) {
          // Lưu token và thông tin user xịn từ BE trả về để phân quyền role
          this.saveToken(res.token);
          if (res.user) {
            localStorage.setItem('user', JSON.stringify(res.user));
            // Lưu luôn tên vào cashier_name cho đồng bộ các hàm cũ của Bảo
            this.saveUserName(res.user.name);
          }
        }
      }),
    );
  }

  // Kiểm tra xem trạng thái đã đăng nhập chưa
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ✅ GỘP HÀM CLEAR TOKEN: Dọn sạch bách bộ nhớ khi đăng xuất
  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('cashier_name');
    }
  }

  // Đăng xuất hoàn toàn
  logout(): void {
    this.clearToken();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * 💾 XỬ LÝ LOCALSTORAGE (TOKEN, USERNAME, PROFILE)
   * ═══════════════════════════════════════════════════════════════════
   */

  // Lưu token vào bộ nhớ trình duyệt
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  // Lấy token ra khi cần sử dụng ở các chức năng khác
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Lưu tên Thu ngân / Admin
  saveUserName(name: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cashier_name', name);
    }
  }

  // Lấy tên Thu ngân hiển thị lên giao diện
  getUserName(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cashier_name') || 'Thu ngân';
    }
    return 'Thu ngân';
  }

  // ✅ GỘP HÀM GETUSER: Trả ra thông tin User đầy đủ Object (Fix lỗi TS2339 ở pos.component.ts)
  getUser() {
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
    }
    // Trả về fallback nếu không tìm thấy để giao diện không bị crash
    return {
      name: this.getUserName(),
      role: 'user',
    };
  }

  // Dự phòng lỗi trường hợp component gọi getProfile() thay vì getUser()
  getProfile() {
    return this.getUser();
  }
}
