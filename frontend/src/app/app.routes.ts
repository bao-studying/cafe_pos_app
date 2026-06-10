import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { PosComponent } from './components/pos/pos.component'
import { AdminProductComponent } from './components/admin/admin-product.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'pos', component: PosComponent },
  { path: 'admin/products', component: AdminProductComponent }, 
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
