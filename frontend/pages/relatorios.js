import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { PieChart, BarChart } from '../components/Charts';

function pad(n) {
  return String(n).padStart(2, '0');
}

function brDay(daysAgo) {
  const s = new Date(Date.now() - 3 * 3600000 - daysAgo * 86400000);
  return s.getUTCFullYear() + '-' + pad(s.getUTCMonth() + 1) + '-' + pad(s.getUTCDate());
}

function showDay(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
}

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Table({ title, rows }) {
  return (
    <section className="card" style={{ marginBottom: 20 }} aria-label={title}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>{title}</h2>
      <table>
        <caption style={{ position: 'absolute', left: -9999 }}>{title}</caption>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td>{r[0]}</td>
              <td>{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function Relatorios() {
  const [from, setFrom] = useState(brDay(30));
  const [to, setTo] = useState(brDay(0));
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const summaryRef = useRef(null);

  const load = useCallback(async (f, t) => {
    setLoading(true);
    setError('');
    setSummary(null);
    try {
      const result = await apiFetch('/reports?from=' + f + '&to=' + t);
      setData(result);
      setMessage('Relatório atualizado, de ' + showDay(result.period.from) + ' até ' + showDay(result.period.to) + '.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(brDay(30), brDay(0));
  }, [load]);

  function submit(e) {
    e.preventDefault();
    setMessage('');
    load(from, to);
  }

  async function makeSummary() {
    setLoadingSummary(true);
    setError('');
    setMessage('Gerando o resumo da IA, aguarde.');
    try {
      const result = await apiFetch('/reports/summary?from=' + from + '&to=' + to);
      setSummary(result);
      setMessage('Resumo da IA pronto.');
    } catch (e) {
      setError(e.message);
      setMessage('');
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    if (summary && summaryRef.current) summaryRef.current.focus();
  }, [summary]);

  const d = data;

  return (
    <Layout title="Relatórios IA">
      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 17 }}>Período</h2>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="rel-de">De</label>
            <input id="rel-de" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rel-ate">Até</label>
            <input id="rel-ate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={loading} style={{ marginBottom: 18 }}>
            {loading ? 'Atualizando...' : 'Atualizar relatório'}
          </button>
        </div>
      </form>

      {d && (
        <>
          <section className="card" style={{ marginBottom: 20 }} aria-labelledby="h-resumo">
            <h2 id="h-resumo" ref={summaryRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 17 }}>
              Resumo da IA
            </h2>
            {!summary && (
              <p className="page-sub">
                A IA lê os números deste período e escreve um resumo curto, com o que vai bem, o que merece atenção e o que fazer.
              </p>
            )}
            {summary && (
              <>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary.text}</p>
                {summary.source === 'basic' && (
                  <p className="page-sub">Este é um resumo simples, porque a IA não respondeu agora.</p>
                )}
              </>
            )}
            <button className="btn-primary" onClick={makeSummary} disabled={loadingSummary}>
              {loadingSummary ? 'Gerando resumo...' : summary ? 'Gerar resumo de novo' : 'Gerar resumo da IA'}
            </button>
          </section>

          <section className="card" style={{ marginBottom: 20 }} aria-labelledby="h-graficos">
            <h2 id="h-graficos" style={{ marginTop: 0, fontSize: 17 }}>
              Gráficos
            </h2>
            <p className="page-sub">Os mesmos números das tabelas abaixo, em forma de gráfico.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
              <PieChart
                title="Situação dos horários da agenda"
                items={[
                  { label: 'Concluídos', value: d.agenda.completed },
                  { label: 'Confirmados', value: d.agenda.confirmed },
                  { label: 'Agendados', value: d.agenda.scheduled },
                  { label: 'Cancelados', value: d.agenda.cancelled },
                  { label: 'Faltas', value: d.agenda.noShow },
                ]}
              />
              <PieChart
                title="Faturamento por serviço, os 5 maiores"
                items={d.topServices.map((s) => ({ label: s.name, value: s.revenue }))}
                format={money}
              />
              <PieChart
                title="Quem marcou os agendamentos"
                items={[
                  { label: 'IA no WhatsApp', value: d.bookings.byAi },
                  { label: 'Funil', value: d.bookings.byFunnel },
                  {
                    label: 'Equipe na Agenda',
                    value: Math.max(0, d.bookings.createdTotal - d.bookings.byAi - d.bookings.byFunnel),
                  },
                ]}
              />
              <BarChart
                title="Faturamento por profissional"
                items={d.byProfessional.map((p) => ({ label: p.name, value: p.revenue }))}
                format={money}
              />
            </div>
          </section>

          <Table
            title="Atendimento pelo WhatsApp"
            rows={[
              ['Clientes novas no período', d.contacts.newClients],
              ['Conversas com mensagem da cliente', d.contacts.activeConversations],
              ['Conversas que viraram agendamento', d.contacts.bookedFromConversations],
              ['Taxa de conversão', d.contacts.conversionRate + '%'],
              ['Mensagens recebidas das clientes', d.contacts.clientMessages],
              ['Mensagens respondidas pela IA', d.contacts.aiMessages],
              ['Mensagens enviadas pela equipe', d.contacts.humanMessages],
            ]}
          />

          <Table
            title="Agendamentos criados"
            rows={[
              ['Total de agendamentos criados', d.bookings.createdTotal],
              ['Marcados pela IA no WhatsApp', d.bookings.byAi],
              ['Marcados pelo Funil', d.bookings.byFunnel],
              ['Lembretes de confirmação enviados', d.bookings.remindersSent],
              ['Avisos de manutenção do mega hair enviados', d.bookings.maintenanceSent],
              ['Mensagens de campanhas enviadas', d.bookings.campaignMessages],
            ]}
          />

          <Table
            title="Agenda do período"
            rows={[
              ['Total de horários', d.agenda.total],
              ['Concluídos', d.agenda.completed],
              ['Confirmados, ainda não concluídos', d.agenda.confirmed],
              ['Agendados, sem confirmação', d.agenda.scheduled],
              ['Cancelados', d.agenda.cancelled],
              ['Clientes que faltaram', d.agenda.noShow],
              ['Taxa de faltas', d.agenda.noShowRate + '%'],
            ]}
          />

          <Table
            title="Financeiro do período"
            rows={[
              ['Faturamento', money(d.money.revenue)],
              ['Ticket médio', money(d.money.avgTicket)],
              ['Comissões das profissionais', money(d.money.commissions)],
              ['Lucro líquido estimado', money(d.money.netEstimate)],
            ]}
          />

          <section className="card" style={{ marginBottom: 20 }} aria-labelledby="h-serv">
            <h2 id="h-serv" style={{ marginTop: 0, fontSize: 17 }}>
              Serviços que mais faturam
            </h2>
            {d.topServices.length === 0 && <p>Nenhum atendimento concluído neste período.</p>}
            {d.topServices.length > 0 && (
              <table aria-label="Serviços que mais faturam">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Atendimentos</th>
                    <th>Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topServices.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td>{s.count}</td>
                      <td>{money(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card" style={{ marginBottom: 20 }} aria-labelledby="h-pro">
            <h2 id="h-pro" style={{ marginTop: 0, fontSize: 17 }}>
              Desempenho de cada profissional
            </h2>
            {d.byProfessional.length === 0 && <p>Nenhum atendimento concluído neste período.</p>}
            {d.byProfessional.length > 0 && (
              <table aria-label="Desempenho de cada profissional">
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Atendimentos</th>
                    <th>Faturamento</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {d.byProfessional.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.count}</td>
                      <td>{money(p.revenue)}</td>
                      <td>{money(p.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <Table
            title="Oportunidades"
            rows={[['Clientes que não voltam há mais de 60 dias', d.opportunities.inactive60]]}
          />
          <p className="page-sub">
            Para trazer essas clientes de volta, use o menu Campanhas, com o público de clientes inativas.
          </p>
        </>
      )}
    </Layout>
  );
}
