import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-page">
      <div class="placeholder-icon">👥</div>
      <h2>Quản lý nhân viên</h2>
      <p>Tính năng đang được phát triển</p>
    </div>
  `,
  styles: [
    `
      .placeholder-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        gap: 12px;
        color: #64748b;
      }
      .placeholder-icon {
        font-size: 48px;
      }
      h2 {
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }
      p {
        font-size: 14px;
        margin: 0;
      }
    `,
  ],
})
export class AdminStaffComponent {}
