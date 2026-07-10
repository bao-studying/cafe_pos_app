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

interface ScheduleGridCell {
  dayOfWeek: number;
  capacity: number | null;
  configId: string | null;
}

interface ScheduleGridRow {
  templateId: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  cells: ScheduleGridCell[];
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
  // ĐÃ SỬA: bỏ capacityMap/configIdMap dạng key động (nguyên nhân gây mất số khi đổi ô),
  // chuyển sang scheduleGridRows — mỗi ô là 1 object thật, ngModel bind thẳng vào object đó.
  weekDays = WEEK_DAYS;
  scheduleSlotConfigs: ScheduleSlotConfig[] = [];
  scheduleGridRows: ScheduleGridRow[] = [];
  private shiftTemplatesLoaded = false;
  private scheduleSlotsLoaded = false;

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
      this.socketService.on('shift:registration-created').subscribe((data: any) => {
        if (!data) return;
        this.loadPendingRegistrations();
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
    if (
      value &&
      typeof value === 'object' &&
      '_id' in value &&
      typeof (value as any)._id === 'string'
    ) {
      return (value as any)._id;
    }
    return '';
  }

  private getSafeId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value;
    if (
      value &&
      typeof value === 'object' &&
      '_id' in value &&
      typeof (value as any)._id === 'string' &&
      (value as any)._id.trim()
    ) {
      return (value as any)._id;
    }
    return null;
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

  // Xác định nhân viên nào đang trong ca (checked-in) để hiển thị chấm "Đang làm"
  private loadOpenAttendance() {
    this.staffService.getAttendance().subscribe({
      next: (records) => {
        (Array.isArray(records) ? records : [])
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

  /** ═══════════════ DUYỆT ĐĂNG KÝ CA ═══════════════ */

  loadPendingRegistrations() {
    this.staffService.getShiftRegistrations({ status: 'pending' }).subscribe({
      next: (data) => {
        this.pendingRegistrations = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
    });
  }

  approveRegistration(reg: ShiftRegistration) {
    if (!reg?._id) return;
    this.staffService.updateShiftRegistration(reg._id, 'approved').subscribe({
      next: () => this.loadPendingRegistrations(),
      error: (err) => alert(err.error?.message || 'Lỗi duyệt đăng ký ca!'),
    });
  }

  rejectRegistration(reg: ShiftRegistration) {
    if (!reg?._id) return;
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
        const templates = Array.isArray(data) ? data : [];
        // Sắp xếp theo giờ bắt đầu để bảng lịch và tab "Ca mẫu" luôn hiện đúng thứ tự sáng → tối
        this.shiftTemplates = [...templates].sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.shiftTemplatesLoaded = true;
        this.rebuildScheduleGrid();
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
    if (!template?._id) return;
    this.staffService
      .updateShiftTemplate(template._id, { isActive: !template.isActive })
      .subscribe({
        next: () => this.loadShiftTemplates(),
      });
  }

  deleteTemplate(template: ShiftTemplate) {
    if (!template?._id) return;
    if (!confirm(`Xoá ca mẫu "${template.name}"?`)) return;
    this.staffService.deleteShiftTemplate(template._id).subscribe({
      next: () => this.loadShiftTemplates(),
      error: (err) => alert(err.error?.message || 'Lỗi xoá ca mẫu!'),
    });
  }

  /** ═══════════════ BẢNG LỊCH LÀM VIỆC (sức chứa) ═══════════════ */

  loadScheduleSlots() {
    this.staffService.getScheduleSlotConfigs().subscribe({
      next: (data) => {
        this.scheduleSlotConfigs = Array.isArray(data) ? data : [];
        this.scheduleSlotsLoaded = true;
        this.rebuildScheduleGrid();
        this.cdr.markForCheck();
      },
    });
  }

  // Dựng lại lưới (mảng object thật) từ shiftTemplates + scheduleSlotConfigs.
  // Chỉ dựng lại khi cả 2 nguồn dữ liệu đã tải xong, để tránh flash "mất số" giữa chừng.
  private rebuildScheduleGrid() {
    if (!this.shiftTemplatesLoaded || !this.scheduleSlotsLoaded) return;

    this.scheduleGridRows = this.shiftTemplates.map((tpl) => {
      const cells: ScheduleGridCell[] = this.weekDays.map((day) => {
        const config = this.scheduleSlotConfigs.find((slot) => {
          const tplId = this.getSafeId(slot.shiftTemplateId);
          return tplId === tpl._id && slot.dayOfWeek === day.value;
        });
        return {
          dayOfWeek: day.value,
          capacity: config ? config.capacity : null,
          configId: config ? config._id : null,
        };
      });
      return {
        templateId: tpl._id,
        name: tpl.name,
        startTime: tpl.startTime,
        endTime: tpl.endTime,
        isActive: tpl.isActive,
        cells,
      };
    });
  }

  // ngModel bind thẳng vào `cell` (1 object thật nằm trong scheduleGridRows) —
  // KHÔNG còn tra cứu qua key động nữa, nên gõ số ở ô nào chỉ ô đó thay đổi,
  // chuyển sang ô khác không còn bị mất số đã gõ.
  saveCapacity(templateId: string, cell: ScheduleGridCell) {
    const value = Number(cell.capacity ?? 0);

    if (value <= 0) {
      const configId = cell.configId;
      cell.capacity = null;
      cell.configId = null;
      this.cdr.markForCheck();
      if (configId) {
        this.staffService.deleteScheduleSlotConfig(configId).subscribe({
          next: () => {
            this.scheduleSlotConfigs = this.scheduleSlotConfigs.filter((s) => s._id !== configId);
          },
          error: () => alert('Lỗi xoá sức chứa!'),
        });
      }
      return;
    }

    this.isSaving = true;
    this.staffService
      .upsertScheduleSlotConfig({
        dayOfWeek: cell.dayOfWeek,
        shiftTemplateId: templateId,
        capacity: value,
      })
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          const slot = res?.slot;
          // Chỉ cập nhật đúng ô này (đối tượng cell thật) — các ô khác không bị ảnh hưởng.
          cell.capacity = typeof slot?.capacity === 'number' ? slot.capacity : value;
          cell.configId = slot?._id ?? cell.configId;

          if (slot) {
            const idx = this.scheduleSlotConfigs.findIndex((s) => s._id === slot._id);
            if (idx !== -1) this.scheduleSlotConfigs[idx] = slot;
            else this.scheduleSlotConfigs.push(slot);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSaving = false;
          alert(err.error?.message || 'Lỗi lưu sức chứa!');
        },
      });
  }

  trackById(_: number, item: { _id?: string } | null | undefined) {
    return item?._id ?? `item-${_}`;
  }
}
