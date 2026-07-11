// Môi trường production (build để deploy, VD Render) — backend & frontend
// chạy chung 1 service/domain, nên dùng URL TƯƠNG ĐỐI (rỗng) để tự động gọi
// đúng domain đang chạy, không cần sửa lại khi đổi domain/URL Render sau này.
export const environment = {
  production: true,
  apiBaseUrl: '',
};
