import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { login } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      router.push(data && data.user && data.user.role === 'PROFESSIONAL' ? '/minha-area' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" style={{ display: 'flex', minHeight: '100vh' }}>
      <Head>
        <title>Entrar - HairFlow AI</title>
      </Head>
      <div
        className="login-hero"
        style={{
          flex: 1.1,
          background: 'linear-gradient(135deg, #127d4b 0%, #0d5c38 100%)',
          color: 'white',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 2 5-3 1-5 4-5 8h16c0-4-2-7-5-8 1-1.5 2-3 2-5a5 5 0 0 0-5-5z" />
            </svg>
          </div>
          HairFlow AI
        </div>

        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, marginBottom: 16 }}>
            A recepcionista que nunca dorme.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
            Atendimento por IA no WhatsApp, agenda inteligente, CRM e gestao completa para o
            seu salao.
          </p>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          HairFlow AI - feito para saloes de beleza
        </div>
      </div>

      <div className="login-form-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="login-form-box" style={{ width: 380 }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Entrar na sua conta</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
            Acesse o painel do seu salao.
          </p>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <input id="login-email" autoComplete="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="login-senha">Senha</label>
              <input
                id="login-senha"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
