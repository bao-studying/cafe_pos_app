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
  ScheduleSlotConfig,
} from '../../../services/staff.service';
import { SocketService } from '../../../services/socket.service';

type TopTab = 'list' | 'approvals' | 'templates' | 'schedule';
type DrawerTab = 'info' | 'shifts' | 'payroll';

export const WEEK_DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
];

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
  onlineStaffIds = new Set<string>(); // staffId đang có ca "checked-in"

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

  // ── Duyệt đăng ký ca ──
  pendingRegistrations: ShiftRegistration[] = [];

  // ── Ca mẫu ──
  shiftTemplates: ShiftTemplate[] = [];
  newTemplate = { name: '', startTime: '', endTime: '' };

  // ── Bảng lịch làm việc (thiết lập sức chứa Thứ × Ca mẫu) ──
  weekDays = WEEK_DAYS;
  scheduleSlotConfigs: ScheduleSlotConfig[] = [];
  capacityMap: Record<string, number | null> = {}; // key = `${templateId}_${dayOfWeek}`
  private configIdMap: Record<string, string> = {}; // key = `${templateId}_${dayOfWeek}` -> ScheduleSlot._id

  isSaving = false;

  constructor(
    private staffService: StaffService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStaffList();
    this.loadPendingRegistrations();
    this.loadShiftTemplates();
    this.loadOpenAttendance();
    this.loadScheduleSlots();

    // Cập nhật real-time khi có nhân viên check-in/out ở nơi khác (không cần F5)
    this.subs.push(
      this.socketService.on('attendance:check-in').subscribe((data: any) => {
        this.onlineStaffIds.add(this.extractId(data.staffId));
        this.cdr.markForCheck();
      }),
    );
    this.subs.push(
      this.socketService.on('attendance:check-out').subscribe((data: any) => {
        this.onlineStaffIds.delete(this.extractId(data.staffId));
        this.cdr.markForCheck();
      }),
    );
    this.subs.push(
      this.socketService.on('shift:registration-created').subscribe(() => {
        this.loadPendingRegistrations();
      }),
    );
    this.subs.push(
      this.socketService.on('user:status-updated').subscribe((data: any) => {
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
    return typeof value === 'string' ? value : value?._id;
  }

  switchTopTab(tab: TopTab) {
    this.topTab = tab;
    this.cdr.markForCheck();
  }

  /** ═══════════════ DANH SÁCH NHÂN VIÊN ═══════════════ */

  loadStaffList() {
    this.staffService.getStaffList().subscribe({
      next: (data) => {
        this.staffList = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Lỗi tải danh sách nhân viên:', err),
    });
  }

  // Xác định nhân viên nào đang trong ca (checked-in) để hiển thị chấm "Đang làm"
  private loadOpenAttendance() {
    this.staffService.getAttendance().subscribe({
      next: (records) => {
        records
          .filter((r) => r.status === 'checked-in')
          .forEach((r) => this.onlineStaffIds.add(this.extractId(r.staffId)));
        this.cdr.markForCheck();
      },
      error: () => {},
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
        this.staffRegistrations = data;
        this.cdr.markForCheck();
      },
    });
    this.staffService.getAttendance({ staffId }).subscribe({
      next: (data) => {
        this.staffAttendance = data;
        this.cdr.markForCheck();
      },
    });
    this.staffService.getPayrollHistory(staffId).subscribe({
      next: (data) => {
        this.staffPayrolls = data;
        this.cdr.markForCheck();
      },
    });
    this.staffService.getPayrollEstimate(staffId).subscribe({
      next: (data) => {
        this.payrollEstimate = data;
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

  /** ═══════════════ DUYỆT ĐĂNG KÝ CA ═══════════════ */

  loadPendingRegistrations() {
    this.staffService.getShiftRegistrations({ status: 'pending' }).subscribe({
      next: (data) => {
        this.pendingRegistrations = data;
        this.cdr.markForCheck();
      },
    });
  }

  approveRegistration(reg: ShiftRegistration) {
    this.staffService.updateShiftRegistration(reg._id, 'approved').subscribe({
      next: () => this.loadPendingRegistrations(),
      error: (err) => alert(err.error?.message || 'Lỗi duyệt đăng ký ca!'),
    });
  }

  rejectRegistration(reg: ShiftRegistration) {
    this.staffService.updateShiftRegistration(reg._id, 'rejected').subscribe({
      next: () => this.loadPendingRegistrations(),
      error: (err) => alert(err.error?.message || 'Lỗi từ chối đăng ký ca!'),
    });
  }

  staffName(value: StaffUser | string): string {
    return typeof value === 'string' ? value : value?.name || '';
  }

  templateLabel(value: ShiftTemplate | string): string {
    if (typeof value === 'string') return value;
    return value ? `${value.name} (${value.startTime} - ${value.endTime})` : '';
  }

  /** ═══════════════ CA MẪU ═══════════════ */

  loadShiftTemplates() {
    this.staffService.getShiftTemplates().subscribe({
      next: (data) => {
        this.shiftTemplates = data;
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
      },
      error: (err) => alert(err.error?.message || 'Lỗi thêm ca mẫu!'),
    });
  }

  toggleTemplateActive(template: ShiftTemplate) {
    this.staffService
      .updateShiftTemplate(template._id, { isActive: !template.isActive })
      .subscribe({
        next: () => this.loadShiftTemplates(),
      });
  }

  deleteTemplate(template: ShiftTemplate) {
    if (!confirm(`Xoá ca mẫu "${template.name}"?`)) return;
    this.staffService.deleteShiftTemplate(template._id).subscribe({
      next: () => this.loadShiftTemplates(),
      error: (err) => alert(err.error?.message || 'Lỗi xoá ca mẫu!'),
    });
  }

  /** ═══════════════ BẢNG LỊCH LÀM VIỆC (sức chứa) ═══════════════ */

  cellKey(templateId: string, dayOfWeek: number): string {
    return `${templateId}_${dayOfWeek}`;
  }

  loadScheduleSlots() {
    this.staffService.getScheduleSlotConfigs().subscribe({
      next: (data) => {
        this.scheduleSlotConfigs = data;
        this.capacityMap = {};
        this.configIdMap = {};
        for (const slot of data) {
          const tplId =
            typeof slot.shiftTemplateId === 'string'
              ? slot.shiftTemplateId
              : slot.shiftTemplateId._id;
          const key = this.cellKey(tplId, slot.dayOfWeek);
          this.capacityMap[key] = slot.capacity;
          this.configIdMap[key] = slot._id;
        }
        this.cdr.markForCheck();
      },
    });
  }

  saveCapacity(templateId: string, dayOfWeek: number) {
    const key = this.cellKey(templateId, dayOfWeek);
    const value = Number(this.capacityMap[key]) || 0;

    if (value <= 0) {
      const configId = this.configIdMap[key];
      if (configId) {
        this.staffService.deleteScheduleSlotConfig(configId).subscribe({
          next: () => this.loadScheduleSlots(),
        });
      }
      return;
    }

    this.staffService
      .upsertScheduleSlotConfig({ dayOfWeek, shiftTemplateId: templateId, capacity: value })
      .subscribe({
        next: () => this.loadScheduleSlots(),
        error: (err) => alert(err.error?.message || 'Lỗi lưu sức chứa!'),
      });
  }

  trackById(_: number, item: { _id: string }) {
    return item._id;
  }
}
