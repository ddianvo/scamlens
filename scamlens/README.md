# ScamLens

Website tiếng Việt hỗ trợ kiểm tra dấu hiệu lừa đảo trong tin nhắn và URL, tra cứu báo cáo đã kiểm duyệt, gửi báo cáo và quản trị. Đồ án chạy cục bộ, không cần API key hoặc dịch vụ phân tích trả phí.

## Chạy nhanh

Yêu cầu **Node.js 22.12 trở lên** (đã kiểm tra với Node 24), npm và kết nối mạng cho lần cài đặt đầu. Chạy trong thư mục `scamlens`:

```powershell
npm install
npm run demo
```

Lệnh demo tạo `.env` nếu chưa có, sinh JWT secret ngẫu nhiên, khởi động PostgreSQL thật trên máy, build hai ứng dụng, chạy migration và seed, sau đó mở các server phát triển. Nếu cấu hình một database bên ngoài, cần khởi động database đó trước. Truy cập **http://127.0.0.1:5173**. API: **http://127.0.0.1:3001/api**. Giữ terminal chạy khi demo.

Tài khoản mô phỏng mặc định (được điều khiển bởi `.env`):

| Quyền | Email                 | Mật khẩu         |
| ----- | --------------------- | ---------------- |
| User  | `user@scamlens.test`  | `UserDemo!2026`  |
| Admin | `admin@scamlens.test` | `AdminDemo!2026` |

Tất cả tên miền, số điện thoại và tài khoản trong seed đều là dữ liệu giả lập có nhãn. Địa chỉ IP minh họa là `192.0.2.10`, tên miền dùng `example.com` hoặc `.test`. Tắt `DEMO_SEED` trước khi dùng dữ liệu thực. Seed không đổi mật khẩu hay ghi đè quy tắc đã tồn tại.

## Cài đặt từng bước

```powershell
npm install
Copy-Item .env.example .env
# Sửa JWT_SECRET thành chuỗi ngẫu nhiên ít nhất 32 ký tự trong .env.
```

Chọn một trong ba cách chạy database:

1. `npm run db:local`: PostgreSQL 18 portable, không yêu cầu Docker hay cài dịch vụ hệ thống. Trên Windows, runtime và dữ liệu nằm tại `%LOCALAPPDATA%\ScamLensRuntime`, tránh lỗi đường dẫn có dấu của initdb. Có thể cấu hình `LOCAL_DB_RUNTIME` thành một thư mục không dấu khác. Trên macOS/Linux, dữ liệu nằm trong `.local/postgres`; chạy với tài khoản người dùng thông thường. Database chỉ lắng nghe ở loopback.
2. `docker compose up -d`: database ở `127.0.0.1:55432`, volume `scamlens-data` giữ dữ liệu. Không chạy đồng thời với `db:local` trên cùng cổng. Nếu đổi `POSTGRES_PASSWORD`, cập nhật cả `DATABASE_URL`.
3. PostgreSQL có sẵn: tạo user/database, cấp quyền sở hữu schema và cập nhật `DATABASE_URL` trong `.env`.

Mở terminal thứ hai ở thư mục dự án:

```powershell
npm run build
npm run migration:run
npm run seed
npm run dev
```

Frontend Vite: http://127.0.0.1:5173. Backend NestJS: http://127.0.0.1:3001/api. Vite proxy `/api` về backend, trình duyệt dùng cùng origin; không cần CORS rộng. Dùng đúng origin trong `FRONTEND_ORIGIN`. Frontend tự cập nhật khi sửa mã; sau khi sửa backend, chạy `npm run build -w apps/api`, Node watch tự khởi động lại bản biên dịch.

`npm run migration:run` và `npm run seed` có thể chạy lại, không tạo bản ghi trùng. `npm run migration:revert` hoàn tác migration cuối và **xóa các bảng dữ liệu của migration đó**; chỉ dùng với database thử nghiệm có thể bỏ đi.

Database portable giữ dữ liệu khi tắt máy/chạy lại. `Ctrl+C` dừng launcher; trên Windows, nếu PostgreSQL vẫn chạy nền, có thể dừng nhẹ bằng:

