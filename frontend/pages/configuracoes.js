import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch, getUser, setUser } from '../lib/api';

const TABS = [
  ['perfil', 'Perfil'],
  ['empresa', 'Empresa'],
  ['senha', 'Senha'],
  ['aparencia', 'Aparência'],
];

const DAYS = [
  [1, 'Segunda-feira'],
  [2, 'Terça-feira'],
  [3, 'Quarta-feira'],
  [4, 'Quinta-feira'],
  [5, 'Sexta-feira'],
  [6, 'Sábado'],
  [0, 'Domingo'],
];

const checkLabel = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontWeight: 500, cursor: 'pointer' };
const checkInput = { width: 18, height: 18, padding: 0, margin: 0, flexShrink: 0 };
const panelStyle = { maxWidth: 560 };

function Feedback({ message, error }) {
  return (
    <>
      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

function ProfileTab() {
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
    apiFetch('/account')
      .then((d) => {
        setData(d);
        setName(d.name || '');
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const r = await apiFetch('/account', { method: 'PUT', body: JSON.stringify({ name }) });
      const user = getUser();
      if (user) setUser({ ...user, name: r.name });
      setMessage('Perfil salvo.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="h-perfil" className="card" style={panelStyle}>
      <h2 id="h-perfil" ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
        Perfil
      </h2>
      <Feedback message={message} error={error} />
      {data && (
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="cf-nome">Nome</label>
            <input id="cf-nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cf-email">E-mail</label>
            <input id="cf-email" value={data.email} readOnly aria-describedby="cf-email-ajuda" />
            <p id="cf-email-ajuda" className="page-sub" style={{ margin: '6px 0 0', fontSize: 13 }}>
              O e-mail não pode ser alterado.
            </p>
          </div>
          <p>Tipo de acesso: {data.role === 'ADMIN' ? 'Administrador' : 'Profissional'}.</p>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}
    </section>
  );
}

function CompanyTab() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
    apiFetch('/settings')
      .then(setForm)
      .catch((e) => setError(e.message));
  }, []);

  function toggleDay(day) {
    const has = form.weekdays.includes(day);
    setForm({ ...form, weekdays: has ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day] });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const r = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(form) });
      setForm(r);
      setMessage('Dados da empresa salvos. A IA já usa o novo horário.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="h-empresa" className="card" style={panelStyle}>
      <h2 id="h-empresa" ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
        Empresa
      </h2>
      <Feedback message={message} error={error} />
      {form && (
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="cf-salao">Nome do salão</label>
            <input
              id="cf-salao"
              value={form.salonName}
              onChange={(e) => setForm({ ...form, salonName: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="field">
              <label htmlFor="cf-abre">O salão abre às</label>
              <input
                id="cf-abre"
                type="time"
                value={form.openTime}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="cf-fecha">O salão fecha às</label>
              <input
                id="cf-fecha"
                type="time"
                value={form.closeTime}
                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              />
            </div>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 18px' }}>
            <legend style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, padding: 0 }}>Dias em que o salão atende</legend>
            {DAYS.map(([num, label]) => (
              <label key={num} htmlFor={'cf-dia-' + num} style={checkLabel}>
                <input
                  id={'cf-dia-' + num}
                  type="checkbox"
                  style={checkInput}
                  checked={form.weekdays.includes(num)}
                  onChange={() => toggleDay(num)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <button className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}
    </section>
  );
}

function PasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (next.length < 8) {
      setError('A senha nova precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (next !== again) {
      setError('A senha nova e a repetição não são iguais.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/account/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setCurrent('');
      setNext('');
      setAgain('');
      setMessage('Senha trocada. Use a senha nova da próxima vez que entrar.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="h-senha" className="card" style={panelStyle}>
      <h2 id="h-senha" ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
        Senha
      </h2>
      <Feedback message={message} error={error} />
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="cf-atual">Senha atual</label>
          <input
            id="cf-atual"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-nova">Senha nova, com pelo menos 8 caracteres</label>
          <input
            id="cf-nova"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cf-repita">Repita a senha nova</label>
          <input
            id="cf-repita"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={saving || !current || !next || !again}>
          {saving ? 'Trocando...' : 'Trocar senha'}
        </button>
      </form>
    </section>
  );
}

function AppearanceTab() {
  const [theme, setThemeState] = useState('light');
  const [message, setMessage] = useState('');
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
    setThemeState(window.localStorage.getItem('hairflow_theme') || 'light');
  }, []);

  function choose(value) {
    setThemeState(value);
    window.localStorage.setItem('hairflow_theme', value);
    const dark = value === 'dark' || (value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    setMessage(
      value === 'dark' ? 'Tema escuro ativado.' : value === 'light' ? 'Tema claro ativado.' : 'O tema vai seguir o seu aparelho.'
    );
  }

  const options = [
    ['light', 'Claro'],
    ['dark', 'Escuro'],
    ['auto', 'Seguir o sistema, claro ou escuro conforme o aparelho'],
  ];

  return (
    <section aria-labelledby="h-aparencia" className="card" style={panelStyle}>
      <h2 id="h-aparencia" ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
        Aparência
      </h2>
      <Feedback message={message} error="" />
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, padding: 0 }}>Tema</legend>
        {options.map(([value, label]) => (
          <label key={value} htmlFor={'cf-tema-' + value} style={checkLabel}>
            <input
              id={'cf-tema-' + value}
              type="radio"
              name="tema"
              style={checkInput}
              checked={theme === value}
              onChange={() => choose(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="page-sub" style={{ margin: '8px 0 0', fontSize: 13 }}>
        A escolha vale só neste navegador. Também dá para alternar pelo botão com a lua, no alto da tela.
      </p>
    </section>
  );
}

export default function Configuracoes() {
  const [tab, setTab] = useState('perfil');

  return (
    <Layout title="Configurações">
      <p className="page-sub">Gerencie sua conta e os dados do salão.</p>

      <nav aria-label="Seções de configurações" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'btn-primary' : 'btn-secondary'}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'perfil' && <ProfileTab />}
      {tab === 'empresa' && <CompanyTab />}
      {tab === 'senha' && <PasswordTab />}
      {tab === 'aparencia' && <AppearanceTab />}
    </Layout>
  );
}
