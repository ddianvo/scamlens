import React, { type ReactNode } from 'react';
import { ArrowRight, ChevronDown, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react';
import { type Analysis } from '../api';
import { Notice } from './ui';
import { Admin } from '../pages/Admin';

export function Highlight({ result }: { result: Analysis }) {
  const ranges = result.findings.flatMap((f) => f.ranges || []).sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  const nodes: ReactNode[] = [];
  let at = 0;
  merged.forEach((r, i) => {
    nodes.push(result.content.slice(at, r.start));
    nodes.push(<mark key={i}>{result.content.slice(r.start, r.end)}</mark>);
    at = r.end;
  });
  nodes.push(result.content.slice(at));
  return <div className="highlighted-message">{nodes}</div>;
}

export function AnalysisResult({ result }: { result: Analysis }) {
  return (
    <section className={`analysis-result risk-${result.level}`} aria-label="Kết quả phân tích">
      <div className="result-heading">
        <div
          className="risk-meter"
          style={{ '--score': `${result.score}%` } as React.CSSProperties}
        >
          <div>
            <strong>{result.score}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <div>
          <span className="small-caps">ĐIỂM RỦI RO THEO QUY TẮC</span>
          <h2>
            {result.level === 'high' ? (
              <ShieldX size={24} />
            ) : result.level === 'medium' ? (
              <TriangleAlert size={24} />
            ) : (
              <ShieldCheck size={24} />
            )}{' '}
            {result.label}
          </h2>
          <p>
            {result.findings.length
              ? `Phát hiện ${result.findings.length} nhóm dấu hiệu. Xem lý do trước khi đưa ra quyết định.`
              : 'Chưa khớp quy tắc hiện có. Kết quả này không bảo chứng an toàn.'}
          </p>
        </div>
      </div>
      <div className="result-content">
        {result.type === 'message' ? (
          <>
            <h3>Nội dung được đánh dấu</h3>
            <Highlight result={result} />
          </>
        ) : (
          <>
            <h3>Đọc đúng địa chỉ website</h3>
            <dl className="url-details">
              <div>
                <dt>Tên máy chủ thực tế</dt>
                <dd>{result.hostname}</dd>
              </div>
              <div>
                <dt>Tên miền đăng ký</dt>
                <dd>{result.domain}</dd>
              </div>
              <div>
                <dt>Tên miền phụ</dt>
                <dd>{result.subdomain || 'Không có'}</dd>
              </div>
              <div>
                <dt>Kết nối HTTPS</dt>
                <dd>{result.https ? 'Có · không bảo chứng an toàn' : 'Không sử dụng'}</dd>
              </div>
            </dl>
            <Notice>
              {result.verified
                ? `${result.verified.isDemo ? 'Dữ liệu mô phỏng. ' : ''}${result.verified.verdict === 'official' ? 'Có trong danh sách đối chiếu của Admin. ' : 'Có bản ghi cảnh báo. '}${result.verified.note}`
                : 'Chưa có bản ghi tên miền này trong danh sách do Admin xác minh.'}
            </Notice>
            <p className="field-hint">{result.technicalNote}</p>
          </>
        )}
        <h3 className="findings-title">
          Dấu hiệu & giải thích <span>{result.findings.length}</span>
        </h3>
        {result.findings.length ? (
          <div className="findings">
            {result.findings.map((f) => (
              <details key={f.code} open>
                <summary>
                  <span className="finding-icon">
                    <TriangleAlert size={16} />
                  </span>
                  <strong>{f.title}</strong>
                  <span className="weight">+{f.weight} điểm</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="finding-body">
                  <p>{f.reason}</p>
                  <div>
                    <ArrowRight size={15} />
                    <span>{f.action}</span>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="muted">
            Không phát hiện dấu hiệu theo bộ quy tắc hiện tại. Hãy tiếp tục xác minh danh tính người
            gửi qua kênh độc lập.
          </p>
        )}
        <p className="score-note">
          Mỗi nhóm dấu hiệu chỉ tính một lần. Tổng trọng số được giới hạn ở 100; đây không phải xác
          suất hay độ tin cậy AI.
        </p>
        <Notice>{result.disclaimer}</Notice>
      </div>
    </section>
  );
}
