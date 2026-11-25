import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  LogOut,
  Menu,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import { api, post, type User } from '../api';
import { Auth } from '../auth-context';
import { Logo, Notice, PageHead } from './ui';
import { Home, LookupPage } from '../pages/Home';
import { AuthPage } from '../pages/Auth';
import { ReportPage } from '../pages/Report';
import { Account } from '../pages/Account';
import { Admin } from '../pages/Admin';
import { Guide } from '../pages/Guide';

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [authError, setAuthError] = useState('');
  const location = useLocation();
  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  async function logout() {
    try {
      await api('/auth/logout', post({}));
      setUser(null);
      window.location.assign('/');
    } catch (error) {
      setAuthError((error as Error).message);
    }
  }
  return (
    <Auth.Provider value={{ user, setUser, ready }}>
      <header className="header">
        <div className="header-inner">
          <Logo />
          <nav className={menu ? 'open' : ''} aria-label="Điều hướng chính">
            <NavLink to="/" end>
              Kiểm tra & tra cứu
            </NavLink>
            <NavLink to="/huong-dan">Cẩm nang an toàn</NavLink>
            <NavLink to="/gui-bao-cao">
              Gửi báo cáo
              <ArrowUpRight size={14} />
            </NavLink>
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link className="account-link" to="/tai-khoan">
                  <UserRound size={17} />
                  <span>{user.name}</span>
                </Link>
                {user.role === 'admin' && (
                  <Link className="admin-link" to="/quan-tri" aria-label="Quản trị">
                    <Settings2 size={18} />
                  </Link>
                )}
                <button onClick={logout} className="icon-btn" aria-label="Đăng xuất">
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link className="btn btn-outline small" to="/dang-nhap">
                <UserRound size={16} />
                Đăng nhập
              </Link>
            )}
            <button
              className="icon-btn menu-toggle"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-label="Mở menu"
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {authError && (
        <div className="container">
          <Notice error>{authError}</Notice>
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tra-cuu" element={<LookupPage />} />
          <Route path="/dang-nhap" element={<AuthPage />} />
          <Route path="/dang-ky" element={<AuthPage register />} />
          <Route path="/gui-bao-cao" element={<ReportPage />} />
          <Route path="/tai-khoan" element={<Account />} />
          <Route path="/quan-tri" element={<Admin />} />
          <Route path="/huong-dan" element={<Guide />} />
          <Route
            path="*"
            element={
              <div className="container narrow">
                <PageHead eyebrow="404" title="Trang này chưa có ở đây." />
                <Link className="btn" to="/">
                  Về công cụ kiểm tra
                  <ArrowRight size={17} />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <div className="container footer-top">
          <div>
            <Logo />
            <p>Nhìn rõ dấu hiệu. Chủ động an toàn.</p>
          </div>
          <div className="footer-links">
            <Link to="/huong-dan">Cách ScamLens hoạt động</Link>
            <Link to="/gui-bao-cao">
              Đóng góp báo cáo
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <span className="student-tag">
            <BookOpen size={15} />
            Dự án sinh viên · Bản demo
          </span>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} ScamLens</span>
          <span>Công cụ hỗ trợ đánh giá, không thay thế việc xác minh độc lập.</span>
        </div>
      </footer>
    </Auth.Provider>
  );
}
