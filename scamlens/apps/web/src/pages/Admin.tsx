import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Clock3,
  FileCheck2,
  LoaderCircle,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api, date, type Report } from '../api';
import { typeLabels, statusLabels, Button, Notice, PageHead, Empty } from '../components/ui';
import { RequireLogin } from './Auth';

export function Admin() {
  return (
    <RequireLogin admin>
      <AdminContent />
    </RequireLogin>
  );
}

export function AdminContent() {
  const [tab, setTab] = useState('reports');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function load() {
    setError('');
    try {
      const [s, r, ru, su] = await Promise.all([
        api('/admin/stats'),
        api<Report[]>('/admin/reports'),
        api('/admin/rules'),
        api('/admin/subjects'),
      ]);
      setStats(s);
      setReports(r);
      setRules(ru);
      setSubjects(su);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function mutate(path: string, body: unknown, method = 'POST') {
    setError('');
    setSuccess('');
    await api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    await load();
    setSuccess('Đã cập nhật dữ liệu.');
  }
  const visible = reports.filter((r) => filter === 'all' || r.status === filter);
  return (
    <div className="container admin-page">
      <PageHead eyebrow="SCAMLENS / QUẢN TRỊ" title="Tổng quan & kiểm duyệt.">
        Số liệu truy vấn trực tiếp từ database, bao gồm dữ liệu mô phỏng có gắn nhãn.
      </PageHead>
      <div className="stats-grid">
        {[
          { key: 'pending', name: 'Báo cáo chờ duyệt', icon: Clock3 },
          { key: 'approved', name: 'Báo cáo đã duyệt', icon: FileCheck2 },
          { key: 'users', name: 'Tài khoản', icon: Users },
          { key: 'subjects', name: 'Đối tượng xác minh', icon: ShieldCheck },
        ].map((s) => (
          <div className="stat-card" key={s.key}>
            <s.icon size={20} />
            <strong>{stats[s.key] ?? '—'}</strong>
            <span>{s.name}</span>
          </div>
        ))}
      </div>
      <div className="account-tabs">
        <button onClick={() => setTab('reports')} className={tab === 'reports' ? 'active' : ''}>
          <FileCheck2 size={18} />
          Kiểm duyệt báo cáo
        </button>
        <button onClick={() => setTab('subjects')} className={tab === 'subjects' ? 'active' : ''}>
          <ShieldCheck size={18} />
          Danh sách xác minh
        </button>
        <button onClick={() => setTab('rules')} className={tab === 'rules' ? 'active' : ''}>
          <SlidersHorizontal size={18} />
          Quy tắc & trọng số
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {loading ? (
        <div className="loading-page">
          <LoaderCircle className="spin" />
          Đang tải dữ liệu…
        </div>
      ) : tab === 'reports' ? (
        <>
          <div className="filter-row">
            <label htmlFor="status-filter">Trạng thái</label>
            <select id="status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Chờ kiểm duyệt</option>
              <option value="approved">Đã kiểm duyệt</option>
              <option value="rejected">Đã bác bỏ</option>
              <option value="all">Tất cả</option>
            </select>
            <span>{visible.length} báo cáo</span>
          </div>
          {visible.length ? (
            visible.map((r) => (
              <ReviewCard
                report={r}
                key={`${r.id}-${r.updatedAt}`}
                onSave={(body) => mutate(`/admin/reports/${r.id}`, body, 'PATCH')}
              />
            ))
          ) : (
            <Empty
              title="Không có báo cáo ở trạng thái này."
              text="Các báo cáo mới sẽ hiển thị khi người dùng gửi."
            />
          )}
        </>
      ) : tab === 'rules' ? (
        <>
          <Notice>
            Quy tắc dùng từ khóa dạng văn bản, không thực thi biểu thức do người nhập cung cấp. Mỗi
            nhóm chỉ cộng một lần; tổng điểm tối đa 100.
          </Notice>
          {rules.map((r) => (
            <RuleEditor
              rule={r}
              key={r.id}
              onSave={(body) => mutate(`/admin/rules/${r.id}`, body, 'PATCH')}
            />
          ))}
          <details className="card add-rule">
            <summary>
              <Plus size={17} />
              Thêm nhóm quy tắc
            </summary>
            <RuleEditor onSave={(body) => mutate('/admin/rules', body)} />
          </details>
        </>
      ) : (
        <>
          <SubjectForm onSave={(body) => mutate('/admin/subjects', body)} />
          <div className="subject-list">
            {subjects.map((s) => (
              <div className="card subject-card" key={s.id}>
                <div>
                  <div className="report-top">
                    <span
                      className={`status-badge ${s.verdict === 'caution' ? 'pending' : 'approved'}`}
                    >
                      {s.verdict === 'caution' ? 'Cần cảnh giác' : 'Đã đối chiếu'}
                    </span>
                    {s.isDemo && <span className="demo-badge">Dữ liệu mô phỏng</span>}
                  </div>
                  <h3>{s.identifier}</h3>
                  <p>
                    {typeLabels[s.type]}
                    {s.bank && ` · ${s.bank}`}
                  </p>
                  <p>{s.note}</p>
                  <span className="field-hint">{date(s.updatedAt)}</span>
                </div>
                <button
                  className="icon-btn danger"
                  onClick={() => {
                    mutate(`/admin/subjects/${s.id}`, null, 'DELETE').catch((e) =>
                      setError(e.message),
                    );
                  }}
                  aria-label={`Xóa ${s.identifier}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ReviewCard({
  report: r,
  onSave,
}: {
  report: Report;
  onSave: (body: unknown) => Promise<void>;
}) {
  const [reason, setReason] = useState(r.reviewReason || '');
  const [summary, setSummary] = useState(r.publicSummary || '');
  const [status, setStatus] = useState('approved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        status,
        reason,
        ...(status === 'approved' ? { publicSummary: summary } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="card review-card">
      <div className="report-top">
        <span className={`status-badge ${r.status}`}>{statusLabels[r.status]}</span>
        {r.isDemo && <span className="demo-badge">Dữ liệu mô phỏng</span>}
      </div>
      <h3>{r.identifier}</h3>
      <p className="field-hint">
        {typeLabels[r.type]}
        {r.bank && ` · ${r.bank}`} · Cập nhật {date(r.updatedAt)}
      </p>
      <div className="review-evidence">
        <h4>Mô tả từ người gửi</h4>
        <p>{r.description}</p>
        <h4>Bằng chứng (nội bộ)</h4>
        <p>{r.evidence}</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-two">
          <div>
            <label htmlFor={`decision-${r.id}`}>Quyết định</label>
            <select
              id={`decision-${r.id}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="approved">Duyệt công khai</option>
              <option value="rejected">Bác bỏ báo cáo</option>
            </select>
          </div>
          <div>
            <label htmlFor={`reason-${r.id}`}>Lý do xử lý</label>
            <input
              id={`reason-${r.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={10}
              maxLength={1000}
              required
              placeholder="Ít nhất 10 ký tự"
            />
          </div>
        </div>
        {status === 'approved' && (
          <>
            <label htmlFor={`summary-${r.id}`}>Mô tả công khai đã loại bỏ thông tin cá nhân</label>
            <textarea
              id={`summary-${r.id}`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              minLength={20}
              maxLength={1000}
              rows={3}
              placeholder="Viết mô tả trung tính, có căn cứ; không chứa thông tin cá nhân (ít nhất 20 ký tự)."
              required
            />
            <p className="field-hint">
              Bằng chứng và mô tả gốc chỉ dùng nội bộ. Kiểm tra và che mọi thông tin nhận diện trong
              mô tả công khai.
            </p>
          </>
        )}
        {error && <Notice error>{error}</Notice>}
        <Button type="submit" busy={busy} className="small">
          <Check size={16} />
          Lưu quyết định
        </Button>
      </form>
    </article>
  );
}

export function RuleEditor({
  rule,
  onSave,
}: {
  rule?: any;
  onSave: (body: unknown) => Promise<void>;
}) {
  const [title, setTitle] = useState(rule?.title || '');
  const [code, setCode] = useState('');
  const [keywords, setKeywords] = useState((rule?.keywords || []).join(', '));
  const [weight, setWeight] = useState(rule?.weight ?? 15);
  const [reason, setReason] = useState(rule?.reason || '');
  const [action, setAction] = useState(rule?.action || '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setDone(false);
    try {
      await onSave({
        title,
        keywords: keywords
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        weight: Number(weight),
        reason,
        action,
        enabled,
        ...(!rule ? { code } : {}),
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const id = rule?.id || 'new-rule';
  return (
    <form className="card rule-editor" onSubmit={submit}>
      <div className="rule-editor-head">
        <h3>{rule ? rule.title : 'Quy tắc mới'}</h3>
        <label className="checkbox-row">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Đang bật
        </label>
      </div>
      {!rule && (
        <>
          <label htmlFor={`code-${id}`}>Mã quy tắc duy nhất</label>
          <input
            id={`code-${id}`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            minLength={3}
            maxLength={50}
            required
          />
        </>
      )}
      <div className="form-two">
        <div>
          <label htmlFor={`title-${id}`}>Tên nhóm dấu hiệu</label>
          <input
            id={`title-${id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label htmlFor={`weight-${id}`}>Trọng số (0–100)</label>
          <input
            id={`weight-${id}`}
            type="number"
            min="0"
            max="100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
      </div>
      <label htmlFor={`keywords-${id}`}>Từ khóa, ngăn cách bằng dấu phẩy</label>
      <input
        id={`keywords-${id}`}
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        maxLength={1600}
        required
      />
      <label htmlFor={`reason-rule-${id}`}>Giải thích</label>
      <textarea
        id={`reason-rule-${id}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        minLength={10}
        maxLength={1000}
        rows={2}
        required
      />
      <label htmlFor={`action-${id}`}>Hướng xử lý</label>
      <textarea
        id={`action-${id}`}
        value={action}
        onChange={(e) => setAction(e.target.value)}
        minLength={10}
        maxLength={1000}
        rows={2}
        required
      />
      {error && <Notice error>{error}</Notice>}
      <div className="save-row">
        <Button type="submit" busy={busy} className="small">
          <Check size={16} />
          Lưu quy tắc
        </Button>
        {done && <span className="teal">Đã lưu thay đổi.</span>}
      </div>
    </form>
  );
}

export function SubjectForm({ onSave }: { onSave: (body: unknown) => Promise<void> }) {
  const [type, setType] = useState('domain');
  const [identifier, setIdentifier] = useState('');
  const [bank, setBank] = useState('');
  const [verdict, setVerdict] = useState('caution');
  const [note, setNote] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        type,
        identifier,
        ...(type === 'bank' ? { bank } : {}),
        verdict,
        note,
        isDemo,
      });
      setIdentifier('');
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card subject-form" onSubmit={submit}>
      <h3>Thêm hoặc cập nhật đối tượng xác minh</h3>
      <p className="field-hint">
        Nhập cùng loại, định danh và ngân hàng để cập nhật bản ghi đã có. Đối chiếu URL chỉ sử dụng
        bản ghi tên miền.
      </p>
      <div className="form-two">
        <div>
          <label htmlFor="subject-type">Loại đối tượng</label>
          <select id="subject-type" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="subject-identifier">Định danh</label>
          <input
            id="subject-identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            maxLength={2048}
            minLength={3}
            required
          />
        </div>
      </div>
      {type === 'bank' && (
        <>
          <label htmlFor="subject-bank">Tên ngân hàng</label>
          <input
            id="subject-bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            maxLength={100}
            required
          />
        </>
      )}
      <label htmlFor="subject-verdict">Kết quả xác minh</label>
      <select id="subject-verdict" value={verdict} onChange={(e) => setVerdict(e.target.value)}>
        <option value="caution">Cảnh báo · cần cảnh giác</option>
        <option value="official">Đã đối chiếu danh tính · không bảo chứng an toàn</option>
      </select>
      <label htmlFor="subject-note">Căn cứ / ghi chú</label>
      <textarea
        id="subject-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        minLength={10}
        maxLength={1000}
        rows={2}
        required
      />
      <label className="checkbox-row">
        <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
        Đây là dữ liệu mô phỏng
      </label>
      {error && <Notice error>{error}</Notice>}
      <Button type="submit" className="small" busy={busy}>
        <Plus size={16} />
        Lưu đối tượng
      </Button>
    </form>
  );
}
