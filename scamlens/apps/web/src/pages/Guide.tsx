import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Link2,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Notice, PageHead, Step } from '../components/ui';
import { Admin } from './Admin';

export function Guide() {
  return (
    <div className="container guide-page">
      <PageHead eyebrow="CẨM NANG AN TOÀN SỐ" title="Hiểu rõ dấu hiệu. Giữ quyền chủ động.">
        Một điểm số giúp bạn chú ý đúng chỗ. Quyết định cần thêm ngữ cảnh và sự xác minh.
      </PageHead>
      <div className="guide-grid">
        <article className="card">
          <div className="icon-tile">
            <SlidersHorizontal size={24} />
          </div>
          <h2>Điểm rủi ro được tính thế nào?</h2>
          <p>
            ScamLens dò các từ khóa theo từng nhóm quy tắc đang bật trong database. Mỗi nhóm có một
            trọng số, chỉ cộng một lần dù từ khóa lặp lại. Tổng điểm được giới hạn ở 100.
          </p>
          <div className="score-formula">Điểm = min(100, tổng trọng số các nhóm khớp)</div>
          <ul className="legend">
            <li>
              <span className="legend-dot low" />
              <strong>0–24 · Ít dấu hiệu</strong>
              <span>Chưa có nhiều dấu hiệu theo quy tắc hiện có.</span>
            </li>
            <li>
              <span className="legend-dot medium" />
              <strong>25–59 · Cần thận trọng</strong>
              <span>Nên kiểm tra kỹ trước khi tương tác.</span>
            </li>
            <li>
              <span className="legend-dot high" />
              <strong>60–100 · Nhiều dấu hiệu đáng ngờ</strong>
              <span>Tạm dừng và xác minh độc lập.</span>
            </li>
          </ul>
          <Notice>Đây không phải xác suất lừa đảo, đánh giá của AI hay kết luận pháp lý.</Notice>
        </article>
        <article className="card">
          <div className="icon-tile">
            <MessageSquareText size={24} />
          </div>
          <h2>Đọc cả nội dung, không chỉ từ khóa</h2>
          <p>
            Nhóm quy tắc tin nhắn mặc định gồm thông tin bảo mật (35), thanh toán trước (30), lợi
            nhuận bất thường (25), mạo danh (20) và áp lực thời gian (15).
          </p>
          <p>
            Ngữ cảnh phủ định và cảnh báo gần từ khóa được xét để giảm đánh dấu nhầm. Ví dụ “Không
            cung cấp OTP cho bất kỳ ai” được nhận diện là lời nhắc phòng tránh.
          </p>
          <blockquote>
            “Cung cấp OTP, chuyển tiền ngay lập tức.”
            <span>35 + 30 + 15 = 80 điểm theo quy tắc mặc định.</span>
          </blockquote>
          <p>
            Quy tắc có thể bỏ sót tiếng lóng, cách viết biến thể, hoặc hiểu nhầm câu trích dẫn. Hãy
            đọc các đoạn được tô nổi và lý do bên dưới.
          </p>
        </article>
        <article className="card">
          <div className="icon-tile">
            <Link2 size={24} />
          </div>
          <h2>HTTPS chưa đủ để tin tưởng</h2>
          <p>
            ScamLens tách tên máy chủ, tên miền đăng ký và tên miền phụ; kiểm tra IP, ký tự quốc tế,
            dấu @, thương hiệu trong cấu hình, đường dẫn nhạy cảm và danh sách Admin xác minh.
          </p>
          <p>
            Đường link được phân tích dưới dạng văn bản. Công cụ không tải website, quét mã độc,
            kiểm tra thời gian đăng ký hoặc theo dõi chuyển hướng.
          </p>
          <Notice>
            Trong địa chỉ https://ngan-hang.example.com, tên miền đăng ký là example.com. Chữ
            “ngan-hang” ở phía trước không chứng minh quyền sở hữu.
          </Notice>
        </article>
        <article className="card">
          <div className="icon-tile">
            <ShieldCheck size={24} />
          </div>
          <h2>Ba việc nên làm khi nghi ngờ</h2>
          <Step number="01" title="Dừng tương tác">
            Không cung cấp thông tin bảo mật, không chuyển tiền và không cài ứng dụng lạ.
          </Step>
          <Step number="02" title="Xác minh độc lập">
            Tự mở ứng dụng hoặc tìm kênh chính thức của đơn vị. Không dùng thông tin liên hệ từ tin
            nhắn đáng ngờ.
          </Step>
          <Step number="03" title="Giữ lại bằng chứng">
            Lưu đoạn trao đổi và thời gian; gửi báo cáo kèm thông tin có thể kiểm tra, loại bỏ dữ
            liệu bí mật.
          </Step>
          <Link className="text-link" to="/gui-bao-cao">
            Gửi một báo cáo
            <ArrowUpRight size={16} />
          </Link>
        </article>
      </div>
      <div className="card privacy-guide">
        <LockKeyhole size={28} />
        <div>
          <h2>Dữ liệu và quyền riêng tư</h2>
          <p>
            Khách kiểm tra mà không cần đăng nhập; nội dung không tự lưu. Người đăng nhập chủ động
            chọn lưu lịch sử và có thể xóa từng kết quả. Báo cáo chờ duyệt không được tra cứu công
            khai. Số điện thoại, tài khoản và dữ liệu nhạy cảm dạng số/email được che trong kết quả
            công khai.
          </p>
          <p>
            Các bản ghi gắn nhãn “Dữ liệu mô phỏng” dùng cho đồ án, không phản ánh sự việc thực tế.
            Không có báo cáo không đồng nghĩa với an toàn; có báo cáo cũng không tự nó chứng minh
            hành vi lừa đảo.
          </p>
        </div>
      </div>
    </div>
  );
}
