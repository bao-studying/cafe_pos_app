import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  // ✅ FIX LAG: OnPush chỉ re-render khi data thực sự thay đổi
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('pinInput') pinInput!: ElementRef<HTMLInputElement>;

  name = '';
  phone = '';

  // ✅ FIX LAG: Dùng string thay vì array number để tránh re-render không cần thiết
  password = '';

  isLoginMode = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Mảng cố định để *ngFor không tạo lại mỗi lần
  readonly PIN_DIGITS = [0, 1, 2, 3];

  private particleCount = 30; // Giảm từ 50 → 30 để nhẹ hơn

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initParticles();
      this.focusHiddenInput();
    }
  }

  focusHiddenInput() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      this.pinInput?.nativeElement?.focus();
    }, 100);
  }

  initParticles() {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
    };

    const particles: Particle[] = Array.from({ length: this.particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      life: Math.random() * 1000 + 500,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;

        if (p.x < 0) p.x = canvas.width;
        else if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        else if (p.y > canvas.height) p.y = 0;

        const alpha = Math.max(0, p.life / 500) * p.opacity;
        ctx.fillStyle = `rgba(0,212,170,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) {
          particles[i] = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.1,
            life: Math.random() * 1000 + 500,
          };
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    // ✅ Dùng ResizeObserver thay vì window resize event
    const ro = new ResizeObserver(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    ro.observe(document.body);
  }

  // ✅ FIX LAG: Không dùng [(ngModel)] cho PIN — chỉ xử lý thủ công
  appendPasswordDigit(digit: number) {
    if (this.isLoading || this.password.length >= 4) return;
    this.password += digit.toString();
    this.cdr.markForCheck(); // Thông báo OnPush cần re-render

    if (this.password.length === 4) {
      setTimeout(() => this.onSubmit(), 300);
    }
  }

  removeLastDigit() {
    if (this.isLoading || this.password.length === 0) return;
    this.password = this.password.slice(0, -1);
    this.cdr.markForCheck();
  }

  onPasswordKeydown(event: KeyboardEvent) {
    event.preventDefault();

    if (event.key === 'Backspace') {
      this.removeLastDigit();
      return;
    }

    if (event.key === 'Enter' && this.password.length === 4) {
      this.onSubmit();
      return;
    }

    if (!/[0-9]/.test(event.key)) return;
    this.appendPasswordDigit(parseInt(event.key, 10));
  }

  triggerTransition() {
    if (this.isLoading) return;
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.name = '';
    this.password = '';
    this.cdr.markForCheck();
    this.focusHiddenInput();
  }

  // ✅ FIX LAG: trackBy ngăn Angular destroy/recreate DOM node mỗi lần re-render
  trackByIndex(index: number): number {
    return index;
  }

  onSubmit() {
    if (this.isLoading) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.phone = this.phone?.trim() ?? '';
    if (!this.phone) {
      this.errorMessage = 'Vui lòng nhập số điện thoại.';
      this.cdr.markForCheck();
      return;
    }

    if (this.phone.length < 9) {
      this.errorMessage = 'Số điện thoại không hợp lệ.';
      this.cdr.markForCheck();
      return;
    }

    if (this.password.length < 4) {
      this.errorMessage = 'Vui lòng nhập đủ 4 chữ số PIN.';
      this.password = '';
      this.focusHiddenInput();
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    if (this.isLoginMode) {
      const credentials = { phone: this.phone, password: this.password };
      console.log('Đăng nhập:', credentials);

  this.authService.login(credentials).subscribe({
    next: (res) => {
      this.isLoading = false;

      // 1. Lưu token bảo mật vào LocalStorage
      this.authService.saveToken(res.token);

      // 2. Trích xuất thông tin user từ phản hồi của Backend
      const user = res.user;
      const backendName = user?.name || 'Dương Gia Bảo';
      this.authService.saveUserName(backendName);

      // 🌟 HIỂN THỊ THÔNG BÁO CHÀO MỪNG PHÙ HỢP VỚI ROLE
      if (user?.role === 'admin') {
        this.successMessage = `Xin chào Admin ${backendName}! Đang chuyển hướng sang trang quản trị...`;
      } else {
        this.successMessage = `Đăng nhập thành công! Đang mở ca thu ngân cho ${backendName}...`;
      }

      this.cdr.markForCheck();

      // 🌟 TỰ ĐỘNG PHÂN QUYỀN ĐIỀU HƯỚNG DỰA TRÊN ROLE TỪ DATABASE
      setTimeout(() => {
        if (user?.role === 'admin') {
          // Nếu role là admin -> đá thẳng sang trang quản lý sản phẩm
          this.router.navigate(['/admin/products']);
        } else {
          // Nếu là nhân viên/user thường -> vào trang bán hàng POS như cũ
          this.router.navigate(['/pos']);
        }
      }, 1500);
    },
    error: (err) => {
      this.isLoading = false;
      this.errorMessage = err.error?.message || 'Số điện thoại hoặc PIN không đúng.';
      this.password = '';
      this.focusHiddenInput();
      this.cdr.markForCheck();
    },
  });
    } else {
      this.name = this.name?.trim() ?? '';
      if (!this.name) {
        this.isLoading = false;
        this.errorMessage = 'Vui lòng nhập họ tên thu ngân.';
        this.cdr.markForCheck();
        return;
      }

      const userData = { name: this.name, phone: this.phone, password: this.password };
      console.log('Đăng ký:', userData);

      this.authService.register(userData).subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Đăng ký thành công! Chuyển sang đăng nhập...';
          this.cdr.markForCheck();

          setTimeout(() => this.triggerTransition(), 1500);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Đăng ký thất bại, số điện thoại đã tồn tại.';
          this.password = '';
          this.focusHiddenInput();
          this.cdr.markForCheck();
        },
      });
    }
  }
}
