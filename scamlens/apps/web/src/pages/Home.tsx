import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCheck, Flag, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api, type Report } from '../api';
import { Notice, PageHead, Step } from '../components/ui';
import { Tool } from '../components/Tool';
import { ReportCard } from '../components/ReportCard';

export function Home() {
  return (
    <>
      <div className="home-bg">
        <section className="container hero">
          <div>
            <div className="eyebrow">
              <span className="status-dot" />
              THÊM MỘT BƯỚC KIỂM TRA, BỚT MỘT LẦN LO LẮNG
            </div>
            <h1>
              Đừng vội tin.
              <br />
              Hãy nhìn qua <span>ScamLens.</span>
              <svg viewBox="0 0 300 12" aria-hidden="true">
                <path d="M3 8 Q140 -3 296 6" />
              </svg>
            </h1>
            <p>
              Một tin nhắn lạ, một đường link đáng ngờ?
              <br className="desktop-break" /> Kiểm tra các dấu hiệu trước khi bạn nhấp, trả lời hay
              chuyển tiền.
            </p>
          </div>
          <div className="hero-seal" aria-hidden="true">
            <div className="seal-orbit orbit-one" />
            <div className="seal-orbit orbit-two" />
            <div className="seal-center">
              <ShieldCheck size={62} strokeWidth={1.4} />
            </div>
            <span className="floating-tag tag-lock">
              <LockKeyhole size={14} />
              Riêng tư từ đầu
            </span>
            <span className="floating-tag tag-check">
              <CheckCheck size={15} />
              Hiểu rõ từng dấu hiệu
            </span>
            <span className="seal-dot" />
          </div>
        </section>
        <section className="container workspace" aria-label="Công cụ ScamLens">
          <Tool />
          <aside className="aside-stack">
            <div className="pause-card">
              <span className="small-caps">
                <span className="tiny-square" />
                MỘT NHỊP CHẬM LẠI
              </span>
              <div className="pause-art" aria-hidden="true">
                <span />
                <span />
                <div className="art-circle" />
              </div>
              <h2>
                Bình tĩnh kiểm tra.
                <br />
                Chủ động bảo vệ.
              </h2>
              <p>
                Kẻ gian thường muốn bạn hành động thật nhanh. Bạn luôn có quyền dừng lại để xác
                minh.
              </p>
              <Link to="/huong-dan">
                Nhận diện các chiêu trò
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="privacy-note">
              <div className="icon-tile">
                <LockKeyhole size={20} />
              </div>
              <div>
                <strong>Nội dung của bạn, quyền của bạn.</strong>
                <p>Không tự lưu tin nhắn. Chỉ lưu lịch sử khi bạn đăng nhập và chủ động chọn.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
      <section className="container recent-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">CÙNG NHAU CẢNH GIÁC</span>
            <h2>Báo cáo đã được kiểm duyệt</h2>
          </div>
          <Link to="/tra-cuu" className="text-link">
            Tra cứu báo cáo
            <ArrowRight size={17} />
          </Link>
        </div>
        <RecentReports />
      </section>
      <section className="container steps-section">
        <div>
          <span className="eyebrow">ĐƠN GIẢN, MINH BẠCH</span>
          <h2>
            Thêm góc nhìn.
            <br />
            Đưa ra quyết định tốt hơn.
          </h2>
          <Link to="/huong-dan" className="text-link">
            Tìm hiểu cách tính điểm
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="steps">
          <Step number="01" title="Dán nội dung cần kiểm tra">
            Tin nhắn, đường link hoặc thông tin bạn muốn tra cứu.
          </Step>
          <Step number="02" title="Hiểu vì sao đáng ngờ">
            Từng dấu hiệu đều đi kèm giải thích và trọng số rõ ràng.
          </Step>
          <Step number="03" title="Chọn hành động phù hợp">
            Dừng tương tác, xác minh độc lập hoặc gửi báo cáo.
          </Step>
        </div>
      </section>
      <section className="container contribution">
        <div className="icon-tile">
          <Flag size={25} />
        </div>
        <div>
          <h2>Một báo cáo, thêm một lời cảnh báo.</h2>
          <p>Chia sẻ điều bạn gặp phải. Báo cáo được kiểm duyệt trước khi công khai.</p>
        </div>
        <Link to="/gui-bao-cao" className="btn btn-outline">
          Gửi báo cáo
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}

export function RecentReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    api<Report[]>('/reports/recent')
      .then((r) => {
        setReports(r);
        setState('done');
      })
      .catch(() => setState('error'));
  }, []);
  return state === 'loading' ? (
    <div className="skeleton-grid">
      {[1, 2].map((n) => (
        <div key={n} className="skeleton" />
      ))}
    </div>
  ) : state === 'error' ? (
    <Notice error>Chưa tải được báo cáo. Hãy kiểm tra kết nối và tải lại trang.</Notice>
  ) : reports.length ? (
    <div className="report-grid">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  ) : (
    <Notice>Chưa có báo cáo được duyệt. Bạn vẫn có thể sử dụng công cụ kiểm tra.</Notice>
  );
}

export function LookupPage() {
  return (
    <div className="container narrow">
      <PageHead eyebrow="DỮ LIỆU CÓ KIỂM DUYỆT" title="Tra cứu trước khi tương tác.">
        Tìm thông tin trong các báo cáo đã được quản trị viên kiểm duyệt.
      </PageHead>
      <Tool lookupOnly />
    </div>
  );
}
