import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const GREEN = '#15803d';
const GREEN_SOFT = '#dcfce7';
const BLACK = '#111111';
const GRAY = '#6b7280';
const LINE = '#e5e7eb';

const SEGMENTS = {
  INACTIVE: {
    label: 'Clientes inativas (sem voltar há X dias)',
    needsDays: true,
    days: 60,
    text: 'Oi {nome}, sentimos sua falta 💕 Já faz um tempinho desde a sua última visita. Temos horários livres essa semana, quer que eu reserve um para você?',
  },
  MEGAHAIR: {
    label: 'Mega hair: hora da manutenção (último mega hair há X dias)',
    needsDays: true,
    days: 60,
    text: 'Oi {nome} 💕 Está chegando a hora da manutenção do seu mega hair. Quer que eu veja um horário para você?',
  },
  ALL: {
    label: 'Todas as clientes',
    needsDays: false,
    days: 60,
    text: 'Oi {nome} 💕 Temos novidades no salão! Quer saber mais?',
  },
};

const STATUS = {
  RUNNING: { label: 'Enviando', color: GREEN },
  PAUSED: { label: 'Pausada', color: '#b45309' },
  COMPLETED: { label: 'Concluída', color: BLACK },
  CANCELLED: { label: 'Cancelada', color: GRAY },
};

const card = {
  background: '#fff',
  border: '1px solid ' + LINE,
  borderRadius: 10,
  padding: 20,
  marginBottom: 20,
};
const input = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid ' + LINE,
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const label = { display: 'block', fontSize: 13, fontWeight: 600, margin: '14px 0 6px' };
const btn = (bg, color) => ({
  background: bg,
  color,
  border: '1px solid ' + (bg === '#fff' ? LINE : bg),
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
});

