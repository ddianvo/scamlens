# Triển khai GitHub và Railway

Repository chứa ứng dụng trong thư mục `scamlens`. Railway chạy một service Node phục vụ cả React đã build và NestJS API cùng origin, kết nối tới service PostgreSQL riêng qua mạng nội bộ.

## Cấu hình service

- Source: repository GitHub, nhánh `codex/railway-deploy`.
- Root directory: `/scamlens`.
- Service settings được cấu hình trong Railway; bản tham chiếu nằm ở `docs/railway.settings.json`.
- Dockerfile: `Dockerfile`, tương đối với root directory.
- Health check: `/api/health`.
- Pre-deploy: `npm run deploy:prepare`, chạy migration và seed idempotent.
- Start: `npm start`. Ứng dụng nhận `PORT` do Railway cung cấp và bind `0.0.0.0`.

## Biến môi trường

| Biến                  | Giá trị                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`        | Tham chiếu `${{Postgres.DATABASE_URL}}` từ service PostgreSQL        |
| `NODE_ENV`            | `production`                                                         |
| `HOST`                | `0.0.0.0`                                                            |
| `COOKIE_SECURE`       | `true`                                                               |
| `SERVE_WEB`           | `true`                                                               |
| `JWT_SECRET`          | Secret ngẫu nhiên ít nhất 32 ký tự, chỉ lưu trên Railway             |
| `FRONTEND_ORIGIN`     | URL HTTPS chính xác; có thể bỏ trống để dùng `RAILWAY_PUBLIC_DOMAIN` |
| `DEMO_SEED`           | `true` cho website demo có dữ liệu mô phỏng                          |
| `DEMO_ADMIN_PASSWORD` | Mật khẩu ngẫu nhiên riêng của bản online                             |
| `DEMO_USER_PASSWORD`  | Mật khẩu ngẫu nhiên riêng của bản online                             |

Không đưa `.env`, token GitHub/Railway, database hoặc lịch sử kiểm tra trên máy lên Git. Container không chứa PostgreSQL portable hay dữ liệu cục bộ. Seed chỉ tạo dữ liệu mô phỏng và tài khoản mới nếu chưa có, không đổi mật khẩu tài khoản đã tồn tại.

Admin demo có email `admin@scamlens.test`. Mật khẩu online nằm ở biến `DEMO_ADMIN_PASSWORD` trên Railway; không dùng mật khẩu demo trong README cục bộ. Người dùng có thể tự đăng ký tài khoản trên website.

## Cập nhật

Push nhánh đã kết nối để Railway build lại Docker image, chạy migration/seed và kiểm tra sức khỏe trước khi chuyển lưu lượng. Nếu chưa kết nối GitHub App với repository, có thể upload chính bản mã nguồn đã commit bằng `railway up --service scamlens --ci` từ thư mục `scamlens`.

Thống kê và báo cáo trên bản online lấy từ database Railway, độc lập với bản cục bộ. Việc có/chưa có báo cáo không xác định một đối tượng an toàn hoặc lừa đảo.

Tài liệu: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [Pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command).
