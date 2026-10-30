import { NavLink, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints.js';

const links = [
  { to: '/dashboard', label: 'Today' },
  { to: '/morning', label: 'Morning' },
  { to: '/evening', label: 'Evening' },
  { to: '/habits', label: 'Habits' },
];

export default function Shell({ children }) {
  const navigate = useNavigate();

  async function logout() {
    await authApi.logout();
    navigate('/login');
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-dash px-6 pb-24 pt-8">
      <header className="mb-16 flex items-end justify-between gap-4">
        <NavLink to="/void" className="voice text-h2 tracking-[0.2em] text-text">
          THE <span className="text-brass">7</span>
        </NavLink>
        <nav className="flex flex-wrap items-center gap-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `label ${isActive ? 'text-brass' : 'text-text-dim hover:text-text'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={logout}
            className="label text-text-faint hover:text-blood"
            title="Sign out"
          >
            Leave
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
