import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';

const EMPTY = {
  hairType: '',
  chemicalHistory: '',
  lastChemicalAt: '',
  productsUsed: '',
  colorFormula: '',
};

export default function HairRecordPage() {
  const router = useRouter();
  const { id, name } = router.query;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !id) return;
    apiFetch('/clients/' + id + '/hair-record')
      .then((record) => {
        if (record) {
          setForm({
            hairType: record.hairType || '',
            chemicalHistory: record.chemicalHistory || '',
            lastChemicalAt: record.lastChemicalAt ? String(record.lastChemicalAt).slice(0, 10) : '',
            productsUsed: record.productsUsed || '',
            colorFormula: record.colorFormula || '',
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router.isReady, id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const body = {
      hairType: form.hairType,
      chemicalHistory: form.chemicalHistory,
      productsUsed: form.productsUsed,
      colorFormula: form.colorFormula,
    };
    if (form.lastChemicalAt) body.lastChemicalAt = form.lastChemicalAt;
    try {
      await apiFetch('/clients/' + id + '/hair-record', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      router.push('/clients?salvo=' + encodeURIComponent(String(name || 'cliente')));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function change(field, value) {
    setForm({ ...form, [field]: value });
  }

  const clientName = name || 'cliente';

  return (
    <Layout title="Ficha capilar">
      <p style={{ marginTop: 0 }}>
        <a href="/clients">Voltar para Clientes</a>
      </p>

      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="card" aria-busy={loading}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Ficha de {clientName}</h2>

        <div className="field">
          <label htmlFor="hr-tipo">Tipo de cabelo</label>
          <input
            id="hr-tipo"
            placeholder="Ex.: liso, ondulado, cacheado, crespo"
            value={form.hairType}
            onChange={(e) => change('hairType', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="hr-historico">Histórico de química</label>
          <textarea
            id="hr-historico"
            rows={4}
            placeholder="Ex.: progressiva em março, descoloração em junho"
            value={form.chemicalHistory}
            onChange={(e) => change('chemicalHistory', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="hr-data">Data da última química</label>
          <input
            id="hr-data"
            type="date"
            value={form.lastChemicalAt}
            onChange={(e) => change('lastChemicalAt', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="hr-produtos">Produtos usados</label>
          <textarea
            id="hr-produtos"
            rows={3}
            value={form.productsUsed}
            onChange={(e) => change('productsUsed', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="hr-cor">Fórmula de cor</label>
          <textarea
            id="hr-cor"
            rows={3}
            value={form.colorFormula}
            onChange={(e) => change('colorFormula', e.target.value)}
          />
        </div>

        <button className="btn-primary" disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar ficha'}
        </button>
      </form>
    </Layout>
  );
}