```powershell
& "$env:LOCALAPPDATA\ScamLensRuntime\postgres-18.6\bin\pg_ctl.exe" stop -D "$env:LOCALAPPDATA\ScamLensRuntime\data-55432" -m fast -w
```

Không xóa thư mục dữ liệu khi PostgreSQL còn chạy. PostgreSQL portable sẽ dùng lại instance của chính thư mục runtime nếu nó đã chạy.

## Cấu trúc

```text
scamlens/
├── apps/
│   ├── api/src/
│   │   ├── auth/          JWT, cookie, hash mật khẩu, guards User/Admin
│   │   ├── analysis/      Module, service, engine, kiểm thử và brands.json
│   │   ├── reports/       Báo cáo cá nhân và tra cứu công khai
│   │   ├── history/       Lưu chủ động, xem và xóa lịch sử riêng
│   │   ├── admin/         Duyệt/bác bỏ, đối tượng xác minh, quy tắc, thống kê
│   │   ├── common/        DTO, validation và bộ xử lý lỗi không log nội dung
│   │   └── database/      Entities, DataSource, migrations, seed và CLI
│   └── web/src/
│       ├── main.tsx       Điểm khởi động React
│       ├── components/    Layout, công cụ kiểm tra, kết quả và UI dùng chung
│       ├── pages/         Trang chủ, tài khoản, báo cáo, quản trị và cẩm nang
│       ├── auth-context.tsx  Trạng thái tài khoản phía giao diện
│       ├── api.ts         HTTP client, kiểu dữ liệu và xử lý lỗi
│       └── styles.css     Responsive, Tailwind, focus và giảm chuyển động
├── scripts/               Launcher demo và PostgreSQL portable
├── tests/integration.mjs   Kiểm thử API qua HTTP + PostgreSQL thật
├── docker-compose.yml
├── .env.example
└── package-lock.json
```

Backend dùng NestJS Modules/Controllers/Services, DTO với class-validator, TypeORM Entities và migration; `synchronize: false`. Frontend React, TypeScript, Vite, Tailwind CSS và Lucide. CSS layout riêng chạy cùng Tailwind. Rollup WebAssembly giúp build trên máy chặn native addon; không cần giảm chính sách bảo mật Windows. Font Be Vietnam Pro có font hệ thống dự phòng khi ngoại tuyến.

## Các trang và luồng demo

- `/`: ba tab kiểm tra tin nhắn, kiểm tra URL, tra cứu; kết quả ngay bên dưới.
- `/tra-cuu`: trang tra cứu/kết quả, có thể mở với tham số tìm kiếm.
- `/gui-bao-cao`: User đăng nhập gửi loại, định danh, mô tả và bằng chứng dạng văn bản.
- `/dang-nhap`, `/dang-ky`: xác thực và tạo tài khoản User; không cho tự gán quyền Admin.
- `/tai-khoan`: lịch sử chủ động lưu, xem kết quả và xóa; theo dõi báo cáo và lý do xử lý.
- `/quan-tri`: Admin duyệt/bác bỏ có lý do, viết mô tả công khai, quản lý đối tượng và quy tắc, xem thống kê thật.
- `/huong-dan`: cách tính điểm, giới hạn, bảo vệ thông tin và hành động tiếp theo.

Kịch bản trình bày:

1. Chọn “Tin đáng ngờ”, kiểm tra; mẫu mặc định đạt 100 điểm, xem đoạn tô nổi và từng nhóm trọng số.
2. Chọn “Tin cảnh báo”; câu không cung cấp OTP không bị cộng điểm trong mẫu này.
3. Thử URL `http://192.0.2.10/login` (50 điểm theo cấu hình mặc định), `https://qua-tang.test/nhan-thuong` và `https://example.com`. Thử URL sai để thấy lỗi mà nội dung vẫn được giữ lại.
4. Tra `qua-tang.test` hoặc `+84 900 000 001` để thấy báo cáo mô phỏng đã duyệt và định danh được che; tra một tên miền `.test` chưa có để thấy trạng thái trống.
5. User gửi báo cáo cho một tên miền `.test` mới. Khi còn chờ duyệt, tra cứu công khai không thấy. Đăng xuất, đăng nhập Admin, duyệt kèm lý do và bản mô tả công khai đã bỏ dữ liệu cá nhân. Tra lại để thấy báo cáo đã duyệt.
6. Admin có thể bác bỏ lại kèm lý do; báo cáo biến mất khỏi tra cứu công khai nhưng người gửi vẫn theo dõi được trạng thái.

