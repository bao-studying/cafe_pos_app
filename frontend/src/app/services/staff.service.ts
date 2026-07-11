import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StaffUser {
  _id: string;
  name: string;
  phone: string;
  role: 'user' | 'staff' | 'admin';
  hourlyRate: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ShiftTemplate {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ShiftRegistration {
  _id: string;
  staffId: StaffUser | string;
  shiftTemplateId: ShiftTemplate | string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface AttendanceRecord {
  _id: string;
  staffId: StaffUser | string;
  checkInTime: string;
  checkOutTime: string | null;
  actualHours: number;
  status: 'checked-in' | 'checked-out';
}

export interface Payroll {
  _id: string;
  staffId: string;
  month: number;
  year: number;
  totalHours: number;
  hourlyRateSnapshot: number;
  totalSalary: number;
  status: 'draft' | 'finalized';
}

// ── Bảng lịch làm việc — NHÂN VIÊN (ẩn danh) ──
export interface ScheduleBoardCell {
  dayOfWeek: number;
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
  isFull: boolean;
  myStatus: 'pending' | 'approved' | null;
  myRegistrationId: string | null;
}

export interface ScheduleBoard {
  weekStart: string;
  weekEnd: string;
  cells: ScheduleBoardCell[];
}

// ── Bảng lịch làm việc — ADMIN (đầy đủ, kèm tên) ──
export interface AdminBoardCell {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  capacity: number; // 0 = chưa mở đăng ký
  configId: string | null;
  registeredCount: number;
  pendingCount: number;
  approvedCount: number;
  approvedNames: string[];
}

export interface AdminBoardRow {
  shiftTemplateId: string;
  name: string;
  startTime: string;
  endTime: string;
  cells: AdminBoardCell[]; // luôn đủ 7 phần tử, theo thứ tự dayOfWeek 1→7
}

export interface AdminBoard {
  weekStart: string;
  weekEnd: string;
  rows: AdminBoardRow[];
}

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private baseUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  /** ── Nhân viên ── */
  getStaffList(role: string = 'staff'): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(`${this.baseUrl}/users`, { params: { role } });
  }

  createStaff(data: {
    name: string;
    phone: string;
    password: string;
    hourlyRate: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, data);
  }

  updateStaff(id: string, data: Partial<StaffUser>): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/users/${id}`, data);
  }

  updateStaffStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/users/${id}/status`, { isActive });
  }

  /** ── Ca mẫu ── */
  getShiftTemplates(): Observable<ShiftTemplate[]> {
    return this.http.get<ShiftTemplate[]>(`${this.baseUrl}/shifts/templates`);
  }

  createShiftTemplate(data: Partial<ShiftTemplate>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shifts/templates`, data);
  }

  updateShiftTemplate(id: string, data: Partial<ShiftTemplate>): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/shifts/templates/${id}`, data);
  }

  deleteShiftTemplate(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/shifts/templates/${id}`);
  }

  /** ── Đăng ký ca ── */
  registerShift(data: { staffId: string; shiftTemplateId: string; date: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shifts/register`, data);
  }

  getShiftRegistrations(
    params: { status?: string; staffId?: string; shiftTemplateId?: string; date?: string } = {},
  ): Observable<ShiftRegistration[]> {
    return this.http.get<ShiftRegistration[]>(`${this.baseUrl}/shifts/registrations`, {
      params: params as any,
    });
  }

  updateShiftRegistration(
    id: string,
    status: 'approved' | 'rejected',
    note?: string,
  ): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/shifts/registrations/${id}`, { status, note });
  }

  /** ── Chấm công ── */
  checkIn(staffId: string, shiftRegistrationId?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/check-in`, {
      staffId,
      shiftRegistrationId,
    });
  }

  checkOut(staffId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/attendance/check-out`, { staffId });
  }

  getAttendance(
    params: { staffId?: string; month?: number; year?: number } = {},
  ): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/attendance`, {
      params: params as any,
    });
  }

  /** ── Lương ── */
  generatePayroll(month: number, year: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payroll/generate`, null, {
      params: { month, year } as any,
    });
  }

  getPayrollHistory(staffId: string): Observable<Payroll[]> {
    return this.http.get<Payroll[]>(`${this.baseUrl}/payroll/${staffId}`);
  }

  getPayrollEstimate(staffId: string, month?: number, year?: number): Observable<any> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    return this.http.get<any>(`${this.baseUrl}/payroll/${staffId}/estimate`, { params });
  }

  /** ── Log truy cập máy POS ── */
  posSessionLogin(staffId: string, deviceInfo?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pos/session-login`, { staffId, deviceInfo });
  }

  getPosSessionLogs(staffId?: string): Observable<any[]> {
    const params: any = {};
    if (staffId) params.staffId = staffId;
    return this.http.get<any[]>(`${this.baseUrl}/pos/session-logs`, { params });
  }

  /** ── Bảng lịch làm việc — Nhân viên (ẩn danh) ── */
  // weekStart PHẢI là ngày Thứ 2 (YYYY-MM-DD). staffId dùng để server trả kèm trạng thái đăng ký của riêng mình.
  getScheduleBoard(weekStart: string, staffId?: string): Observable<ScheduleBoard> {
    const params: any = { weekStart };
    if (staffId) params.staffId = staffId;
    return this.http.get<ScheduleBoard>(`${this.baseUrl}/schedule/board`, { params });
  }

  /** ── Bảng lịch làm việc — Admin (đầy đủ, kèm tên) ── */
  getAdminScheduleBoard(weekStart: string): Observable<AdminBoard> {
    return this.http.get<AdminBoard>(`${this.baseUrl}/schedule/admin-board`, {
      params: { weekStart },
    });
  }

  // Sức chứa giờ set THEO TỪNG TUẦN cụ thể (không còn là mẫu lặp lại)
  upsertScheduleSlotConfig(data: {
    weekStart: string;
    dayOfWeek: number;
    shiftTemplateId: string;
    capacity: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/schedule/slots`, data);
  }

  deleteScheduleSlotConfig(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/schedule/slots/${id}`);
  }

  // Sao chép toàn bộ cấu hình sức chứa từ 1 tuần sang tuần khác (VD: tuần trước → tuần này)
  copyScheduleWeek(fromWeekStart: string, toWeekStart: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/schedule/copy-week`, {
      fromWeekStart,
      toWeekStart,
    });
  }
}
