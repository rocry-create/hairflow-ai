import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const STATES = {
  open: { label: 'Conectado', color: '#15803d', bg: '#dcfce7' },
  connecting: { label: 'Aguardando conexão', color: '#b45309', bg: '#fef3c7' },
  close: { label: 'Desconectado', color: '#b91c1c', bg: '#fee2e2' },
  not_created: { label: 'Instância ainda não criada', color: '#374151', bg: '#e5e7eb' },
  unreachable: { label: 'Evolution API fora do ar', color: '#b91c1c', bg: '#fee2e2' },
  error: { label: 'Erro na Evolution API', color: '#b91c1c', bg: '#fee2e2' },
  unknown: { label: 'Estado desconhecido', color: '#374151', bg: '#e5e7eb' },
};

function formatNumber(n) {
  const d = String(n || '').replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 9) + '-' + d.slice(9);
  if (d.length === 12 && d.startsWith('55')) return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 8) + '-' + d.slice(8);
  return d ? '+' + d : '';
}

function cleanCode(code) {
  return String(code || '').replace(/[\s-]/g, '');
}

function formatCode(code) {
  const c = cleanCode(code);
  return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c;
}

const box = { maxWidth: 560, marginBottom: 20 };

export default function WhatsappPage() {
  const [info, setInfo] = useState(null);
  const [panel, setPanel] = useState(null);
  const [codePhone, setCodePhone] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prev = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/whatsapp-instance');
      setInfo(data);
      if (prev.current !== null && prev.current !== data.state) {
        setMessage('Estado do WhatsApp: ' + (STATES[data.state] || STATES.unknown).label + '.');
      }
      if (data.state === 'open') setPanel(null);
      prev.current = data.state;
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, panel ? 4000 : 10000);
    return () => clearInterval(t);
  }, [load, panel]);

  async function run(fn, okText) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await fn();
      if (okText) setMessage(typeof okText === 'function' ? okText(result) : okText);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      load();
    }
  }

  const createInstance = () =>
    run(async () => {
      const r = await apiFetch('/whatsapp-instance/create', { method: 'POST' });
      setPanel({ qr: r.qr, pairingCode: r.pairingCode });
    }, 'Instância criada. Leia o QR Code ou gere um código de pareamento.');

  const getQr = () =>
    run(async () => {
      const r = await apiFetch('/whatsapp-instance/qrcode');
      if (r.connected) setPanel(null);
      else setPanel({ qr: r.qr, pairingCode: r.pairingCode });
      return r;
    }, (r) => (r && r.connected ? 'O WhatsApp já está conectado.' : 'QR Code gerado.'));

  const getCode = () =>
    run(async () => {
      const r = await apiFetch('/whatsapp-instance/qrcode?number=' + encodeURIComponent(codePhone));
      if (!r.pairingCode) {
        throw new Error('Esta versão da Evolution API não gerou o código. Use o QR Code.');
      }
      setPanel({ qr: r.qr, pairingCode: r.pairingCode });
    }, 'Código de pareamento gerado. Digite esse código no WhatsApp do salão.');

  const restart = () =>
    run(() => apiFetch('/whatsapp-instance/restart', { method: 'POST' }), 'Reiniciando. Aguarde alguns segundos.');

  const logout = () => {
    if (!window.confirm('Desconectar o WhatsApp do salão? A IA para de responder até você conectar de novo.')) return;
    run(() => apiFetch('/whatsapp-instance/logout', { method: 'POST' }), 'WhatsApp desconectado.');
  };

  const remove = () => {
    if (!window.confirm('Remover a instância? Será preciso criar uma nova e conectar o número de novo.')) return;
    run(async () => {
      await apiFetch('/whatsapp-instance/remove', { method: 'POST' });
      setPanel(null);
    }, 'Instância removida.');
  };

  const testConnection = () =>
    run(
      () => apiFetch('/whatsapp-instance'),
      (d) =>
        d.state === 'open'
          ? 'Conexão funcionando. O WhatsApp está conectado.'
          : 'O WhatsApp não está conectado: ' + (STATES[d.state] || STATES.unknown).label + '.'
    );

  const sendTest = () =>
    run(
      () => apiFetch('/whatsapp-instance/test', { method: 'POST', body: JSON.stringify({ phone: testPhone }) }),
      'Mensagem de teste enviada. Confira o WhatsApp.'
    );

  const st = info ? STATES[info.state] || STATES.unknown : null;
  const exists = Boolean(info) && !['not_created', 'unreachable', 'error'].includes(info.state);
  const open = Boolean(info) && info.state === 'open';
  const spelled = panel && panel.pairingCode ? cleanCode(panel.pairingCode).split('').join(', ') : '';

  return (
    <Layout title="WhatsApp">
      <p className="page-sub">
        Conecte o número do salão. A IA responde e marca horários por esse número.
      </p>

      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {!info && !error && <p>Carregando a situação do WhatsApp...</p>}

      {info && (
        <section className="card" aria-labelledby="h-inst" style={box}>
          <h2 id="h-inst" style={{ marginTop: 0, fontSize: 18 }}>
            Instância {info.name}
          </h2>
          <p>
            Situação:{' '}
            <strong style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20 }}>
              {st.label}
            </strong>
          </p>
          {info.number && <p>Número conectado: {formatNumber(info.number)}</p>}
          {info.profileName && <p>Nome no WhatsApp: {info.profileName}</p>}
          {info.message && <p>{info.message}</p>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {info.state === 'not_created' && (
              <button className="btn-primary" onClick={createInstance} disabled={busy}>
                Nova instância
              </button>
            )}
            {exists && !open && (
              <button className="btn-primary" onClick={getQr} disabled={busy}>
                Gerar QR Code
              </button>
            )}
            {exists && open && (
              <button className="btn-secondary" onClick={logout} disabled={busy}>
                Desconectar
              </button>
            )}
            {exists && (
              <button className="btn-secondary" onClick={restart} disabled={busy}>
                Reiniciar
              </button>
            )}
            {exists && (
              <button className="btn-secondary" onClick={testConnection} disabled={busy}>
                Testar conexão
              </button>
            )}
            {exists && (
              <button
                className="btn-secondary"
                style={{ color: 'var(--danger)' }}
                onClick={remove}
                disabled={busy}
              >
                Remover instância
              </button>
            )}
          </div>
        </section>
      )}

      {exists && !open && (
        <section className="card" aria-labelledby="h-code" style={box}>
          <h2 id="h-code" style={{ marginTop: 0, fontSize: 18 }}>
            Conectar com código, sem QR Code
          </h2>
          <p className="page-sub" style={{ marginBottom: 12 }}>
            Digite o número do WhatsApp do salão. A tela mostra um código de 8 letras e números, e você digita esse código no WhatsApp.
          </p>
          <div className="field">
            <label htmlFor="wa-numero">WhatsApp do salão, com DDD, só números</label>
            <input
              id="wa-numero"
              inputMode="numeric"
              value={codePhone}
              onChange={(e) => setCodePhone(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={getCode} disabled={busy || !codePhone.trim()}>
            Gerar código de pareamento
          </button>
        </section>
      )}

      {panel && (
        <section className="card" aria-labelledby="h-conectar" style={box}>
          <h2 id="h-conectar" style={{ marginTop: 0, fontSize: 18 }}>
            Conectar o WhatsApp
          </h2>

          {panel.pairingCode && (
            <>
              <p style={{ marginBottom: 4 }}>Código de pareamento:</p>
              <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, margin: '0 0 8px' }}>
                {formatCode(panel.pairingCode)}
              </p>
              <p>Letra por letra: {spelled}.</p>
              <ol style={{ lineHeight: 1.7, paddingLeft: 22 }}>
                <li>No celular do salão, abra o WhatsApp.</li>
                <li>Vá em Configurações, depois em Aparelhos conectados.</li>
                <li>Toque em Conectar um aparelho e escolha Conectar com número de telefone.</li>
                <li>Digite o código acima. A tela avisa quando conectar.</li>
              </ol>
            </>
          )}

          {panel.qr && (
            <>
              <img
                src={panel.qr}
                alt="QR Code para conectar o WhatsApp"
                style={{ width: 240, height: 240, border: '1px solid var(--border)', borderRadius: 10 }}
              />
              <p className="page-sub" style={{ margin: '10px 0 0' }}>
                No celular do salão, abra o WhatsApp, vá em Aparelhos conectados, toque em Conectar um aparelho e leia este QR Code.
              </p>
            </>
          )}

          {!panel.qr && !panel.pairingCode && (
            <p>A Evolution API ainda não devolveu o código. Ative Gerar QR Code de novo em alguns segundos.</p>
          )}
        </section>
      )}

      {open && (
        <section className="card" aria-labelledby="h-teste" style={box}>
          <h2 id="h-teste" style={{ marginTop: 0, fontSize: 18 }}>
            Enviar mensagem de teste
          </h2>
          <div className="field">
            <label htmlFor="wa-teste">WhatsApp que recebe o teste, com DDD, só números</label>
            <input
              id="wa-teste"
              inputMode="numeric"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={sendTest} disabled={busy || !testPhone.trim()}>
            Enviar teste
          </button>
        </section>
      )}
    </Layout>
  );
}
