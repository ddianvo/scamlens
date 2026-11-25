import { BadgeCheck, Clock3, Globe2, KeyRound, MessageSquareText } from 'lucide-react';
import { date, type Report } from '../api';
import { typeLabels } from './ui';

export function ReportCard({ report: r }: { report: Report }) {
  const Icon = r.type === 'domain' ? Globe2 : r.type === 'phone' ? MessageSquareText : KeyRound;
  return (
    <article className="report-card">
      <div className="report-top">
        <div className="report-type">
          <Icon size={17} />
          {typeLabels[r.type]}
        </div>
        <span className="verified-badge">
          <BadgeCheck size={13} />
          Đã kiểm duyệt
        </span>
      </div>
      <h3>{r.identifier}</h3>
      {r.bank && <p>{r.bank}</p>}
      <p>{r.description}</p>
      <div className="report-bottom">
        <span>
          <Clock3 size={12} />
          {date(r.updatedAt)}
        </span>
        {r.isDemo && <span className="demo-badge">Dữ liệu mô phỏng</span>}
      </div>
    </article>
  );
}
