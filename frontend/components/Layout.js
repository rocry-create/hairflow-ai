import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getUser, clearToken } from '../lib/api';

const NAV = [
  {
    section: 'Visao geral',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    section: 'Atendimento',
    items: [
      { href: '/conversations', label: 'Conversas IA', icon: 'chat' },
    ],
  },
  {
    section: 'Gestao',
    items: [
      { href: '/clients', label: 'Clientes', icon: 'users' },
      { href: '/agenda', label: 'Agenda', icon: 'calendar' },
      { href: '/services', label: 'Serviços', icon: 'scissors' },
      { href: '/professionals', label: 'Profissionais', icon: 'team' },
      { href: '/financeiro', label: 'Financeiro', icon: 'money' },
    ],
  },
];

const ICONS = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  scissors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.5.6 4 2.2 4 5.2" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 1.5-2.5 1.5-2.5.4-2.5 1.5 1.1 2 2.5 2 2.5-.9 2.5-2" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export default function Layout({ children, title }) {
  const router = useRouter();
  const [user, setUserState] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUserState(u);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  if (!user) return null;

  const initials = (user.name || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 2 5-3 1-5 4-5 8h16c0-4-2-7-5-8 1-1.5 2-3 2-5a5 5 0 0 0-5-5z" />
            </svg>
          </div>
          HairFlow AI
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item) => {
              const active = router.pathname.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={'nav-item' + (active ? ' active' : '')}
                >
                  {ICONS[item.icon]}
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar-pink">{initials}</div>
          <div>
            <div className="name">{user.name}</div>
            <div className="role">Administrador</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4-4" />
            </svg>
            Buscar clientes, agendamentos...
          </div>
          <div className="topbar-right">
            <button className="icon-btn" onClick={handleLogout} title="Sair">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
            <div className="user-chip">
              <div className="avatar-pink">{initials}</div>
              <div>
                <div className="name">{user.name}</div>
                <div className="role">Administrador</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <h1 className="page-title">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
