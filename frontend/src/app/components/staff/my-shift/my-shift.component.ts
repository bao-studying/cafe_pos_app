import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  StaffService,
  ShiftRegistration,
  AttendanceRecord,
  ScheduleBoardCell,
} from '../../../services/staff.service';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '../../../services/auth.service';

// Định nghĩa kiểu dữ liệu cho các Tab điều hướng
type MyShiftTab = 'attendance' | 'board' | 'history';

const WEEK_DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
];

interface ScheduleRow {
  shiftTemplateId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  cellsByDay: Record<number, ScheduleBoardCell | undefined>; // key = dayOfWeek 1-7
}

@Component({
  selector: 'app-my-shift',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-shift.component.html',
  styleUrl: './my-shift.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyShiftComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  staffId = '';

  // Quản lý trạng thái tab hiện tại
  topTab: MyShiftTab = 'attendance';

  myRegistrations: ShiftRegistration[] = [];
  myAttendance: AttendanceRecord[] = [];
  payrollEstimate: any = null;

  // ── Bảng lịch làm việc ──
  weekDays = WEEK_DAYS;
  weekOffset = 0; // 0 = tuần này, +1 = tuần sau, -1 = tuần trước
  weekStart = '';
  weekEnd = '';
  scheduleRows: ScheduleRow[] = [];
  isBoardLoading = false;

  // ── Popup xác nhận đăng ký ──
  isConfirmOpen = false;
  selectedCell: ScheduleBoardCell | null = null;

  // Trạng thái chấm công hiện tại
  isCheckedIn = false;
  isSubmitting = false;

  constructor(
    private staffService: StaffService,
    private socketService: SocketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.staffId = user?.id || '';

    // ĐÃ THÊM: cảnh báo sớm nếu vì lý do gì đó không lấy được staffId (VD: chưa đăng nhập,
    // hoặc endpoint login đang dùng không trả field "id") — trước đây lỗi này âm thầm khiến
    // toàn bộ bảng lịch không tải được mà không có bất kỳ thông báo nào.
    if (!this.staffId) {
      console.error('[MyShiftComponent] Không lấy được staffId từ AuthService.getUser():', user);
    }

    this.loadBoard();
    this.loadMyRegistrations();
    this.loadMyAttendance();
    this.loadPayrollEstimate();

    // Cập nhật real-time khi có ai đăng ký ca mới (ảnh hưởng số lượng còn trống) hoặc admin duyệt/từ chối
    this.subs.push(
      this.socketService.on('shift:registration-created').subscribe(() => {
        this.loadBoard();
      }),
    );
    this.subs.push(
      this.socketService.on('shift:registration-updated').subscribe((reg: any) => {
        this.loadBoard();
        const staffIdOfReg = typeof reg?.staffId === 'string' ? reg.staffId : reg?.staffId?._id;
        if (staffIdOfReg === this.staffId) {
          this.loadMyRegistrations();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /** Hàm xử lý chuyển đổi giữa các Tab */
  switchTopTab(tab: MyShiftTab) {
    this.topTab = tab;
    this.cdr.markForCheck();
  }

  /** ── Tính ngày Thứ 2 của tuần theo weekOffset ── */
  private computeWeekStart(): string {
    const now = new Date();
    const jsDay = now.getDay(); // 0 = CN ... 6 = T7
    const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + this.weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${monday.getFullYear()}-${mm}-${dd}`;
  }

  private todayStr(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /** ── Bảng lịch làm việc ── */

  loadBoard() {
    if (!this.staffId) return;
    this.isBoardLoading = true;
    const weekStart = this.computeWeekStart();

    this.staffService.getScheduleBoard(weekStart, this.staffId).subscribe({
      next: (board) => {
        this.weekStart = board.weekStart;
        this.weekEnd = board.weekEnd;
        this.scheduleRows = this.groupCellsIntoRows(board.cells);
        this.isBoardLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[MyShiftComponent] Lỗi tải bảng lịch làm việc:', err);
        this.isBoardLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private groupCellsIntoRows(cells: ScheduleBoardCell[]): ScheduleRow[] {
    const rowMap = new Map<string, ScheduleRow>();
    for (const cell of cells) {
      if (!rowMap.has(cell.shiftTemplateId)) {
        rowMap.set(cell.shiftTemplateId, {
          shiftTemplateId: cell.shiftTemplateId,
          shiftName: cell.shiftName,
          startTime: cell.startTime,
          endTime: cell.endTime,
          cellsByDay: {},
        });
      }
      rowMap.get(cell.shiftTemplateId)!.cellsByDay[cell.dayOfWeek] = cell;
    }
    return Array.from(rowMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  prevWeek() {
    this.weekOffset -= 1;
    this.loadBoard();
  }

  nextWeek() {
    this.weekOffset += 1;
    this.loadBoard();
  }

  goToThisWeek() {
    this.weekOffset = 0;
    this.loadBoard();
  }

  // Trạng thái hiển thị của 1 ô: 'mine-pending' | 'mine-approved' | 'full' | 'past' | 'open' | 'closed'
  cellState(cell: ScheduleBoardCell | undefined): string {
    if (!cell) return 'closed'; // Chưa được admin mở đăng ký (không có cấu hình sức chứa)
    if (cell.myStatus === 'pending') return 'mine-pending';
    if (cell.myStatus === 'approved') return 'mine-approved';
    if (cell.date < this.todayStr()) return 'past';
    if (cell.isFull) return 'full';
    return 'open';
  }

  isCellClickable(cell: ScheduleBoardCell | undefined): boolean {
    return this.cellState(cell) === 'open';
  }

  // ĐÃ SỬA: trước đây nút bị gắn [disabled] khi không "open", khiến trình duyệt chặn hẳn
  // sự kiện click — bấm vào không có bất kỳ phản hồi nào, rất khó biết vì sao.
  // Giờ bấm ô nào cũng có phản hồi: mở popup nếu đăng ký được, hoặc báo rõ lý do nếu không.
  openConfirm(cell: ScheduleBoardCell | undefined) {
    if (!cell) {
      alert('Admin chưa mở đăng ký cho ô này.');
      return;
    }

    const state = this.cellState(cell);

    if (state === 'mine-pending') {
      alert('Bạn đã đăng ký ca này rồi, đang chờ admin duyệt.');
      return;
    }
    if (state === 'mine-approved') {
      alert('Ca này đã được admin duyệt cho bạn rồi.');
      return;
    }
    if (state === 'past') {
      alert('Ca này đã qua ngày, không thể đăng ký nữa.');
      return;
    }
    if (state === 'full') {
      alert('Ô ca này đã đủ số lượng đăng ký, vui lòng chọn ô khác.');
      return;
    }

    this.selectedCell = cell;
    this.isConfirmOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirm() {
    this.isConfirmOpen = false;
    this.selectedCell = null;
    this.cdr.markForCheck();
  }

  confirmRegister() {
    if (!this.selectedCell) return;
    if (!this.staffId) {
      alert('Không xác định được tài khoản nhân viên, vui lòng đăng nhập lại.');
      return;
    }
    this.isSubmitting = true;
    this.staffService
      .registerShift({
        staffId: this.staffId,
        shiftTemplateId: this.selectedCell.shiftTemplateId,
        date: this.selectedCell.date,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeConfirm();
          this.loadBoard();
          this.loadMyRegistrations();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('[MyShiftComponent] Lỗi đăng ký ca:', err);
          alert(
            err?.error?.message || `Lỗi gửi đăng ký ca! (mã lỗi: ${err?.status ?? 'không rõ'})`,
          );
          this.closeConfirm();
          this.loadBoard(); // ô có thể vừa bị người khác đăng ký đủ SL, load lại cho chính xác
        },
      });
  }

  /** ── Đăng ký của tôi (tổng hợp) ── */

  loadMyRegistrations() {
    if (!this.staffId) return;
    this.staffService.getShiftRegistrations({ staffId: this.staffId }).subscribe({
      next: (data) => {
        this.myRegistrations = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
    });
  }

  templateLabel(value: any): string {
    if (typeof value === 'string') return value;
    return value ? `${value.name} (${value.startTime} - ${value.endTime})` : '';
  }

  /** ── Chấm công ── */

  loadMyAttendance() {
    if (!this.staffId) return;
    const now = new Date();
    this.staffService
      .getAttendance({ staffId: this.staffId, month: now.getMonth() + 1, year: now.getFullYear() })
      .subscribe({
        next: (data) => {
          this.myAttendance = Array.isArray(data) ? data : [];
          this.isCheckedIn = this.myAttendance.some((a) => a.status === 'checked-in');
          this.cdr.markForCheck();
        },
      });
  }

  checkIn() {
    if (!this.staffId) return;
    this.isSubmitting = true;
    this.staffService.checkIn(this.staffId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.loadMyAttendance();
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi check-in!');
      },
    });
  }

  checkOut() {
    if (!this.staffId) return;
    this.isSubmitting = true;
    this.staffService.checkOut(this.staffId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.loadMyAttendance();
        this.loadPayrollEstimate();
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi check-out!');
      },
    });
  }

  /** ── Lương tạm tính ── */

  loadPayrollEstimate() {
    if (!this.staffId) return;
    this.staffService.getPayrollEstimate(this.staffId).subscribe({
      next: (data) => {
        this.payrollEstimate = data ?? null;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  trackById(_: number, item: { _id: string } | { shiftTemplateId: string }) {
    return (item as any)._id || (item as any).shiftTemplateId;
  }
}
