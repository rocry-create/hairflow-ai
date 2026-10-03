import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const EMPTY_FORM = { name: '', phone: '', commissionPercent: '', isMegaHairSpecialist: false };

const checkLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 18,
  fontWeight: 500,
  cursor: 'pointer',
};
const checkInput = { width: 18, height: 18, padding: 0, margin: 0, flexShrink: 0 };

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await apiFetch('/professionals');
      setProfessionals(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setField(field, value) {
    setForm({ ...form, [field]: value });
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      phone: p.phone || '',
      commissionPercent: String(p.commissionPercent ?? 0).replace('.', ','),
      isMegaHairSpecialist: Boolean(p.isMegaHairSpecialist),
    });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const commissionText = String(form.commissionPercent).replace('%', '').replace(',', '.').trim();
    const commissionPercent = commissionText === '' ? 0 : Number(commissionText);

    if (name.length < 2) {
      setError('Digite o nome da profissional, com pelo menos 2 letras.');
      return;
    }
    if (Number.isNaN(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
      setError('Digite a comissão como um número de 0 a 100. Exemplo: 40.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({
        name,
        phone,
        commissionPercent,
        isMegaHairSpecialist: form.isMegaHairSpecialist,
      });
      if (editingId) {
        await apiFetch('/professionals/' + editingId, { method: 'PATCH', body });
      } else {
        await apiFetch('/professionals', { method: 'POST', body });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(p) {
    const ok = window.confirm('Remover ' + p.name + ' da lista de profissionais?');
    if (!ok) return;
    setError('');
    try {
      await apiFetch('/professionals/' + p.id, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const smallBtn = { padding: '6px 12px', fontSize: 13, marginRight: 8 };

  return (
    <Layout title="Profissionais">
      <p className="page-sub">
        Cadastre quem atende no salão. A Agenda usa essa lista para marcar os horários.
      </p>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {!showForm && (
        <div className="top-actions">
          <button className="btn-primary" onClick={openNew}>
            Nova profissional
          </button>
        </div>
      )}

      {showForm && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSave}>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>
            {editingId ? 'Editar profissional' : 'Nova profissional'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
            <div className="field">
              <label htmlFor="pro-name">Nome</label>
              <input
                id="pro-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="field">
              <label htmlFor="pro-phone">Telefone (opcional)</label>
              <input
                id="pro-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="17 99999-9999"
              />
            </div>
            <div className="field">
              <label htmlFor="pro-commission">Comissão (%)</label>
              <input
                id="pro-commission"
                inputMode="decimal"
                value={form.commissionPercent}
                onChange={(e) => setField('commissionPercent', e.target.value)}
                placeholder="40"
              />
            </div>
          </div>

          <label htmlFor="pro-mega" style={checkLabel}>
            <input
              id="pro-mega"
              type="checkbox"
              style={checkInput}
              checked={form.isMegaHairSpecialist}
              onChange={(e) => setField('isMegaHairSpecialist', e.target.checked)}
            />
            Mega hairista (faz colocação, manutenção e remoção de mega hair)
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar profissional'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {loading && <p className="page-sub" style={{ margin: 0 }}>Carregando profissionais...</p>}

        {!loading && professionals.length === 0 && (
          <p className="page-sub" style={{ margin: 0 }}>
            Nenhuma profissional cadastrada. Use o botão Nova profissional para começar.
          </p>
        )}

        {!loading && professionals.length > 0 && (
          <table aria-label="Lista de profissionais">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Especialidade</th>
                <th>Telefone</th>
                <th>Comissão</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.isMegaHairSpecialist ? 'Mega hairista' : 'Geral'}</td>
                  <td>{p.phone || 'Não informado'}</td>
                  <td>{Number(p.commissionPercent ?? 0)}%</td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={smallBtn}
                      onClick={() => openEdit(p)}
                      aria-label={'Editar ' + p.name}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ ...smallBtn, color: 'var(--danger)' }}
                      onClick={() => handleRemove(p)}
                      aria-label={'Remover ' + p.name}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
