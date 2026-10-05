import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { PieChart, BarChart } from '../components/Charts';

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value || 0),
  );
}

function StatCard({ label, value, iconBg, iconColor, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const ICONS = {
  money: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 1.5-2.5 1.5-2.5.4-2.5 1.5 1.1 2 2.5 2 2.5-.9 2.5-2" />
    </svg>
  ),
  ticket: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v5M12 16h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/dashboard/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Layout title="Dashboard">
      <p className="page-sub">Visao geral do seu salao em tempo real.</p>

      {error && <div className="error-box">{error}</div>}

      {summary && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Faturamento (mes)"
              value={formatMoney(summary.financeiro.faturamento)}
              iconBg="#e3f5ec"
              iconColor="#127d4b"
              icon={ICONS.money}
            />
            <StatCard
              label="Ticket medio"
              value={formatMoney(summary.financeiro.ticketMedio)}
              iconBg="#eef2ff"
              iconColor="#4f46e5"
              icon={ICONS.ticket}
            />
            <StatCard
              label="Agendamentos"
              value={summary.comercial.totalAgendamentos}
              iconBg="#eff6ff"
              iconColor="#2563eb"
              icon={ICONS.calendar}
            />
            <StatCard
              label="Taxa de falta"
              value={(summary.comercial.taxaFalta * 100).toFixed(0) + '%'}
              iconBg="#fef2f2"
              iconColor="#dc2626"
              icon={ICONS.alert}
            />
          </div>

          <section className="card" style={{ marginBottom: 20 }} aria-labelledby="h-graficos">
            <h2 id="h-graficos" style={{ marginTop: 0, fontSize: 17 }}>
              Gráficos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
              <PieChart
                title="Faturamento por serviço, os 5 maiores"
                items={summary.financeiro.servicosMaisVendidos
                  .slice()
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((s) => ({ label: s.name, value: s.revenue }))}
                format={formatMoney}
              />
              <PieChart
                title="Situação dos agendamentos"
                items={[
                  { label: 'Concluídos', value: summary.comercial.concluidos },
                  { label: 'Faltas', value: summary.comercial.faltas },
                  {
                    label: 'Agendados, confirmados ou cancelados',
                    value: Math.max(
                      0,
                      summary.comercial.totalAgendamentos - summary.comercial.concluidos - summary.comercial.faltas,
                    ),
                  },
                ]}
              />
              <BarChart
                title="Faturamento por profissional"
                items={summary.financeiro.profissionaisQueMaisFaturam.map((p) => ({
                  label: p.name,
                  value: p.revenue,
                }))}
                format={formatMoney}
              />
            </div>
          </section>

          <div className="grid-2col">
            <div className="card">
              <div className="panel-head">
                <h3>Servicos mais vendidos</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Servico</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.financeiro.servicosMaisVendidos.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ color: 'var(--muted)' }}>
                        Nenhum atendimento concluido ainda neste periodo.
                      </td>
                    </tr>
                  )}
                  {summary.financeiro.servicosMaisVendidos.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td>{s.count}</td>
                      <td>{formatMoney(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="panel-head">
                <h3>Profissionais que mais faturam</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Atend.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.financeiro.profissionaisQueMaisFaturam.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ color: 'var(--muted)' }}>
                        Nenhum atendimento concluido ainda neste periodo.
                      </td>
                    </tr>
                  )}
                  {summary.financeiro.profissionaisQueMaisFaturam.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.count}</td>
                      <td>{formatMoney(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
