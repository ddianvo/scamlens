import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, LoaderCircle, Search, Shield } from 'lucide-react';

export const typeLabels: Record<string, string> = {
  domain: 'Tên miền / đường link',
  phone: 'Số điện thoại',
  bank: 'Tài khoản ngân hàng',
};

export const statusLabels: Record<string, string> = {
  pending: 'Chờ kiểm duyệt',
  approved: 'Đã kiểm duyệt',
  rejected: 'Đã bác bỏ',
};

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="ScamLens — Trang chủ">
      <span className="logo-icon">
        <Shield size={26} />
        <Search className="lens" size={15} />
      </span>
      <span>
        Scam<span className="teal">Lens</span>
      </span>
    </Link>
  );
}

export function Button({
  children,
  busy = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className={`btn ${className}`}
      disabled={busy || props.disabled}
      aria-busy={busy}
    >
      {busy ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : ''}`}>
      <Info size={17} />
      <span>{children}</span>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="step">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state card">
      <Shield size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link className="text-link" to="/">
        Đến công cụ kiểm tra
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
