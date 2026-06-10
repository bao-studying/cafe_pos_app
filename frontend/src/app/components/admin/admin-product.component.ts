import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../services/product.service';

export interface Product {
  _id?: string;
  name: string;
  category: string;
  price: number;
  costPrice: number; // Giá nhập bao gồm
  quantity: number; // Số lượng tồn
  description: string;
  imageUrl: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-admin-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-product.component.html',
  styleUrl: './admin-product.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductComponent implements OnInit {
  allProducts: Product[] = [];
  filteredProducts: Product[] = []; // Mảng dùng để tìm kiếm và hiển thị thực tế
  pagedProducts: Product[] = [];
  currentPage = 1;
  itemsPerPage = 7;

  // Quản lý Tìm kiếm & Bộ lọc
  searchQuery: string = '';
  selectedCategoryFilter: string = 'Tất cả';
  readonly CATEGORIES = [
    'Cà phê',
    'Trà trái cây',
    'Đá xay',
    'Sinh tố',
    'Nước ép',
    'Bánh ngọt',
    'Nguyên liệu',
  ];

  // Quản lý Trạng thái Popup Modal
  isModalOpen = false;
  modalMode: 'add' | 'detail' | 'edit' = 'detail';

  // Đối tượng tương tác trong form popup
  currentProduct: Product = this.getEmptyProduct();
  readonly DEFAULT_IMAGE =
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop';

  constructor(
    private router: Router,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  getEmptyProduct(): Product {
    return {
      name: '',
      category: 'Cà phê',
      price: 0,
      costPrice: 0,
      quantity: 0,
      description: '',
      imageUrl: '',
    };
  }

  loadProducts() {
    // Gọi API truyền kèm tham số isAdmin=true để lấy toàn bộ danh mục bao gồm cả Nguyên liệu
    this.productService.getProductsAdmin().subscribe({
      next: (res) => {
        if (res.success) {
          this.allProducts = res.data;
          this.applyFilterAndSort();
        }
      },
      error: (err) => console.error('Lỗi tải thực đơn:', err),
    });
  }

  // 🌟 THUẬT TOÁN LỌC, TÌM KIẾM & ĐẨY NGUYÊN LIỆU HẾT HÀNG LÊN ĐẦU
  applyFilterAndSort() {
    let result = [...this.allProducts];

    // 1. Thực hiện tìm kiếm theo tên (Không phân biệt hoa thường)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // 2. Thực hiện lọc theo danh mục
    if (this.selectedCategoryFilter !== 'Tất cả') {
      result = result.filter((p) => p.category === this.selectedCategoryFilter);
    }

    // 3. Thuật toán phân loại ưu tiên: Đẩy nguyên liệu có số lượng < 3 lên đầu danh sách
    result.sort((a, b) => {
      const aAlert = a.category === 'Nguyên liệu' && (a.quantity ?? 0) < 3;
      const bAlert = b.category === 'Nguyên liệu' && (b.quantity ?? 0) < 3;

      if (aAlert && !bAlert) return -1;
      if (!aAlert && bAlert) return 1;
      return 0;
    });

    this.filteredProducts = result;
    this.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  updatePagination() {
    if (this.currentPage < 1) this.currentPage = 1;
    const total = this.filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / this.itemsPerPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.itemsPerPage);
    this.cdr.markForCheck();
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.itemsPerPage));
  }

  get pageStart() {
    return this.filteredProducts.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get pageEnd() {
    return Math.min(this.filteredProducts.length, this.currentPage * this.itemsPerPage);
  }

  get pageRange() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
      this.updatePagination();
    }
  }

  // Điều khiển các nút mở Popup Modal
  openAddModal() {
    this.currentProduct = this.getEmptyProduct();
    this.modalMode = 'add';
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  openDetailModal(product: Product) {
    this.currentProduct = { ...product };
    this.modalMode = 'detail';
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  switchToEdit() {
    this.modalMode = 'edit';
    this.cdr.markForCheck();
  }

  closeModal() {
    this.isModalOpen = false;
    this.cdr.markForCheck();
  }

  // Lưu thông tin (Dùng chung cho cả hành động Thêm mới và Sửa đổi)
  saveProduct() {
    if (!this.currentProduct.name.trim()) return alert('Vui lòng nhập tên món/nguyên liệu!');

    if (this.currentProduct.imageUrl && !this.currentProduct.imageUrl.trim()) {
      this.currentProduct.imageUrl = this.DEFAULT_IMAGE;
    }

    if (this.modalMode === 'add') {
      this.productService.addProduct(this.currentProduct).subscribe({
        next: (res) => {
          if (res.success) {
            this.allProducts.unshift(res.data);
            this.applyFilterAndSort();
            this.closeModal();
          }
        },
        error: (err) => alert(err.error?.message || 'Lỗi thêm sản phẩm!'),
      });
    } else if (this.modalMode === 'edit') {
      this.productService.updateProduct(this.currentProduct._id!, this.currentProduct).subscribe({
        next: (res) => {
          if (res.success) {
            const index = this.allProducts.findIndex((p) => p._id === this.currentProduct._id);
            if (index !== -1) this.allProducts[index] = res.data;
            this.applyFilterAndSort();
            this.closeModal();
          }
        },
        error: (err) => alert(err.error?.message || 'Lỗi cập nhật!'),
      });
    }
  }

  deleteProduct(id: string, event: Event) {
    event.stopPropagation(); // Không kích hoạt sự kiện click mở hàng chi tiết
    if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn mục này?')) {
      this.productService.deleteProduct(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.allProducts = this.allProducts.filter((p) => p._id !== id);
            this.applyFilterAndSort();
          }
        },
      });
    }
  }

  trackById(_: number, item: Product) {
    return item._id;
  }

  goBackToPos() {
    this.router.navigate(['/pos']);
  }
}
