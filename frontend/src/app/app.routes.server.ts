import { RenderMode, ServerRoute } from '@angular/ssr';

// ĐÃ ĐỔI: Toàn bộ route trước đây là RenderMode.Prerender (dựng sẵn HTML lúc build,
// chạy HTTP call trên server/build machine). App này (POS + Admin) không cần SEO,
// mọi trang đều sau đăng nhập + dữ liệu real-time (Socket.io) — Prerender gây lỗi
// build vì lúc build chưa có domain thật để URL API tương đối ("/api/...") tự resolve.
// Chuyển sang RenderMode.Client: bỏ hẳn render phía server, mọi API call chạy thật
// trong trình duyệt (nơi URL tương đối luôn đúng theo domain đang mở).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
