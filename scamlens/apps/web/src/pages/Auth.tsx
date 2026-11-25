import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api, post, type User } from '../api';
import { useAuth } from '../auth-context';
import { Button, Notice, PageHead } from '../components/ui';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await api<User>(
        `/auth/${register ? 'register' : 'login'}`,
        post({ email, password, ...(register ? { name } : {}) }),
      );
      setUser(user);
      navigate(user.role === 'admin' ? '/quan-tri' : '/tai-khoan');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-layout">
      <aside className="auth-intro">
        <span className="eyebrow">CHỦ ĐỘNG AN TOÀN</span>
        <h1>
          Thêm một góc nhìn.
          <br />
          <span>Thêm sự an tâm.</span>
        </h1>
        <p>Lưu những lần kiểm tra bạn chọn và theo dõi báo cáo trong một không gian riêng.</p>
        <div className="auth-illustration">
          <ShieldCheck size={100} strokeWidth={1} />
        </div>
        <div className="privacy-note">
          <LockKeyhole size={20} />
          <p>
            Tin nhắn chỉ được lưu khi bạn chủ động chọn. Không ai khác xem được lịch sử cá nhân của
            bạn.
          </p>
        </div>
      </aside>
      <div className="auth-form card">
        <h2>{register ? 'Tạo tài khoản ScamLens' : 'Chào mừng bạn trở lại'}</h2>
        <p>
          {register
            ? 'Cùng xây dựng một cộng đồng cảnh giác hơn.'
            : 'Đăng nhập để tiếp tục hành trình an toàn số.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label htmlFor="name">Tên hiển thị</label>
              <input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={60}
                required
              />
            </>
          )}
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            placeholder="ban@example.com"
            required
          />
          <label htmlFor="password">Mật khẩu</label>
          <div className="password-input">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              required
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <Eye size={18} />
            </button>
          </div>
          {register && <p className="field-hint">Sử dụng ít nhất 8 ký tự.</p>}
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" busy={busy} className="full">
            {register ? 'Tạo tài khoản' : 'Đăng nhập'}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <Link to={register ? '/dang-nhap' : '/dang-ky'}>
            {register ? 'Đăng nhập' : 'Đăng ký miễn phí'}
          </Link>
        </p>
        <Link to="/" className="guest-link">
          Tiếp tục kiểm tra không cần tài khoản
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export function RequireLogin({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, ready } = useAuth();
  return !ready ? (
    <div className="loading-page">
      <LoaderCircle className="spin" /> Đang tải tài khoản…
    </div>
  ) : !user ? (
    <div className="container narrow">
      <PageHead eyebrow="KHÔNG GIAN CÁ NHÂN" title="Đăng nhập để tiếp tục.">
        Bạn cần tài khoản để gửi báo cáo và xem dữ liệu riêng của mình.
      </PageHead>
      <Link className="btn" to="/dang-nhap">
        Đăng nhập
        <ArrowRight size={17} />
      </Link>
    </div>
  ) : admin && user.role !== 'admin' ? (
    <div className="container narrow">
      <PageHead eyebrow="403" title="Bạn không có quyền quản trị." />
      <Link to="/" className="btn">
        Về trang chủ
      </Link>
    </div>
  ) : (
    <>{children}</>
  );
}