## Điểm rủi ro và mở rộng

Mỗi **nhóm** từ khóa được cộng trọng số tối đa một lần:

| Nhóm mặc định                                     | Điểm |
| ------------------------------------------------- | ---: |
| Thông tin bảo mật: OTP, mật khẩu, mã xác thực…    |   35 |
| Thanh toán trước: chuyển tiền, đóng phí, đặt cọc… |   30 |
| Lợi nhuận bất thường                              |   25 |
| Có dấu hiệu mạo danh cơ quan/tổ chức              |   20 |
| Áp lực thời gian                                  |   15 |

`điểm = min(100, tổng trọng số các nhóm khớp đang bật)`.

- 0–24: **Ít dấu hiệu**.
- 25–59: **Cần thận trọng**.
- 60–100: **Nhiều dấu hiệu đáng ngờ**.

Chuẩn hóa không phân biệt dấu và hoa/thường; giữ ánh xạ Unicode để tô đúng đoạn gốc. Ngữ cảnh phủ định/cảnh báo gần từ khóa được bỏ qua theo mệnh đề. Từ khóa cần ranh giới từ. Không chèn HTML từ nội dung người dùng; React render văn bản và các thẻ `mark` được tạo từ vị trí ký tự.

Admin thêm/sửa/bật/tắt quy tắc, trọng số, giải thích và hướng xử lý ở “Quy tắc & trọng số”; thay đổi áp dụng ngay từ database. Từ khóa là văn bản, không phải regex do Admin cung cấp. Cấu hình nhận diện thương hiệu ở `apps/api/src/analysis/brands.json`; danh sách này là đối chiếu thủ công, không tự cập nhật. Các yếu tố URL và trọng số nằm trong `analysis/engine.ts` (HTTP 10, IP 25, userinfo 30, Unicode 20, cấu trúc phức tạp 10, thương hiệu 30, đường dẫn nhạy cảm 15, bản ghi cảnh báo 50).

Phương pháp có thể bỏ sót biến thể từ, tiếng lóng, nội dung trong ảnh, cách mạo danh mới và hiểu nhầm ngữ cảnh/trích dẫn phức tạp. Điểm không phải xác suất lừa đảo hoặc độ tin cậy AI. HTTPS không bảo chứng an toàn. Tên miền đã đối chiếu không tự làm giảm điểm. Không khớp quy tắc, chưa có tên miền trong danh sách hoặc chưa có báo cáo đều không đủ để kết luận an toàn.

URL được phân tích bằng `URL` và `tldts`, không gửi request, không theo redirect, không quét malware/DNS/WHOIS. Xác minh trong bản demo là quyết định của Admin dựa trên nội dung gửi, không có tích hợp xác minh cơ quan bên ngoài.

## Dữ liệu và bảo vệ truy cập

