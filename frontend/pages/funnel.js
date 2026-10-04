import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const GREEN = '#15803d';
const BLACK = '#111111';
const GRAY = '#6b7280';
const LINE = '#e5e7eb';

const STAGES = [
  ['NOVO_CONTATO', 'Novos contatos'],
  ['PEDIU_ORCAMENTO', 'Pediu orçamento'],
  ['AVALIACAO_MARCADA', 'Avaliação marcada'],
  ['COMPARECEU', 'Compareceu'],
  ['FECHOU_SERVICO', 'Fechou serviço'],
  ['POS_VENDA', 'Pós-venda'],
];
const EARLY = ['NOVO_CONTATO', 'PEDIU_ORCAMENTO', 'AVALIACAO_MARCADA'];

const box = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: 20, marginBottom: 20 };
const field = { width: '100%', padding: '9px 11px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, margin: '12px 0 6px' };
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

function plain(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function stageLabel(key) {
  const found = STAGES.find((s) => s[0] === key);
  return found ? found[1] : key;
}

function defaultServiceId(card, services) {
  const interest = services.find((s) => s.id === card.interestServiceId);
  if (interest && interest.requiresEvaluation && EARLY.includes(card.stage)) {
    const evaluations = services.filter((s) => !s.requiresEvaluation && plain(s.name).includes('avalia'));
    const match = evaluations.find((s) => s.isMegaHair === interest.isMegaHair) || evaluations[0];
    if (match) return match.id;
  }
  if (interest) return interest.id;
  return services[0] ? services[0].id : '';
}

function formatWhen(value) {
  return new Date(value).toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NewCardPanel({ services, onDone, onCancel }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [stage, setStage] = useState('NOVO_CONTATO');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch('/funnel/cards', {
        method: 'POST',
        body: JSON.stringify({ name, phone, serviceId, stage }),
      });
      onDone('Cartão criado para ' + name + '.');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="novo-titulo" style={box}>
      <h2 id="novo-titulo" ref={headingRef} tabIndex={-1} style={{ fontSize: 17, margin: 0 }}>Novo cartão</h2>
      <form onSubmit={submit}>
        <label style={lbl} htmlFor="nc-nome">Nome da cliente</label>
        <input id="nc-nome" style={field} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={lbl} htmlFor="nc-fone">WhatsApp com DDD, só números</label>
        <input id="nc-fone" style={field} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={lbl} htmlFor="nc-servico">Serviço que ela quer</label>
        <select id="nc-servico" style={field} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Ainda não escolhido</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label style={lbl} htmlFor="nc-etapa">Etapa do funil</label>
        <select id="nc-etapa" style={field} value={stage} onChange={(e) => setStage(e.target.value)}>
          {STAGES.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" style={btn(GREEN, '#fff')} disabled={busy}>Criar cartão</button>
          <button type="button" style={btn('#fff', BLACK)} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}

function SchedulePanel({ card, services, professionals, onDone, onCancel }) {
  const [serviceId, setServiceId] = useState(defaultServiceId(card, services));
  const [professionalId, setProfessionalId] = useState('');
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const options = service && service.isMegaHair ? professionals.filter((p) => p.isMegaHairSpecialist) : professionals;
  const chosen = options.some((p) => p.id === professionalId) ? professionalId : options[0] ? options[0].id : '';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!when) {
      setError('Escolha o dia e o horário.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/funnel/cards/' + card.id + '/schedule', {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          professionalId: chosen,
          scheduledAt: new Date(when).toISOString(),
        }),
      });
      onDone('Horário marcado na Agenda para ' + card.client.name + '.');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="agendar-titulo" style={box}>
      <h2 id="agendar-titulo" ref={headingRef} tabIndex={-1} style={{ fontSize: 17, margin: 0 }}>
        Agendar para {card.client.name}
      </h2>
      <p style={{ color: GRAY, fontSize: 13 }}>
        Depois da avaliação, mova o cartão para Compareceu. Aí o serviço final já vem escolhido aqui.
      </p>
      <form onSubmit={submit}>
        <label style={lbl} htmlFor="ag-servico">Serviço</label>
        <select id="ag-servico" style={field} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label style={lbl} htmlFor="ag-prof">Profissional</label>
        <select id="ag-prof" style={field} value={chosen} onChange={(e) => setProfessionalId(e.target.value)}>
          {options.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label style={lbl} htmlFor="ag-quando">Dia e horário</label>
        <input id="ag-quando" type="datetime-local" style={field} value={when} onChange={(e) => setWhen(e.target.value)} />

        {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" style={btn(GREEN, '#fff')} disabled={busy}>Marcar na Agenda</button>
          <button type="button" style={btn('#fff', BLACK)} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}

export default function Funnel() {
  const [data, setData] = useState({ cards: [], services: [], professionals: [] });
  const [message, setMessage] = useState(null);
  const [panel, setPanel] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch('/funnel'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function updateCard(card, changes, okText) {
    try {
      await apiFetch('/funnel/cards/' + card.id, { method: 'PATCH', body: JSON.stringify(changes) });
      setMessage({ ok: true, text: okText });
      load();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    }
  }

  function finished(text) {
    setPanel(null);
    setMessage({ ok: true, text });
    load();
  }

  return (
    <Layout title="Funil">
      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, fontSize: 14, color: message && !message.ok ? '#b91c1c' : GREEN }}>
        {message ? message.text : ''}
      </div>

      {!panel && (
        <button style={{ ...btn(GREEN, '#fff'), marginBottom: 16 }} onClick={() => setPanel({ type: 'new' })}>
          Novo cartão
        </button>
      )}

      {panel && panel.type === 'new' && (
        <NewCardPanel services={data.services} onDone={finished} onCancel={() => setPanel(null)} />
      )}
      {panel && panel.type === 'schedule' && (
        <SchedulePanel
          card={panel.card}
          services={data.services}
          professionals={data.professionals}
          onDone={finished}
          onCancel={() => setPanel(null)}
        />
      )}

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 12 }}>
        {STAGES.map(([key, label]) => {
          const cards = data.cards.filter((c) => c.stage === key);
          return (
            <section
              key={key}
              aria-labelledby={'col-' + key}
              style={{ flex: '0 0 270px', background: '#f9fafb', border: '1px solid ' + LINE, borderRadius: 10, padding: 12 }}
            >
              <h2 id={'col-' + key} style={{ fontSize: 15, margin: '0 0 10px' }}>
                {label} ({cards.length})
              </h2>
              {cards.length === 0 && <p style={{ color: GRAY, fontSize: 13, margin: 0 }}>Nenhum cartão.</p>}
              {cards.map((card) => (
                <article
                  key={card.id}
                  aria-label={'Cartão de ' + card.client.name}
                  style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 8, padding: 12, marginBottom: 10 }}
                >
                  <strong>{card.client.name}</strong>
                  <div style={{ color: GRAY, fontSize: 13 }}>{card.client.phone}</div>

                  <label style={{ ...lbl, marginTop: 10 }} htmlFor={'sv-' + card.id}>Serviço</label>
                  <select
                    id={'sv-' + card.id}
                    style={field}
                    value={card.interestServiceId || ''}
                    onChange={(e) => updateCard(card, { serviceId: e.target.value }, 'Serviço de ' + card.client.name + ' atualizado.')}
                  >
                    <option value="">Não escolhido</option>
                    {data.services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {card.nextAppointment && (
                    <p style={{ fontSize: 13, margin: '10px 0 0' }}>
                      Horário marcado: {card.nextAppointment.serviceName}, {formatWhen(card.nextAppointment.scheduledAt)}, com {card.nextAppointment.professionalName}.
                    </p>
                  )}

                  <label style={lbl} htmlFor={'mv-' + card.id}>Mover para</label>
                  <select
                    id={'mv-' + card.id}
                    style={field}
                    value={card.stage}
                    onChange={(e) => updateCard(card, { stage: e.target.value }, 'Cartão de ' + card.client.name + ' movido para ' + stageLabel(e.target.value) + '.')}
                  >
                    {STAGES.map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>

                  <button
                    style={{ ...btn(GREEN, '#fff'), marginTop: 12, width: '100%' }}
                    onClick={() => setPanel({ type: 'schedule', card })}
                    disabled={data.services.length === 0}
                    aria-label={'Agendar ' + card.client.name}
                  >
                    Agendar
                  </button>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
