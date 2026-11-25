import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileCheck2, Send } from 'lucide-react';
import { api, post } from '../api';
import { typeLabels, Button, Notice, PageHead, Step } from '../components/ui';
import { RequireLogin } from './Auth';

export function ReportPage() {
  return (
    <RequireLogin>
      <ReportForm />
    </RequireLogin>
  );
}

export function ReportForm() {
  const [type, setType] = useState('domain');
  const [identifier, setIdentifier] = useState('');
  const [bank, setBank] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(
        '/reports',
        post({ type, identifier, ...(type === 'bank' ? { bank } : {}), description, evidence }),
      );
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container">
      <PageHead eyebrow="ĐÓNG GÓP CHO CỘNG ĐỒNG" title="Chia sẻ một dấu hiệu đáng ngờ.">
        Báo cáo của bạn sẽ được kiểm duyệt trước khi xuất hiện trong kết quả tra cứu.
      </PageHead>
      <div className="form-layout">
        {success ? (
          <div className="card success-state">
            <CheckCircle2 size={48} />
            <h2>Đã tiếp nhận báo cáo của bạn</h2>
            <p>
              Báo cáo đang chờ kiểm duyệt. Bạn có thể theo dõi trạng thái và lý do xử lý trong tài
              khoản.
            </p>
            <Link to="/tai-khoan" className="btn">
              Theo dõi báo cáo
              <ArrowRight size={16} />
            </Link>
            <button
              className="text-link"
              onClick={() => {
                setSuccess(false);
                setIdentifier('');
                setDescription('');
                setEvidence('');
              }}
            >
              Gửi báo cáo khác
            </button>
          </div>
        ) : (
          <form className="card report-form" onSubmit={submit}>
            <h2>Thông tin báo cáo</h2>
            <label htmlFor="report-type">Loại đối tượng</label>
            <select id="report-type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <label htmlFor="identifier">Thông tin nhận diện</label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              maxLength={2048}
              minLength={3}
              placeholder="Nhập đầy đủ thông tin để đối chiếu"
              required
            />
            {type === 'bank' && (
              <>
                <label htmlFor="report-bank">Tên ngân hàng</label>
                <input
                  id="report-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  maxLength={100}
                  required
                />
              </>
            )}
            <label htmlFor="description">Mô tả sự việc</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              minLength={20}
              maxLength={2000}
              placeholder="Bạn đã gặp chuyện gì? Nội dung nào khiến bạn nghi ngờ? (ít nhất 20 ký tự)"
              required
            />
            <label htmlFor="evidence">Bằng chứng dạng văn bản</label>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={5}
              minLength={10}
              maxLength={5000}
              placeholder="Trích đoạn trao đổi, thời gian hoặc chi tiết liên quan. Không nhập mật khẩu, mã OTP hay thông tin bí mật."
              required
            />
            <p className="field-hint">Tối đa 2.000 ký tự mô tả và 5.000 ký tự bằng chứng.</p>
            <label className="checkbox-row">
              <input type="checkbox" required />
              Tôi cung cấp thông tin trung thực theo hiểu biết của mình và đã loại bỏ thông tin bí
              mật.
            </label>
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" busy={busy}>
              <Send size={17} />
              Gửi để kiểm duyệt
            </Button>
          </form>
        )}
        <aside className="report-aside">
          <div className="icon-tile">
            <FileCheck2 size={26} />
          </div>
          <h2>Điều gì xảy ra tiếp theo?</h2>
          <Step number="01" title="Tiếp nhận">
            Báo cáo được lưu ở trạng thái chờ duyệt, chưa công khai.
          </Step>
          <Step number="02" title="Kiểm tra thông tin">
            Quản trị viên xem bằng chứng và ghi lý do duyệt hoặc bác bỏ.
          </Step>
          <Step number="03" title="Thông báo kết quả">
            Theo dõi trong tài khoản. Chỉ bản mô tả đã duyệt được công bố.
          </Step>
          <Notice>Không đưa mật khẩu, mã OTP hoặc giấy tờ cá nhân vào bằng chứng.</Notice>
        </aside>
      </div>
    </div>
  );
}
