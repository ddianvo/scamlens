import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  ExternalLink,
  Flag,
  History,
  Info,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api, post, type Analysis, type Report } from '../api';
import { useAuth } from '../auth-context';
import { typeLabels, Button, Notice } from './ui';
import { AnalysisResult } from './AnalysisResult';
import { ReportCard } from './ReportCard';

export const samples = [
  {
    name: 'Tin đáng ngờ',
    content:
      'Ngân hàng thông báo: tài khoản của bạn sẽ bị khóa trong 5 phút. Cung cấp mã OTP và chuyển tiền đóng phí xác minh ngay lập tức.',
  },
  {
    name: 'Tin bình thường',
    content:
      'Chào bạn, chiều nay mình hẹn gặp ở thư viện lúc 3 giờ nhé. Nhớ mang tài liệu cho buổi thuyết trình ngày mai.',
  },
  {
    name: 'Tin cảnh báo',
    content:
      'Cảnh báo lừa đảo: Không cung cấp OTP cho bất kỳ ai. Không chuyển tiền hoặc đóng phí nhận thưởng qua đường link lạ.',
  },
];

export function Tool({ lookupOnly = false }: { lookupOnly?: boolean }) {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(lookupOnly ? 'lookup' : 'message');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState(params.get('query') || '');
  const [type, setType] = useState(
    Object.hasOwn(typeLabels, params.get('type') || '') ? params.get('type')! : 'domain',
  );
  const [bank, setBank] = useState(params.get('bank') || '');
  const [result, setResult] = useState<Analysis | null>(null);
  const [lookup, setLookup] = useState<{ reports: Report[]; note: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { user } = useAuth();
  const resultRef = useRef<HTMLDivElement>(null);
  const content = tab === 'message' ? message : tab === 'url' ? url : query;
  function select(value: string) {
    setTab(value);
    setResult(null);
    setLookup(null);
    setError('');
    setSaved(false);
    setSaveError('');
  }
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setError('');
    setResult(null);
    setLookup(null);
    setBusy(true);
    setSaved(false);
    setSaveError('');
    try {
      if (tab === 'lookup') {
        const q = new URLSearchParams({ type, query, ...(type === 'bank' ? { bank } : {}) });
        setLookup(await api(`/reports/lookup?${q}`));
        setResult(null);
      } else {
        setResult(
          await api<Analysis>(
            `/analysis/${tab}`,
            post(tab === 'message' ? { content: message } : { url }),
          ),
        );
        setLookup(null);
      }
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
        80,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const autoSearched = useRef(false);
  useEffect(() => {
    if (lookupOnly && query && !autoSearched.current) {
      autoSearched.current = true;
      void submit();
    }
  }, []);
  async function save() {
    if (!result || saving || saved) return;
    setSaving(true);
    setSaveError('');
    try {
      await api('/history', post({ type: result.type, content: result.content }));
      setSaved(true);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="tool-area">
      <div className="tool-card">
        <div className="tool-tabs" role="tablist" aria-label="Chọn công cụ">
          {[
            { id: 'message', label: 'Tin nhắn', icon: MessageSquareText },
            { id: 'url', label: 'Đường link', icon: Link2 },
            { id: 'lookup', label: 'Tra cứu báo cáo', icon: Search },
          ].map((t) => (
            <button
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls="tool-panel"
              key={t.id}
              disabled={busy}
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={(event) => {
                const ids = ['message', 'url', 'lookup'];
                const index = ids.indexOf(tab);
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % 3
                    : event.key === 'ArrowLeft'
                      ? (index + 2) % 3
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? 2
                          : null;
                if (next !== null) {
                  event.preventDefault();
                  select(ids[next]);
                  document.getElementById(`tab-${ids[next]}`)?.focus();
                }
              }}
              onClick={() => select(t.id)}
              className={tab === t.id ? 'selected' : ''}
            >
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <form
          className="tool-body"
          id="tool-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          onSubmit={submit}
        >
          <div className="tool-title">
            <h2>
              {tab === 'message'
                ? 'Tin nhắn này có gì đáng ngờ?'
                : tab === 'url'
                  ? 'Đường link này dẫn đến đâu?'
                  : 'Kiểm tra thông tin trước khi tin'}
            </h2>
            <span className="local-badge">
              <span /> {tab === 'lookup' ? 'Dữ liệu đã kiểm duyệt' : 'Phân tích cục bộ'}
            </span>
          </div>
          <p className="tool-description">
            {tab === 'message'
              ? 'Dán nội dung SMS, email hoặc đoạn chat. ScamLens sẽ giúp bạn đọc kỹ hơn.'
              : tab === 'url'
                ? 'Phân tích cấu trúc URL và đối chiếu danh sách nội bộ, không mở đường link.'
                : 'Tra cứu báo cáo đã được duyệt. Kết quả không phải kết luận về đối tượng.'}
          </p>
          {tab === 'message' ? (
            <>
              <label htmlFor="message">Nội dung cần kiểm tra</label>
              <div className="textarea-wrap">
                <textarea
                  id="message"
                  placeholder={
                    'Ví dụ: “Tài khoản của bạn sẽ bị khóa trong 5 phút.\nVui lòng cung cấp mã OTP để xác minh…”'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={10000}
                  minLength={3}
                  required
                  rows={7}
                />
                {message && (
                  <button
                    className="clear-input"
                    type="button"
                    onClick={() => {
                      setMessage('');
                      setResult(null);
                    }}
                    aria-label="Xóa nội dung"
                  >
                    <X size={16} />
                  </button>
                )}
                <span className="char-count">
                  {message.length.toLocaleString('vi-VN')} / 10.000 ký tự
                </span>
              </div>
              <div className="samples">
                <span>Chưa có nội dung? Thử mẫu:</span>
                {samples.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setMessage(s.content);
                      setResult(null);
                      setError('');
                    }}
                  >
                    {s.name}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
            </>
          ) : tab === 'url' ? (
            <>
              <label htmlFor="url">Đường link cần kiểm tra</label>
              <div className="input-icon">
                <Link2 size={18} />
                <input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  maxLength={2048}
                  placeholder="https://example.com/duong-dan"
                  required
                />
              </div>
              <div className="url-tip">
                <Info size={16} />
                <span>Hãy giữ nguyên đường link để các dấu hiệu được nhận diện đầy đủ.</span>
              </div>
              <div className="samples">
                <span>URL mô phỏng:</span>
                {[
                  'https://qua-tang.test/nhan-thuong',
                  'http://192.0.2.10/login',
                  'https://example.com',
                ].map((u) => (
                  <button
                    type="button"
                    key={u}
                    onClick={() => {
                      setUrl(u);
                      setResult(null);
                    }}
                  >
                    {u.includes('qua-tang')
                      ? 'Nhận thưởng'
                      : u.includes('192')
                        ? 'Địa chỉ IP'
                        : 'Tên miền mẫu'}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label htmlFor="lookup-type">Loại thông tin</label>
              <select
                id="lookup-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setLookup(null);
                }}
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <label htmlFor="query">{typeLabels[type]}</label>
              <input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={2048}
                minLength={3}
                placeholder={
                  type === 'domain'
                    ? 'Ví dụ mô phỏng: qua-tang.test'
                    : type === 'phone'
                      ? 'Ví dụ mô phỏng: 0900000001'
                      : 'Nhập đầy đủ số tài khoản'
                }
                required
              />
              {type === 'bank' && (
                <>
                  <label htmlFor="bank">Tên ngân hàng</label>
                  <input
                    id="bank"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    maxLength={100}
                    placeholder="Ví dụ: Ngân hàng mô phỏng"
                    required
                  />
                </>
              )}
              <p className="field-hint">Thông tin cá nhân được che bớt trong kết quả công khai.</p>
            </>
          )}
          {error && <Notice error>{error}</Notice>}
          <div className="tool-submit">
            <span>
              <LockKeyhole size={14} />
              {tab === 'lookup' ? 'Chỉ hiển thị báo cáo đã duyệt' : 'Không tự động lưu nội dung'}
            </span>
            <Button type="submit" busy={busy} disabled={!content.trim()}>
              {tab === 'lookup' ? <Search size={17} /> : <ScanIcon />}
              {busy ? 'Đang kiểm tra…' : tab === 'lookup' ? 'Tra cứu báo cáo' : 'Kiểm tra ngay'}
              {!busy && <ArrowRight size={17} />}
            </Button>
          </div>
        </form>
        <div className="tool-disclaimer">
          <CircleHelp size={15} />
          <span>Kết quả hỗ trợ nhận diện dấu hiệu, không thay thế xác minh độc lập.</span>
        </div>
      </div>
      <div ref={resultRef} aria-live="polite">
        {result && (
          <>
            <AnalysisResult result={result} />
            <div className="result-actions">
              {user ? (
                <Button className="btn-outline small" onClick={save} busy={saving} disabled={saved}>
                  {saved ? <Check size={16} /> : <History size={16} />}{' '}
                  {saved ? 'Đã lưu vào lịch sử' : 'Lưu kết quả vào lịch sử'}
                </Button>
              ) : (
                <Link className="text-link" to="/dang-nhap">
                  Đăng nhập để chủ động lưu kết quả
                  <ArrowRight size={15} />
                </Link>
              )}
              <Link to="/gui-bao-cao" className="text-link">
                Gửi báo cáo
                <Flag size={15} />
              </Link>
            </div>
            {saveError && <Notice error>{saveError}</Notice>}
          </>
        )}
        {lookup && (
          <div className="lookup-results">
            <div className="section-title">
              <h3>Kết quả tra cứu</h3>
              <span>{lookup.reports.length} báo cáo đã duyệt</span>
            </div>
            {lookup.reports.length ? (
              lookup.reports.map((r) => <ReportCard report={r} key={r.id} />)
            ) : (
              <div className="empty-state">
                <Search size={30} />
                <h3>Chưa tìm thấy báo cáo trong hệ thống</h3>
                <p>Hãy kiểm tra lại thông tin hoặc gửi báo cáo nếu bạn có bằng chứng.</p>
                <Link className="text-link" to="/gui-bao-cao">
                  Gửi báo cáo
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
            <Notice>{lookup.note}</Notice>
            {!lookupOnly && (
              <Link
                className="text-link"
                to={`/tra-cuu?${new URLSearchParams({ type, query, bank })}`}
              >
                Mở trang kết quả
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScanIcon() {
  return <ShieldCheck size={18} />;
}
