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
  StaffUser,
  ShiftTemplate,
  ShiftRegistration,
  AttendanceRecord,
  Payroll,
  AdminBoardRow,
  AdminBoardCell,
} from '../../../services/staff.service';
import { SocketService } from '../../../services/socket.service';

type TopTab = 'list' | 'schedule' | 'templates';
type DrawerTab = 'info' | 'shifts' | 'payroll';

const WEEK_DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

interface WeekColumn {
  dayOfWeek: number;
  label: string;
  dateLabel: string; // dd/MM
  dateStr: string; // YYYY-MM-DD
}

interface ManageCellInfo {
  shiftTemplateId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  date: string;
  capacity: number;
}

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-staff.component.html',
  styleUrl: './admin-staff.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStaffComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];

  // ── Tab chính của trang ──
  topTab: TopTab = 'list';

  // ── Danh sách nhân viên ──
  staffList: StaffUser[] = [];
  onlineStaffIds = new Set<string>();

  // ── Thêm nhân viên mới ──
  isAddModalOpen = false;
  newStaff = { name: '', phone: '', password: '', hourlyRate: 0 };

  // ── Drawer chi tiết nhân viên ──
  isDrawerOpen = false;
  drawerTab: DrawerTab = 'info';
  selectedStaff: StaffUser | null = null;
  editStaff = { name: '', phone: '', hourlyRate: 0, role: 'staff' as StaffUser['role'] };

  staffRegistrations: ShiftRegistration[] = [];
  staffAttendance: AttendanceRecord[] = [];
  staffPayrolls: Payroll[] = [];
  payrollEstimate: any = null;

  // ── Ca mẫu ──
  shiftTemplates: ShiftTemplate[] = [];
  newTemplate = { name: '', startTime: '', endTime: '' };

  // ── LỊCH LÀM VIỆC (gộp Duyệt đăng ký + Thiết lập sức chứa) ──
  currentWeekStart = ''; // Thứ 2 của tuần đang xem (YYYY-MM-DD)
  weekStartLabel = '';
  weekEndLabel = '';
  weekColumns: WeekColumn[] = [];
  adminBoardRows: AdminBoardRow[] = [];
  isBoardLoading = false;
  isEditMode = false;
  pickedDate = ''; // dùng cho ô chọn ngày để nhảy tới tuần bất kỳ

  // Popup quản lý duyệt/huỷ theo từng ô
  isManageOpen = false;
  manageCell: ManageCellInfo | null = null;
  manageRegistrations: ShiftRegistration[] = [];
  isManageLoading = false;

  // ── Trạng thái kết nối real-time (Socket.io) ──
  isSocketConnected = false;

  isSaving = false;

  constructor(
    private staffService: StaffService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStaffList();
    this.loadShiftTemplates();
    this.loadOpenAttendance();

    const today = this.todayStr();
    this.pickedDate = today;
    this.currentWeekStart = this.mondayOfDate(today);
    this.buildWeekColumns();
    this.loadAdminBoard();

    // Theo dõi trạng thái kết nối real-time để hiện chỉ báo trên giao diện
    this.subs.push(
      this.socketService.connectionStatus().subscribe((connected) => {
        this.isSocketConnected = connected;
        this.cdr.markForCheck();
      }),
    );

    // Real-time: bất kỳ đăng ký/duyệt/từ chối ca nào cũng làm mới lại bảng lịch admin đang xem
    this.subs.push(
      this.socketService.on('shift:registration-created').subscribe(() => {
        this.loadAdminBoard();
        if (this.isManageOpen) this.refreshManagePopup();
      }),
    );
    this.subs.push(
      this.socketService.on('shift:registration-updated').subscribe(() => {
        this.loadAdminBoard();
        if (this.isManageOpen) this.refreshManagePopup();
      }),
    );
    this.subs.push(
      this.socketService.on('attendance:check-in').subscribe((data: any) => {
        if (!data) return;
        this.onlineStaffIds.add(this.extractId(data.staffId));
        this.cdr.markForCheck();
      }),
    );
    this.subs.push(
      this.socketService.on('attendance:check-out').subscribe((data: any) => {
        if (!data) return;
        this.onlineStaffIds.delete(this.extractId(data.staffId));
        this.cdr.markForCheck();
      }),
    );
    this.subs.push(
      this.socketService.on('user:status-updated').subscribe((data: any) => {
        if (!data) return;
        const staff = this.staffList.find((s) => s._id === data.userId);
        if (staff) {
          staff.isActive = data.isActive;
          this.cdr.markForCheck();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private extractId(value: any): string {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object' && typeof value._id === 'string') return value._id;
    return '';
  }

  switchTopTab(tab: TopTab) {
    this.topTab = tab;
    this.cdr.markForCheck();
  }

  /** ═══════════════ DANH SÁCH NHÂN VIÊN ═══════════════ */

  loadStaffList() {
    this.staffService.getStaffList().subscribe({
      next: (data) => {
        this.staffList = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Lỗi tải danh sách nhân viên:', err),
    });
  }

  private loadOpenAttendance() {
    this.staffService.getAttendance().subscribe({
      next: (records) => {
        (Array.isArray(records) ? records : [])
          .filter((r) => r.status === 'checked-in')
          .forEach((r) => this.onlineStaffIds.add(this.extractId(r.staffId)));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Lỗi tải trạng thái chấm công (online status):', err),
    });
  }

  isOnline(staff: StaffUser): boolean {
    return this.onlineStaffIds.has(staff._id);
  }

  openAddModal() {
    this.newStaff = { name: '', phone: '', password: '', hourlyRate: 0 };
    this.isAddModalOpen = true;
    this.cdr.markForCheck();
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.cdr.markForCheck();
  }

  submitNewStaff() {
    if (
      !this.newStaff.name.trim() ||
      !this.newStaff.phone.trim() ||
      !this.newStaff.password.trim()
    ) {
      return alert('Vui lòng nhập đủ tên, số điện thoại và mật khẩu.');
    }
    this.isSaving = true;
    this.staffService.createStaff(this.newStaff).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeAddModal();
        this.loadStaffList();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error?.message || 'Lỗi tạo tài khoản nhân viên!');
      },
    });
  }

  /** ═══════════════ DRAWER CHI TIẾT NHÂN VIÊN ═══════════════ */

  openDrawer(staff: StaffUser) {
    this.selectedStaff = staff;
    this.editStaff = {
      name: staff.name,
      phone: staff.phone,
      hourlyRate: staff.hourlyRate,
      role: staff.role,
    };
    this.drawerTab = 'info';
    this.isDrawerOpen = true;
    this.loadStaffDetail(staff._id);
    this.cdr.markForCheck();
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedStaff = null;
    this.cdr.markForCheck();
  }

  switchDrawerTab(tab: DrawerTab) {
    this.drawerTab = tab;
    this.cdr.markForCheck();
  }

  private loadStaffDetail(staffId: string) {
    this.staffService.getShiftRegistrations({ staffId }).subscribe({
      next: (data) => {
        this.staffRegistrations = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
    });
    this.staffService.getAttendance({ staffId }).subscribe({
      next: (data) => {
        this.staffAttendance = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
    });
    this.staffService.getPayrollHistory(staffId).subscribe({
      next: (data) => {
        this.staffPayrolls = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
    });
    this.staffService.getPayrollEstimate(staffId).subscribe({
      next: (data) => {
        this.payrollEstimate = data ?? null;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  saveStaffInfo() {
    if (!this.selectedStaff) return;
    this.isSaving = true;
    this.staffService.updateStaff(this.selectedStaff._id, this.editStaff).subscribe({
      next: (res) => {
        this.isSaving = false;
        const idx = this.staffList.findIndex((s) => s._id === this.selectedStaff!._id);
        if (idx !== -1) this.staffList[idx] = res.user;
        this.selectedStaff = res.user;
        alert('Đã lưu thông tin nhân viên.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error?.message || 'Lỗi cập nhật!');
      },
    });
  }

  toggleStaffLock() {
    if (!this.selectedStaff) return;
    const newStatus = !this.selectedStaff.isActive;
    this.staffService.updateStaffStatus(this.selectedStaff._id, newStatus).subscribe({
      next: (res) => {
        this.selectedStaff = res.user;
        const idx = this.staffList.findIndex((s) => s._id === res.user._id);
        if (idx !== -1) this.staffList[idx] = res.user;
        this.cdr.markForCheck();
      },
      error: (err) => alert(err.error?.message || 'Lỗi cập nhật trạng thái!'),
    });
  }

  finalizePayrollForSelected() {
    if (!this.selectedStaff) return;
    const now = new Date();
    if (
      !confirm(
        `Chốt lương tháng ${now.getMonth() + 1}/${now.getFullYear()} sẽ áp dụng cho TOÀN BỘ nhân viên, không riêng ${this.selectedStaff.name}. Tiếp tục?`,
      )
    ) {
      return;
    }
    this.isSaving = true;
    this.staffService.generatePayroll(now.getMonth() + 1, now.getFullYear()).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadStaffDetail(this.selectedStaff!._id);
        alert('Đã chốt lương tháng này cho toàn bộ nhân viên.');
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error?.message || 'Lỗi chốt lương!');
      },
    });
  }

  templateLabel(value: ShiftTemplate | string): string {
    if (typeof value === 'string') return value;
    return value ? `${value.name} (${value.startTime} - ${value.endTime})` : '';
  }

  /** ═══════════════ CA MẪU ═══════════════ */

  loadShiftTemplates() {
    this.staffService.getShiftTemplates().subscribe({
      next: (data) => {
        const templates = Array.isArray(data) ? data : [];
        this.shiftTemplates = [...templates].sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.cdr.markForCheck();
      },
    });
  }

  addShiftTemplate() {
    if (!this.newTemplate.name.trim() || !this.newTemplate.startTime || !this.newTemplate.endTime) {
      return alert('Vui lòng nhập đủ tên ca, giờ bắt đầu và giờ kết thúc.');
    }
    this.staffService.createShiftTemplate(this.newTemplate).subscribe({
      next: () => {
        this.newTemplate = { name: '', startTime: '', endTime: '' };
        this.loadShiftTemplates();
        this.loadAdminBoard();
      },
      error: (err) => alert(err.error?.message || 'Lỗi thêm ca mẫu!'),
    });
  }

  toggleTemplateActive(template: ShiftTemplate) {
    if (!template?._id) return;
    this.staffService
      .updateShiftTemplate(template._id, { isActive: !template.isActive })
      .subscribe({
        next: () => {
          this.loadShiftTemplates();
          this.loadAdminBoard();
        },
      });
  }

  deleteTemplate(template: ShiftTemplate) {
    if (!template?._id) return;
    if (!confirm(`Xoá ca mẫu "${template.name}"?`)) return;
    this.staffService.deleteShiftTemplate(template._id).subscribe({
      next: () => {
        this.loadShiftTemplates();
        this.loadAdminBoard();
      },
      error: (err) => alert(err.error?.message || 'Lỗi xoá ca mẫu!'),
    });
  }

  /** ═══════════════ LỊCH LÀM VIỆC — điều hướng tuần (thuần local date, không phụ thuộc server) ═══════════════ */

  private todayStr(): string {
    return this.formatDate(new Date());
  }

  private formatDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private mondayOfDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay(); // 0 = CN ... 6 = T7 (local)
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return this.formatDate(d);
  }

  private addDaysToDateStr(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  private buildWeekColumns() {
    this.weekColumns = WEEK_DAY_NAMES.map((label, idx) => {
      const dateStr = this.addDaysToDateStr(this.currentWeekStart, idx);
      const d = new Date(`${dateStr}T00:00:00`);
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { dayOfWeek: idx + 1, label, dateLabel, dateStr };
    });
  }

  private setWeek(newWeekStart: string) {
    this.currentWeekStart = newWeekStart;
    this.pickedDate = newWeekStart;
    this.buildWeekColumns();
    this.loadAdminBoard();
  }

  prevWeek() {
    this.setWeek(this.addDaysToDateStr(this.currentWeekStart, -7));
  }

  nextWeek() {
    this.setWeek(this.addDaysToDateStr(this.currentWeekStart, 7));
  }

  goToThisWeek() {
    this.setWeek(this.mondayOfDate(this.todayStr()));
  }

  jumpToPickedDate() {
    if (!this.pickedDate) return;
    this.setWeek(this.mondayOfDate(this.pickedDate));
  }

  get isCurrentWeek(): boolean {
    return this.currentWeekStart === this.mondayOfDate(this.todayStr());
  }

  /** ═══════════════ LỊCH LÀM VIỆC — tải bảng ═══════════════ */

  loadAdminBoard() {
    this.isBoardLoading = true;
    this.staffService.getAdminScheduleBoard(this.currentWeekStart).subscribe({
      next: (board) => {
        this.weekStartLabel = board.weekStart;
        this.weekEndLabel = board.weekEnd;
        this.adminBoardRows = board.rows;
        this.isBoardLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Lỗi tải bảng lịch làm việc:', err);
        this.isBoardLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.cdr.markForCheck();
  }

  /** ═══════════════ LỊCH LÀM VIỆC — chỉnh sửa sức chứa (chế độ Edit) ═══════════════ */

  saveCellCapacity(templateId: string, cell: AdminBoardCell) {
    const value = Number(cell.capacity) || 0;

    if (value <= 0) {
      const configId = cell.configId;
      cell.capacity = 0;
      cell.configId = null;
      this.cdr.markForCheck();
      if (configId) {
        this.staffService.deleteScheduleSlotConfig(configId).subscribe({
          error: () => alert('Lỗi xoá sức chứa!'),
        });
      }
      return;
    }

    this.staffService
      .upsertScheduleSlotConfig({
        weekStart: this.currentWeekStart,
        dayOfWeek: cell.dayOfWeek,
        shiftTemplateId: templateId,
        capacity: value,
      })
      .subscribe({
        next: (res) => {
          const slot = res?.slot;
          cell.capacity = typeof slot?.capacity === 'number' ? slot.capacity : value;
          cell.configId = slot?._id ?? cell.configId;
          this.cdr.markForCheck();
        },
        error: (err) => alert(err.error?.message || 'Lỗi lưu sức chứa!'),
      });
  }

  copyFromPreviousWeek() {
    const prevWeekStart = this.addDaysToDateStr(this.currentWeekStart, -7);
    if (
      !confirm(
        'Sao chép toàn bộ số lượng nhân viên đã set của TUẦN TRƯỚC sang tuần đang xem?\nCác ô đã set riêng ở tuần này sẽ bị ghi đè.',
      )
    ) {
      return;
    }
    this.isSaving = true;
    this.staffService.copyScheduleWeek(prevWeekStart, this.currentWeekStart).subscribe({
      next: (res) => {
        this.isSaving = false;
        alert(res.message);
        this.loadAdminBoard();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error?.message || 'Lỗi sao chép tuần!');
      },
    });
  }

  /** ═══════════════ LỊCH LÀM VIỆC — xem trạng thái & popup quản lý duyệt ═══════════════ */

  // 'closed' = chưa mở đăng ký | 'red' = chưa ai đăng ký | 'yellow' = đang chờ duyệt | 'green' = đã chốt duyệt
  cellViewState(cell: AdminBoardCell): 'closed' | 'red' | 'yellow' | 'green' {
    if (!cell.capacity || cell.capacity <= 0) return 'closed';
    if (cell.registeredCount === 0) return 'red';
    if (cell.pendingCount > 0) return 'yellow';
    return 'green';
  }

  openManagePopup(row: AdminBoardRow, cell: AdminBoardCell) {
    if (this.isEditMode) return; // Chế độ sửa: input sức chứa tự xử lý riêng, không mở popup

    if (!cell.capacity || cell.capacity <= 0) {
      alert('Ô này chưa được mở đăng ký. Bấm "Chỉnh sửa" để thiết lập số lượng nhân viên trước.');
      return;
    }

    this.manageCell = {
      shiftTemplateId: row.shiftTemplateId,
      shiftName: row.name,
      startTime: row.startTime,
      endTime: row.endTime,
      date: cell.date,
      capacity: cell.capacity,
    };
    this.isManageOpen = true;
    this.manageRegistrations = [];
    this.cdr.markForCheck();
    this.refreshManagePopup();
  }

  closeManagePopup() {
    this.isManageOpen = false;
    this.manageCell = null;
    this.cdr.markForCheck();
  }

  refreshManagePopup() {
    if (!this.manageCell) return;
    this.isManageLoading = true;
    this.staffService
      .getShiftRegistrations({
        date: this.manageCell.date,
        shiftTemplateId: this.manageCell.shiftTemplateId,
      })
      .subscribe({
        next: (data) => {
          this.manageRegistrations = (Array.isArray(data) ? data : []).filter(
            (r) => r.status !== 'rejected',
          );
          this.isManageLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isManageLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  approveInPopup(reg: ShiftRegistration) {
    if (!reg?._id) return;
    this.staffService.updateShiftRegistration(reg._id, 'approved').subscribe({
      next: () => {
        this.refreshManagePopup();
        this.loadAdminBoard();
      },
      error: (err) => alert(err.error?.message || 'Lỗi duyệt đăng ký ca!'),
    });
  }

  rejectInPopup(reg: ShiftRegistration) {
    if (!reg?._id) return;
    this.staffService.updateShiftRegistration(reg._id, 'rejected').subscribe({
      next: () => {
        this.refreshManagePopup();
        this.loadAdminBoard();
      },
      error: (err) => alert(err.error?.message || 'Lỗi từ chối đăng ký ca!'),
    });
  }

  staffName(value: StaffUser | string): string {
    return typeof value === 'string' ? value : value?.name || '';
  }

  trackById(_: number, item: { _id?: string } | null | undefined) {
    return item?._id ?? `item-${_}`;
  }
}
