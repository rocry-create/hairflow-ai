import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', instagram: '' });
  const [saving, setSaving] = useState(false);

  function load(searchTerm) {
    const query = searchTerm ? '?search=' + encodeURIComponent(searchTerm) : '';
    apiFetch('/clients' + query)
      .then(setClients)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load('');
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(search);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', phone: '', instagram: '' });
      setShowForm(false);
      load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(client) {
    const ok = window.confirm(
      'Remover ' + client.name + '? Isso também apaga o histórico de conversas e agendamentos ligados a este cliente.'
    );
    if (!ok) return;
    setError('');
    try {
      await apiFetch('/clients/' + client.id, { method: 'DELETE' });
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Clientes">
      {router.query.salvo && (
        <div role="status" aria-live="polite" style={{ color: '#15803d', marginBottom: 10 }}>
          Ficha capilar de {router.query.salvo} salva.
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.6rem', width: 360 }}>
          <input
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-secondary">Buscar</button>
        </form>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Novo cliente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Nome</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Telefone (WhatsApp)</label>
              <input
                required
                placeholder="5511999999999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </form>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Instagram</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: '#8a8578' }}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.instagram || '-'}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>
                  <a
                    href={'/clients/' + c.id + '?name=' + encodeURIComponent(c.name)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13, marginRight: 8, textDecoration: 'none', display: 'inline-block' }}
                    aria-label={'Ficha capilar de ' + c.name}
                  >
                    Ficha capilar
                  </a>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13, color: 'var(--danger)' }}
                    onClick={() => handleRemove(c)}
                    aria-label={'Remover ' + c.name}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