export default function Campaigns() {
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('INACTIVE');
  const [days, setDays] = useState(60);
  const [message, setMessage] = useState(SEGMENTS.INACTIVE.text);
  const [preview, setPreview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [testPhone, setTestPhone] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await apiFetch('/campaigns'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadCampaigns();
    const t = setInterval(loadCampaigns, 5000);
    return () => clearInterval(t);
  }, [loadCampaigns]);

  useEffect(() => {
    setPreview(null);
    const t = setTimeout(async () => {
      try {
        setPreview(await apiFetch(`/campaigns/preview?segment=${segment}&days=${days}`));
      } catch (e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [segment, days]);

  function changeSegment(value) {
    setSegment(value);
    setDays(SEGMENTS[value].days);
    setMessage(SEGMENTS[value].text);
  }

  async function sendTest() {
    setFeedback(null);
    try {
      await apiFetch('/campaigns/test', {
        method: 'POST',
        body: JSON.stringify({ phone: testPhone, message }),
      });
      setFeedback({ ok: true, text: 'Teste enviado. Confira o WhatsApp.' });
    } catch (e) {
      setFeedback({ ok: false, text: e.message });
    }
  }

  async function startCampaign() {
    setFeedback(null);
    const total = preview ? preview.total : 0;
    if (!window.confirm(`Enviar para ${total} clientes? As mensagens saem uma a uma, com pausa de 20 a 45 segundos entre elas.`)) return;
    setBusy(true);
    try {
      await apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name, message, segment, days }),
      });
      setName('');
      setFeedback({ ok: true, text: 'Campanha iniciada. Acompanhe o envio abaixo.' });
      loadCampaigns();
    } catch (e) {
      setFeedback({ ok: false, text: e.message });
    }
    setBusy(false);
  }

  async function act(id, action) {
    try {
      await apiFetch(`/campaigns/${id}/${action}`, { method: 'POST' });
      loadCampaigns();
    } catch (e) {
      setFeedback({ ok: false, text: e.message });
    }
  }

  const canStart = name.trim() && message.trim() && preview && preview.total > 0 && !preview.tooMany && !busy;

  return (
    <Layout title="Campanhas">
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Nova campanha</div>

        <label style={label}>Nome da campanha</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Recuperação de outubro" />

        <label style={label}>Quem vai receber</label>
        <select style={input} value={segment} onChange={(e) => changeSegment(e.target.value)}>
          {Object.keys(SEGMENTS).map((key) => (
            <option key={key} value={key}>{SEGMENTS[key].label}</option>
          ))}
        </select>

        {SEGMENTS[segment].needsDays && (
          <>
            <label style={label}>Quantidade de dias</label>
            <input style={{ ...input, maxWidth: 120 }} type="number" min="1" max="730" value={days} onChange={(e) => setDays(e.target.value)} />
          </>
        )}

        <div style={{ marginTop: 12, padding: '10px 12px', background: GREEN_SOFT, borderRadius: 8, fontSize: 14 }}>
          {!preview && 'Calculando público...'}
          {preview && preview.total === 0 && 'Nenhuma cliente encontrada para esse público.'}
          {preview && preview.total > 0 && (
            <>
              <strong>{preview.total} clientes</strong> vão receber
              {preview.sample.length > 0 && <> (ex.: {preview.sample.join(', ')})</>}.
              {preview.tooMany && (
                <div style={{ color: '#b91c1c', marginTop: 4 }}>
                  O limite é {preview.max} por campanha, para proteger o número. Use um público menor.
                </div>
              )}
            </>
          )}
        </div>

        <label style={label}>Mensagem (use {'{nome}'} para colocar o primeiro nome)</label>
        <textarea style={{ ...input, minHeight: 100, resize: 'vertical' }} value={message} onChange={(e) => setMessage(e.target.value)} />

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...input, maxWidth: 220 }} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Seu WhatsApp com DDD" />
          <button style={btn('#fff', BLACK)} onClick={sendTest} disabled={!testPhone.trim() || !message.trim()}>
            Enviar teste para mim
          </button>
          <div style={{ flex: 1 }} />
          <button style={{ ...btn(GREEN, '#fff'), opacity: canStart ? 1 : 0.5 }} onClick={startCampaign} disabled={!canStart}>
            Iniciar campanha
          </button>
        </div>

        {feedback && (
          <div style={{ marginTop: 12, fontSize: 14, color: feedback.ok ? GREEN : '#b91c1c' }}>{feedback.text}</div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Campanhas enviadas</div>
        {campaigns.length === 0 && <div style={{ color: GRAY, fontSize: 14 }}>Nenhuma campanha ainda. Crie a primeira acima.</div>}

        {campaigns.map((c) => {
          const done = c.sentCount + c.failedCount;
          const pct = c.total ? Math.round((done / c.total) * 100) : 0;
          const st = STATUS[c.status] || STATUS.COMPLETED;
          const minutes = Math.ceil(((c.total - done) * 32) / 60);
          return (
            <div key={c.id} style={{ borderTop: '1px solid ' + LINE, padding: '14px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong>{c.name}</strong>{' '}
                  <span style={{ color: st.color, fontSize: 13, fontWeight: 600 }}>{st.label}</span>
                  <div style={{ color: GRAY, fontSize: 13 }}>
                    {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'RUNNING' && <button style={btn('#fff', BLACK)} onClick={() => act(c.id, 'pause')}>Pausar</button>}
                  {c.status === 'PAUSED' && <button style={btn(GREEN, '#fff')} onClick={() => act(c.id, 'resume')}>Continuar</button>}
                  {(c.status === 'RUNNING' || c.status === 'PAUSED') && (
                    <button style={btn('#fff', '#b91c1c')} onClick={() => window.confirm('Cancelar esta campanha?') && act(c.id, 'cancel')}>Cancelar</button>
                  )}
                </div>
              </div>
              <div style={{ background: LINE, borderRadius: 6, height: 8, margin: '10px 0 6px', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: GREEN }} />
              </div>
              <div style={{ fontSize: 13, color: GRAY }}>
                {c.sentCount} enviadas · {c.failedCount} com falha · {c.total} no total
                {c.status === 'RUNNING' && c.total - done > 0 && ` · faltam cerca de ${minutes} min`}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
