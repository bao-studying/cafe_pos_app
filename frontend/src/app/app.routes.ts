import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { PosComponent } from './components/pos/pos.component';
import { AdminLayoutComponent } from './components/admin/layout/admin-layout.component';
import { AdminProductComponent } from './components/admin//products/admin-product.component';
import { AdminDashboardComponent } from './components//admin/dashboard/admin-dashboard.component';
import { AdminOrdersComponent } from './components/admin/orders/admin-orders.component';
import { AdminStaffComponent } from './components/admin/staff/admin-staff.component';
import { AdminStockComponent } from './components/admin/stock/admin-stock.component';
import { StaffStockCheckComponent } from './components/staff/stock-check/staff-stock-check.component';
import { MyShiftComponent } from './components/staff/my-shift/my-shift.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'pos', component: PosComponent },
  // 📋 Trang kiểm kho cuối ca cho nhân viên (mobile-friendly, đứng riêng ngoài admin)
  { path: 'stock-check', component: StaffStockCheckComponent },
  // 🕒 Trang "Ca làm của tôi" — đăng ký ca, check-in/out, xem lương tạm tính (mobile-friendly)
  { path: 'my-shift', component: MyShiftComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'products', component: AdminProductComponent },
      { path: 'staff', component: AdminStaffComponent },
      { path: 'stock', component: AdminStockComponent },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
