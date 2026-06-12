import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../admin/stock/stock.service';
import { AuthService } from '../../../services/auth.service';

interface CheckRow {
  _id: string;
  name: string;
  imageUrl: string;
  baseUnit: string;
  subUnit: string;
  conversionRate: number;
  actualBaseQty: number | null;
  actualSubQty: number | null;
}

@Component({
  selector: 'app-staff-stock-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-stock-check.component.html',
  styleUrl: './staff-stock-check.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffStockCheckComponent implements OnInit {
  readonly DEFAULT_IMAGE =
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop';

  rows: CheckRow[] = [];
  note = '';
  isSubmitting = false;

  constructor(
    private stockService: StockService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.stockService.getIngredients().subscribe({
      next: (res) => {
        if (res.success) {
          this.rows = res.data.map((ing: any) => ({
            _id: ing._id,
            name: ing.name,
            imageUrl: ing.imageUrl,
            baseUnit: ing.baseUnit,
            subUnit: ing.subUnit,
            conversionRate: ing.conversionRate || 1,
            actualBaseQty: null,
            actualSubQty: null,
          }));
          this.cdr.markForCheck();
        }
      },
    });
  }

  totalSub(row: CheckRow): number {
    const base = Number(row.actualBaseQty) || 0;
    const sub = Number(row.actualSubQty) || 0;
    return base * row.conversionRate + sub;
  }

submit() {
  const currentUser = this.authService.getUser();

  const details = this.rows
    .filter((r) => r.actualBaseQty !== null || r.actualSubQty !== null)
    .map((r) => ({
      ingredientId: r._id,
      actualBaseQty: Number(r.actualBaseQty) || 0,
      actualSubQty: Number(r.actualSubQty) || 0,
    }));

  if (details.length === 0) {
    return alert('Vui lòng nhập số lượng kiểm kho cho ít nhất 1 nguyên liệu.');
  }

  this.isSubmitting = true;
  const payload = {
    staffId: currentUser?.id || 'unknown',
    staffName: currentUser?.name || '',
    note: this.note,
    details,
  };

  this.stockService.submitStaffReport(payload).subscribe({
    next: (res) => {
      this.isSubmitting = false;
      if (res.success) {
        alert('Đã gửi báo cáo kiểm kho thành công!');
        this.ngOnInit();
        this.note = '';
      }
    },
    error: (err) => {
      this.isSubmitting = false;
      alert(err.error?.message || 'Lỗi gửi báo cáo!');
    },
  });
}
}
