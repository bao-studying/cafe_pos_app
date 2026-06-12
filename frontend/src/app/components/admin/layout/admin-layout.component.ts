import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <router-outlet />

      <!-- FLOATING PILL DOCK -->
      <nav class="pill-dock" [class.dock-hidden]="isHidden">
        <a
          routerLink="/admin/dashboard"
          routerLinkActive="active"
          class="dock-item"
          title="Doanh thu"
        >
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span class="dock-label">Doanh thu</span>
        </a>

        <a routerLink="/admin/orders" routerLinkActive="active" class="dock-item" title="Đơn hàng">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          </div>
          <span class="dock-label">Đơn hàng</span>
        </a>

        <div class="dock-divider"></div>

        <a
          routerLink="/admin/products"
          routerLinkActive="active"
          class="dock-item"
          title="Sản phẩm"
        >
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <span class="dock-label">Sản phẩm</span>
        </a>
        <a
          routerLink="/admin/stock"
          routerLinkActive="active"
          class="dock-item"
          title="Sản phẩm"
        >
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <span class="dock-label">Tồn kho</span>
        </a>

        <a routerLink="/admin/staff" routerLinkActive="active" class="dock-item" title="Nhân viên">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span class="dock-label">Nhân viên</span>
        </a>

        <div class="dock-divider"></div>

        <button class="dock-item dock-pos" (click)="goToPos()" title="Về POS">
          <div class="dock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <span class="dock-label">POS</span>
        </button>
      </nav>

      <!-- Toggle ẩn/hiện dock -->
      <button
        class="dock-toggle"
        (click)="isHidden = !isHidden"
        [title]="isHidden ? 'Hiện menu' : 'Ẩn menu'"
      >
        {{ isHidden ? '▲' : '▼' }}
      </button>
    </div>
  `,
  styles: [
    `
      .admin-shell {
        min-height: 100vh;
        background: #f1f5f9;
        position: relative;
      }

      /* ── FLOATING PILL DOCK ── */
      .pill-dock {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9999px;
        padding: 8px 12px;
        box-shadow:
          0 20px 60px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        z-index: 1000;
        transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .pill-dock.dock-hidden {
        transform: translateX(-50%) translateY(120px);
        opacity: 0;
        pointer-events: none;
      }

      .dock-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 8px 14px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-decoration: none;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.55);
        position: relative;
      }

      .dock-item:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        transform: translateY(-4px) scale(1.08);
      }

      .dock-item.active {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }

      .dock-item.active .dock-icon {
        background: #0ea5e9;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.5);
      }

      .dock-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .dock-icon svg {
        width: 18px;
        height: 18px;
        stroke-width: 1.8;
      }

      .dock-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      .dock-divider {
        width: 1px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 4px;
      }

      .dock-pos .dock-icon {
        background: rgba(234, 88, 12, 0.2);
      }
      .dock-pos:hover .dock-icon {
        background: rgba(234, 88, 12, 0.4);
      }

      /* Toggle button */
      .dock-toggle {
        position: fixed;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
        border-radius: 9999px;
        padding: 2px 12px;
        font-size: 10px;
        cursor: pointer;
        z-index: 1001;
        transition: all 0.2s;
      }

      .dock-toggle:hover {
        background: rgba(15, 23, 42, 0.9);
        color: #fff;
      }
    `,
  ],
})
export class AdminLayoutComponent {
  isHidden = false;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  goToPos() {
    this.router.navigate(['/pos']);
  }
}
