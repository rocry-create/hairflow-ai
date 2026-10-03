import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const EMPTY_FORM = {
  name: '',
  durationMinutes: '',
  price: '',
  priceMax: '',
  requiresEvaluation: false,
  isMegaHair: false,
};

function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + ' min';
  if (m === 0) return h + ' h';
  return h + ' h ' + m + ' min';
}

function priceLabel(service) {
  if (service.priceMax != null && Number(service.priceMax) > Number(service.price)) {
    return formatBRL(service.price) + ' a ' + formatBRL(service.priceMax);
  }
  if (service.requiresEvaluation) {
    return 'A partir de ' + formatBRL(service.price);
  }
  return formatBRL(service.price);
}

// Aceita 250, 89,90, 89.90, 1.800 e 1.800,50
function parsePrice(text) {
  let s = String(text).replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return NaN;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  return Number(s);
}

const checkLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
  fontWeight: 500,
  cursor: 'pointer',
};
const checkInput = { width: 18, height: 18, padding: 0, margin: 0, flexShrink: 0 };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await apiFetch('/services');
      setServices(data || []);
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

  function openEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMinutes: String(service.durationMinutes),
      price: String(Number(service.price)).replace('.', ','),
      priceMax: service.priceMax != null ? String(Number(service.priceMax)).replace('.', ',') : '',
      requiresEvaluation: Boolean(service.requiresEvaluation),
      isMegaHair: Boolean(service.isMegaHair),
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
    const durationMinutes = Number(form.durationMinutes);
    const price = parsePrice(form.price);
    const hasMax = String(form.priceMax).trim() !== '';
    const priceMax = hasMax ? parsePrice(form.priceMax) : null;

    if (name.length < 2) {
      setError('Digite o nome do serviço, com pelo menos 2 letras.');
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5) {
      setError('Digite a duração em minutos, com no mínimo 5. Exemplo: 60.');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError('Digite o preço apenas com números. Exemplo: 250 ou 89,90.');
      return;
    }
    if (hasMax && (Number.isNaN(priceMax) || priceMax < price)) {
      setError('O preço máximo precisa ser um número igual ou maior que o preço inicial.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({
        name,
        durationMinutes,
        price,
        priceMax,
        requiresEvaluation: form.requiresEvaluation,
        isMegaHair: form.isMegaHair,
      });
      if (editingId) {
        await apiFetch('/services/' + editingId, { method: 'PATCH', body });
      } else {
        await apiFetch('/services', { method: 'POST', body });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(service) {
    const ok = window.confirm(
      'Desativar o serviço ' + service.name + '? Ele some desta lista e a IA deixa de oferecer esse serviço.'
    );
    if (!ok) return;
    setError('');
    try {
      await apiFetch('/services/' + service.id, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const smallBtn = { padding: '6px 12px', fontSize: 13, marginRight: 8 };

  return (
    <Layout title="Serviços">
      <p className="page-sub">
        Os preços cadastrados aqui são os que a IA informa aos clientes no WhatsApp.
      </p>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {!showForm && (
        <div className="top-actions">
          <button className="btn-primary" onClick={openNew}>
            Novo serviço
          </button>
        </div>
      )}

      {showForm && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSave}>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>
            {editingId ? 'Editar serviço' : 'Novo serviço'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
            <div className="field">
              <label htmlFor="svc-name">Nome do serviço</label>
              <input
                id="svc-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Exemplo: Corte feminino"
              />
            </div>
            <div className="field">
              <label htmlFor="svc-duration">Duração (minutos)</label>
              <input
                id="svc-duration"
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(e) => setField('durationMinutes', e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="field">
              <label htmlFor="svc-price">Preço ou valor inicial (R$)</label>
              <input
                id="svc-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="89,90"
              />
            </div>
            <div className="field">
              <label htmlFor="svc-price-max">Preço máximo (R$), opcional</label>
              <input
                id="svc-price-max"
                inputMode="decimal"
                value={form.priceMax}
                onChange={(e) => setField('priceMax', e.target.value)}
                placeholder="400"
              />
            </div>
          </div>
          <p className="page-sub" style={{ marginTop: -6, marginBottom: 16, fontSize: 13 }}>
            Se o valor varia, coloque o menor valor em Preço inicial e o maior em Preço máximo.
          </p>

          <label htmlFor="svc-mega" style={checkLabel}>
            <input
              id="svc-mega"
              type="checkbox"
              style={checkInput}
              checked={form.isMegaHair}
              onChange={(e) => setField('isMegaHair', e.target.checked)}
            />
            Serviço de mega hair (feito somente pelas mega hairistas)
          </label>
          <label htmlFor="svc-eval" style={{ ...checkLabel, marginBottom: 18 }}>
            <input
              id="svc-eval"
              type="checkbox"
              style={checkInput}
              checked={form.requiresEvaluation}
              onChange={(e) => setField('requiresEvaluation', e.target.checked)}
            />
            Exige avaliação antes (o valor exato só é definido na avaliação)
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar serviço'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {loading && <p className="page-sub" style={{ margin: 0 }}>Carregando serviços...</p>}

        {!loading && services.length === 0 && (
          <p className="page-sub" style={{ margin: 0 }}>
            Nenhum serviço cadastrado. Use o botão Novo serviço para começar.
          </p>
        )}

        {!loading && services.length > 0 && (
          <table aria-label="Lista de serviços">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const tags = [];
                if (s.isMegaHair) tags.push('Mega hair');
                if (s.requiresEvaluation) tags.push('Exige avaliação');
                return (
                  <tr key={s.id}>
                    <td>
                      {s.name}
                      {tags.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tags.join(', ')}</div>
                      )}
                    </td>
                    <td>{formatDuration(s.durationMinutes)}</td>
                    <td>{priceLabel(s)}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={smallBtn}
                        onClick={() => openEdit(s)}
                        aria-label={'Editar ' + s.name}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ ...smallBtn, color: 'var(--danger)' }}
                        onClick={() => handleRemove(s)}
                        aria-label={'Desativar ' + s.name}
                      >
                        Desativar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
