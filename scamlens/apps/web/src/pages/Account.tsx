import { useEffect, useState } from 'react';
import { Eye, Flag, History, LoaderCircle, Trash2, X } from 'lucide-react';
import { api, date, type Report } from '../api';
import { useAuth } from '../auth-context';
import { statusLabels, Notice, PageHead, Empty } from '../components/ui';
import { AnalysisResult } from '../components/AnalysisResult';
import { RequireLogin } from './Auth';

export function Account() {
  return (
    <RequireLogin>
      <AccountContent />
    </RequireLogin>
  );
}

export function AccountContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState('history');
  const [histories, setHistories] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [h, r] = await Promise.all([api<any[]>('/history'), api<Report[]>('/reports/mine')]);
      setHistories(h);
      setReports(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(id: string) {
    try {
      await api(`/history/${id}`, { method: 'DELETE' });
      setHistories((h) => h.filter((i) => i.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="container account-page">
      <PageHead eyebrow="KHÔNG GIAN CÁ NHÂN" title={`Chào ${user?.name}.`}>
        Những lần kiểm tra bạn chọn lưu và các báo cáo bạn đã đóng góp.
      </PageHead>
      <div className="account-tabs">
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          <History size={18} />
          Lịch sử đã lưu <span>{histories.length}</span>
        </button>
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>
          <Flag size={18} />
          Báo cáo của tôi <span>{reports.length}</span>
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <div className="loading-page">
          <LoaderCircle className="spin" />
          Đang tải dữ liệu của bạn…
        </div>
      ) : tab === 'history' ? (
        histories.length ? (
          histories.map((h) => (
            <div className="history-card card" key={h.id}>
              <div className="history-row">
                <div>
                  <span className={`risk-chip ${h.result.level}`}>
                    {h.result.score}/100 · {h.result.label}
                  </span>
                  <h3>{h.type === 'message' ? 'Kiểm tra tin nhắn' : 'Kiểm tra đường link'}</h3>
                  <p>
                    {h.content.slice(0, 140)}
                    {h.content.length > 140 && '…'}
                  </p>
                  <span className="field-hint">{date(h.createdAt)}</span>
                </div>
                <div className="history-buttons">
                  <button
                    onClick={() => setSelected(selected === h.id ? null : h.id)}
                    className="icon-btn"
                    aria-label="Xem kết quả"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => void remove(h.id)}
                    className="icon-btn danger"
                    aria-label="Xóa lịch sử"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {selected === h.id && <AnalysisResult result={h.result} />}
            </div>
          ))
        ) : (
          <Empty
            title="Bạn chưa lưu lần kiểm tra nào."
            text="Lịch sử chỉ xuất hiện khi bạn chủ động nhấn Lưu kết quả."
          />
        )
      ) : reports.length ? (
        reports.map((r) => (
          <article className="card my-report" key={r.id}>
            <div className="report-top">
              <span className={`status-badge ${r.status}`}>{statusLabels[r.status]}</span>
              {r.isDemo && <span className="demo-badge">Dữ liệu mô phỏng</span>}
            </div>
            <h3>{r.identifier}</h3>
            <p>{r.description}</p>
            <details>
              <summary>Xem bằng chứng đã gửi</summary>
              <p className="evidence">{r.evidence}</p>
            </details>
            {r.reviewReason && <Notice>Lý do xử lý: {r.reviewReason}</Notice>}
            <p className="field-hint">Cập nhật {date(r.updatedAt)}</p>
          </article>
        ))
      ) : (
        <Empty
          title="Chưa có báo cáo nào."
          text="Bạn có thể gửi sự việc đáng ngờ để quản trị viên kiểm duyệt."
        />
      )}
    </div>
  );
}
