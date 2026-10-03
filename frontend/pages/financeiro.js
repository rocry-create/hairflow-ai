import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value || 0),
  );
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function FinanceiroPage() {
  const [from, setFrom] = useState(toInputDate(firstDayOfMonth()));
  const [to, setTo] = useState(toInputDate(new Date()));
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError('');
    apiFetch('/dashboard/summary?from=' + from + '&to=' + to)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilter(e) {
    e.preventDefault();
    load();
  }

  return (
    <Layout title="Financeiro">
      <p className="page-sub">
        Faturamento, comissões e lucro líquido estimado por período, com base nos atendimentos concluídos.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleFilter} className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Carregando...' : 'Filtrar'}
          </button>
        </div>
      </form>

      {summary && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Faturamento</span>
              </div>
              <div className="stat-value">{formatMoney(summary.financeiro.faturamento)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Comissões a pagar</span>
              </div>
              <div className="stat-value">{formatMoney(summary.financeiro.totalComissoes)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Lucro líquido estimado</span>
              </div>
              <div className="stat-value">{formatMoney(summary.financeiro.lucroLiquido)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Ticket médio</span>
              </div>
              <div className="stat-value">{formatMoney(summary.financeiro.ticketMedio)}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-head">
              <h3>Comissões por profissional</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Atendimentos</th>
                  <th>Faturou</th>
                  <th>% Comissão</th>
                  <th>Comissão a pagar</th>
                </tr>
              </thead>
              <tbody>
                {summary.financeiro.profissionaisQueMaisFaturam.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--muted)' }}>
                      Nenhum atendimento concluído neste período.
                    </td>
                  </tr>
                )}
                {summary.financeiro.profissionaisQueMaisFaturam.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.count}</td>
                    <td>{formatMoney(p.revenue)}</td>
                    <td>{p.commissionPercent}%</td>
                    <td>{formatMoney(p.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="panel-head">
              <h3>Faturamento por serviço</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Qtd.</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {summary.financeiro.servicosMaisVendidos.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--muted)' }}>
                      Nenhum atendimento concluído neste período.
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
        </>
      )}
    </Layout>
  );
}
