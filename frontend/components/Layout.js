import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getUser, clearToken, apiFetch } from '../lib/api';

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
      { href: '/whatsapp', label: 'WhatsApp', icon: 'phone' },
      { href: '/funnel', label: 'Funil', icon: 'grid' },
    ],
  },
  {
    section: 'Gestao',
    items: [
      { href: '/clients', label: 'Clientes', icon: 'users' },
      { href: '/agenda', label: 'Agenda', icon: 'calendar' },
      { href: '/services', label: 'Serviços', icon: 'scissors' },
      { href: '/professionals', label: 'Profissionais', icon: 'team' },
      { href: '/acessos', label: 'Acessos da equipe', icon: 'team' },
      { href: '/financeiro', label: 'Financeiro', icon: 'money' },
      { href: '/relatorios', label: 'Relatórios IA', icon: 'grid' },
      { href: '/campaigns', label: 'Campanhas', icon: 'chat' },
    ],
  },
  {
    section: 'Ajuda',
    items: [{ href: '/guia', label: 'Guia de uso', icon: 'book' }],
  },
];

const PRO_NAV = [
  {
    section: 'Meu trabalho',
    items: [
      { href: '/minha-area', label: 'Minha área', icon: 'calendar' },
      { href: '/minha-area/guia', label: 'Guia de uso', icon: 'book' },
    ],
  },
];

const ICONS = {
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5M9 7h6" />
    </svg>
  ),
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const timer = setTimeout(() => {
      const first = document.querySelector('#menu-lateral a');
      if (first) first.focus();
    }, 60);
    function onKey(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        const btn = document.querySelector('.menu-btn');
        if (btn) btn.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const [waDown, setWaDown] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'PROFESSIONAL') return undefined;
    let active = true;
    async function check() {
      try {
        const s = await apiFetch('/whatsapp-instance');
        if (active && s) setWaDown(s.state !== 'open');
      } catch (e) {
        // se a checagem falhar, nao mostra aviso falso
      }
    }
    check();
    const timer = setInterval(check, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    if (u.role === 'PROFESSIONAL' && !router.pathname.startsWith('/minha-area')) {
      router.replace('/minha-area');
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
  const nav = user.role === 'PROFESSIONAL' ? PRO_NAV : NAV;
  const roleLabel = user.role === 'PROFESSIONAL' ? 'Profissional' : 'Administrador';

  return (
    <div className="app">
      <Head>
        <title>{(title ? title + ' - ' : '') + 'HairFlow AI'}</title>
      </Head>
      <aside id="menu-lateral" className={'sidebar' + (menuOpen ? ' open' : '')} aria-label="Menu principal">
        <div className="brand">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 2 5-3 1-5 4-5 8h16c0-4-2-7-5-8 1-1.5 2-3 2-5a5 5 0 0 0-5-5z" />
            </svg>
          </div>
          HairFlow AI
        </div>

        {nav.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item) => {
              const active =
                item.href === '/minha-area'
                  ? router.pathname === '/minha-area' || router.pathname === '/minha-area/ficha'
                  : router.pathname.startsWith(item.href);
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
            <div className="role">{roleLabel}</div>
          </div>
        </div>
      </aside>
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="main">
        <div className="topbar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-lateral"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
                <div className="role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          {waDown && router.pathname !== '/whatsapp' && (
            <div
              role="alert"
              style={{ background: '#fef2f2', border: '1px solid #dc2626', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}
            >
              O WhatsApp do salão não está conectado, e a IA não consegue responder.{' '}
              <a href="/whatsapp" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                Abrir a tela do WhatsApp
              </a>
            </div>
          )}
          <h1 className="page-title">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
