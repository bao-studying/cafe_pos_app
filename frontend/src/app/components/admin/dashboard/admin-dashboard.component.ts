import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { AdminService, RevenueReport, DailyRevenue } from '../../../services/admin.service';
import { OrderService } from '../../../services/order.service';
import { skip } from 'rxjs/operators';

type RangePreset = 'today' | '7d' | '30d' | 'custom';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  rangePreset: RangePreset = '7d';
  startDate = '';
  endDate = '';

  isLoading = true;
  loadError = '';

  report: RevenueReport | null = null;
  previousReport: RevenueReport | null = null;

  displayRevenue = 0;
  displayOrders = 0;
  displayAvgOrder = 0;

  private countUpRafId: number | null = null;
  private orderUpdatedSub: Subscription | null = null;

  constructor(
    public adminService: AdminService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    this.setPreset('7d');
    this.orderUpdatedSub = this.orderService.orderUpdated$.pipe(skip(1)).subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    if (this.orderUpdatedSub) {
      this.orderUpdatedSub.unsubscribe();
    }
    if (isPlatformBrowser(this.platformId) && this.countUpRafId) {
      cancelAnimationFrame(this.countUpRafId);
    }
  }

  setPreset(preset: RangePreset) {
    this.rangePreset = preset;
    const today = new Date();
    const end = this.toDateInputValue(today);

    if (preset === 'today') {
      this.startDate = end;
      this.endDate = end;
    } else if (preset === '7d') {
      this.startDate = this.toDateInputValue(this.addDays(today, -6));
      this.endDate = end;
    } else if (preset === '30d') {
      this.startDate = this.toDateInputValue(this.addDays(today, -29));
      this.endDate = end;
    }

    if (preset !== 'custom') {
      this.loadData();
    }
  }

  onCustomDateChange() {
    if (!this.startDate || !this.endDate) return;
    this.rangePreset = 'custom';
    this.loadData();
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private loadData() {
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const rangeDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const prevEnd = this.addDays(start, -1);
    const prevStart = this.addDays(prevEnd, -(rangeDays - 1));
    const prevStartStr = this.toDateInputValue(prevStart);
    const prevEndStr = this.toDateInputValue(prevEnd);

    forkJoin({
      current: this.adminService.getRevenue(this.startDate, this.endDate),
      previous: this.adminService.getRevenue(prevStartStr, prevEndStr),
    }).subscribe({
      next: ({ current, previous }) => {
        this.report = current;
        this.previousReport = previous;
        this.isLoading = false;
        this.animateCountUp();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Không tải được dữ liệu doanh thu, vui lòng thử lại.';
        this.cdr.detectChanges();
      },
    });
  }

  get totalOrders(): number {
    return this.report?.details.reduce((s, d) => s + d.totalOrders, 0) ?? 0;
  }

  get avgOrderValue(): number {
    const total = this.totalOrders;
    return total > 0 ? Math.round((this.report?.totalRevenue ?? 0) / total) : 0;
  }

  get previousTotalOrders(): number {
    return this.previousReport?.details.reduce((s, d) => s + d.totalOrders, 0) ?? 0;
  }

  get revenueChangePercent(): number | null {
    return this.percentChange(
      this.report?.totalRevenue ?? 0,
      this.previousReport?.totalRevenue ?? 0,
    );
  }

  get ordersChangePercent(): number | null {
    return this.percentChange(this.totalOrders, this.previousTotalOrders);
  }

  private percentChange(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  }

  get maxDailyRevenue(): number {
    if (!this.report?.details.length) return 0;
    return Math.max(...this.report.details.map((d) => d.dailyRevenue));
  }

  barHeightPercent(day: DailyRevenue): number {
    const max = this.maxDailyRevenue;
    return max > 0 ? Math.max(4, Math.round((day.dailyRevenue / max) * 100)) : 4;
  }

  formatDayLabel(isoDate: string): string {
    const [, m, d] = isoDate.split('-');
    return `${d}/${m}`;
  }

  private animateCountUp() {
    if (!isPlatformBrowser(this.platformId)) {
      this.displayRevenue = this.report?.totalRevenue ?? 0;
      this.displayOrders = this.totalOrders;
      this.displayAvgOrder = this.avgOrderValue;
      return;
    }

    if (this.countUpRafId !== null) {
      cancelAnimationFrame(this.countUpRafId);
      this.countUpRafId = null;
    }

    const targetRevenue = this.report?.totalRevenue ?? 0;
    const targetOrders = this.totalOrders;
    const targetAvg = this.avgOrderValue;

    const startRevenue = this.displayRevenue;
    const startOrders = this.displayOrders;
    const startAvg = this.displayAvgOrder;

    const duration = 900;
    const startTime = performance.now();

    const easeOutBack = (t: number) => {
      const c1 = 1.4;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutBack(t);

      this.displayRevenue = Math.max(
        0,
        Math.round(startRevenue + (targetRevenue - startRevenue) * eased),
      );
      this.displayOrders = Math.max(
        0,
        Math.round(startOrders + (targetOrders - startOrders) * eased),
      );
      this.displayAvgOrder = Math.max(0, Math.round(startAvg + (targetAvg - startAvg) * eased));

      this.cdr.detectChanges();

      if (t < 1) {
        this.countUpRafId = requestAnimationFrame(tick);
      } else {
        this.displayRevenue = targetRevenue;
        this.displayOrders = targetOrders;
        this.displayAvgOrder = targetAvg;
        this.countUpRafId = null;
        this.cdr.detectChanges();
      }
    };

    this.countUpRafId = requestAnimationFrame(tick);
  }
}
