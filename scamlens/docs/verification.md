# Kiểm tra bản bàn giao

Ngày 19/11/2026, trên Windows với Node.js 24 và PostgreSQL 18.6 cục bộ.

- Build TypeScript backend và build production frontend: đạt.
- `npm run demo`: đã khởi động đầy đủ database, migration, seed, NestJS và Vite.
- Migration và seed đã chạy lại nhiều lần: 2 tài khoản, 4 báo cáo mô phỏng, 5 quy tắc, 2 đối tượng xác minh; không tạo dữ liệu trùng.
- 12 kiểm thử engine và 7 nhóm kiểm thử tích hợp HTTP (8 test tính cả test cha): đạt. Luồng tích hợp có cả tra cứu ngân hàng, duyệt/bác bỏ, bảo vệ lịch sử và quản trị, logout vô hiệu JWT, validation và rate limiting.
- `npm audit`: không phát hiện lỗ hổng trong dependency tree đã cài tại thời điểm kiểm tra.
- Trình duyệt: kiểm tra tin nhắn đáng ngờ (100 điểm), cảnh báo OTP (0 điểm), URL lỗi giữ nội dung, tra cứu chưa có báo cáo, đăng nhập Admin và thống kê thật.
- Responsive: kiểm tra tại 1280×900 và 390×844; không tràn ngang. Menu mobile và phím mũi tên chuyển tab hoạt động.
- Ảnh chụp: [desktop](screenshots/desktop.jpg), [mobile](screenshots/mobile.jpg).

Địa chỉ demo: http://127.0.0.1:5173. Các kiểm tra trên xác nhận luồng của đồ án, không phải đánh giá khả năng phát hiện mọi hình thức lừa đảo ngoài thực tế.
