import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const TZ = 'America/Sao_Paulo';

function when(value) {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currentMonth() {
  const s = new Date(Date.now() - 3 * 3600000);
  return s.getUTCFullYear() + '-' + String(s.getUTCMonth() + 1).padStart(2, '0');
}

function fichaLink(a) {
  return '/minha-area/ficha?clientId=' + a.clientId + '&name=' + encodeURIComponent(a.clientName);
}

const linkBtn = { padding: '6px 12px', fontSize: 13, textDecoration: 'none', display: 'inline-block' };

export default function MyArea() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [pending, setPending] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [comm, setComm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      setMe(await apiFetch('/professional-area/me'));
      setUpcoming(await apiFetch('/professional-area/upcoming'));
      setPending(await apiFetch('/professional-area/to-complete'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadCommissions = useCallback(async () => {
    try {
      setComm(await apiFetch('/professional-area/commissions?month=' + month));
    } catch (e) {
      setError(e.message);
    }
  }, [month]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  async function mark(a, status) {
    setError('');
    setMessage('');
    try {
      await apiFetch('/professional-area/appointments/' + a.id, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMessage(
        status === 'COMPLETED'
          ? 'Atendimento de ' + a.clientName + ' marcado como concluído.'
          : 'Atendimento de ' + a.clientName + ' marcado como falta.'
      );
      loadAppointments();
      loadCommissions();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Layout title={me ? 'Olá, ' + me.name : 'Minha área'}>
      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
        {router.query.salvo && !message ? 'Ficha capilar de ' + router.query.salvo + ' salva.' : ''}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <section aria-labelledby="h-concluir" className="card" style={{ marginBottom: 20 }}>
        <h2 id="h-concluir" style={{ marginTop: 0, fontSize: 18 }}>
          Atendimentos para concluir ({pending.length})
        </h2>
        <p className="page-sub">Atendimentos que já aconteceram e ainda não foram marcados.</p>
        {pending.length === 0 && <p>Nenhum atendimento esperando.</p>}
        {pending.map((a) => (
          <article
            key={a.id}
            aria-label={'Atendimento de ' + a.clientName}
            style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}
          >
            <strong>{a.clientName}</strong>
            <div>
              {a.serviceName}, {when(a.scheduledAt)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => mark(a, 'COMPLETED')}
                aria-label={'Concluir atendimento de ' + a.clientName}
              >
                Concluir
              </button>
              <button
                className="btn-secondary"
                onClick={() => mark(a, 'NO_SHOW')}
                aria-label={'Marcar que ' + a.clientName + ' faltou'}
              >
                Cliente faltou
              </button>
              <a
                href={fichaLink(a)}
                className="btn-secondary"
                style={linkBtn}
                aria-label={'Ficha capilar de ' + a.clientName}
              >
                Ficha capilar
              </a>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="h-proximos" className="card" style={{ marginBottom: 20 }}>
        <h2 id="h-proximos" style={{ marginTop: 0, fontSize: 18 }}>
          Próximos atendimentos ({upcoming.length})
        </h2>
        {upcoming.length === 0 && <p>Nenhum atendimento marcado.</p>}
        {upcoming.length > 0 && (
          <table aria-label="Próximos atendimentos">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Situação</th>
                <th>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id}>
                  <td>{when(a.scheduledAt)}</td>
                  <td>{a.clientName}</td>
                  <td>{a.serviceName}</td>
                  <td>{a.status === 'CONFIRMED' ? 'Confirmado' : 'Agendado'}</td>
                  <td>
                    <a
                      href={fichaLink(a)}
                      className="btn-secondary"
                      style={linkBtn}
                      aria-label={'Ficha capilar de ' + a.clientName}
                    >
                      Ficha capilar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="h-comissoes" className="card">
        <h2 id="h-comissoes" style={{ marginTop: 0, fontSize: 18 }}>
          Minhas comissões
        </h2>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="mes">Mês</label>
          <input id="mes" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {comm && (
          <>
            <p role="status" aria-live="polite">
              {comm.count} atendimentos concluídos. Total atendido: {money(comm.totalRevenue)}. Sua comissão de{' '}
              {comm.percent}%: <strong>{money(comm.totalCommission)}</strong>.
            </p>
            {comm.items.length > 0 && (
              <table aria-label="Atendimentos do mês">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Valor</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {comm.items.map((i) => (
                    <tr key={i.id}>
                      <td>{when(i.scheduledAt)}</td>
                      <td>{i.clientName}</td>
                      <td>{i.serviceName}</td>
                      <td>{money(i.price)}</td>
                      <td>{money(i.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