- JWT 8 giờ trong cookie HttpOnly/SameSite=Strict; kiểm tra chữ ký, issuer, audience và sessionVersion phía server. Logout tăng sessionVersion, vô hiệu token cũ, kể cả khi bị phát lại.
- bcrypt cost 12; hash không được trả về API. Tất cả endpoint Admin kiểm tra đăng nhập và role ở server.
- Khách kiểm tra không ghi lịch sử. `POST /history` yêu cầu đăng nhập, tính lại kết quả phía server và chỉ lưu khi người dùng chủ động chọn.
- Lịch sử chỉ truy vấn/xóa với `userId` từ JWT. Báo cáo cá nhân cũng giới hạn người gửi. API không nhận userId để chọn chủ sở hữu.
- Tra cứu chỉ lấy `approved`; không trả bằng chứng, người gửi, định danh cá nhân đầy đủ hoặc mô tả gốc. Admin phải viết riêng mô tả công khai. Hệ thống che chuỗi số dài/email; Admin vẫn phải kiểm tra cả tên người, địa chỉ và dữ liệu nhận diện khác trước khi công bố.
- Tên miền chuẩn hóa từ URL; số điện thoại hỗ trợ `+84`, `84`, khoảng trắng/dấu phân cách; tài khoản bỏ khoảng trắng/gạch nối và kết hợp tên ngân hàng đã chuẩn hóa không dấu.
- Kiểm tra chính xác theo định danh; tên miền phụ có bản ghi riêng khi tra báo cáo. Đối chiếu cảnh báo URL có kế thừa tên miền cha, ưu tiên bản ghi cụ thể hơn. Không tự suy đoán ngân hàng từ số tài khoản.
- Validation cả trình duyệt và API; tối đa 10.000 ký tự tin nhắn, 2.048 ký tự URL, 2.000 ký tự mô tả, 5.000 ký tự bằng chứng. API giới hạn 60 request/phút/IP/endpoint; đăng nhập/đăng ký 10/phút. Bộ đếm lưu trong RAM, phù hợp một instance demo, không thay thế rate limiter dùng chung khi chạy nhiều máy.
- Helmet, chỉ bind loopback, kiểm tra origin cho thao tác ghi và yêu cầu JSON. Không log mật khẩu, token hay toàn bộ tin nhắn; exception filter không xuất tham số database. `.env` và runtime không nằm trong Git.
- Lịch sử/báo cáo cá nhân tối đa 100 bản ghi mỗi lần tải; Admin 200 báo cáo; tra cứu 50 kết quả. Phân trang, chính sách lưu trữ/xóa tài khoản và khôi phục mật khẩu nằm ngoài phạm vi demo.

## Kiểm thử

Để PostgreSQL và API đang chạy, dùng `.env` demo riêng:

```powershell
npm run build
npm test
```

12 kiểm thử engine: tin bình thường, trọng số/dedup, chặn điểm >100, ngữ cảnh phủ định, mệnh đề cảnh báo tách biệt, highlight Unicode, ranh giới từ, URL lỗi, IP/userinfo/HTTPS, thương hiệu/Unicode/danh sách xác minh, chuẩn hóa/che dữ liệu, quy tắc tắt.

7 nhóm kiểm thử HTTP tích hợp (và 1 test cha): đăng ký/cookie/hash, validation/ngữ cảnh/tra cứu trống, quyền lịch sử và Admin, gửi→duyệt→công khai→bác bỏ, thay quy tắc/danh sách/thống kê thật, cross-origin/logout/xóa lịch sử, giới hạn tần suất. Test tạo dữ liệu có mã riêng và dọn các bản ghi của chính nó trong `finally`. Không chạy với database chứa dữ liệu thực. Test throttle dùng endpoint health, có thể trả 429 trong tối đa một phút sau khi kiểm thử.

## Cấu hình / triển khai ngoài máy

`.env.example` giải thích các giá trị cần thiết. Chỉ frontend bundle có thể phân phối tĩnh; mọi chức năng cần API NestJS và PostgreSQL. Không dùng `vite preview` độc lập để kiểm tra toàn bộ ứng dụng vì preview mặc định không cấu hình proxy API.

Đã bổ sung Dockerfile và chế độ production: NestJS phục vụ React đã build cùng API, nhận `HOST`/`PORT`, hỗ trợ HTTPS qua Railway và cookie Secure/HttpOnly. Xem [hướng dẫn Railway](docs/railway.md). Biến bí mật và database online được cấu hình riêng, không đưa `.env` hoặc dữ liệu trên máy lên Git.

Nếu mở rộng triển khai thực tế, bổ sung backup, chính sách lưu trữ, giới hạn truy cập bằng chứng, kiểm duyệt dữ liệu cá nhân và rate limiter dùng chung khi chạy nhiều instance.

Tài liệu đối chiếu: [NestJS authentication](https://docs.nestjs.com/security/authentication), [NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting), [TypeORM migrations](https://typeorm.io/docs/migrations/setup/).
