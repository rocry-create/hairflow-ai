import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const EMPTY = { id: null, shortcut: '', title: '', category: 'Atendimento', text: '' };
const CATEGORIES = ['Atendimento', 'Pagamento', 'Agenda', 'Marketing'];

const codeStyle = {
  background: 'var(--green-soft)',
  color: 'var(--link)',
  padding: '2px 8px',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: 13,
};
const tagStyle = {
  background: 'var(--bg)',
  color: 'var(--muted)',
  border: '1px solid var(--border)',
  padding: '2px 10px',
  borderRadius: 20,
  fontSize: 12,
};

export default function RespostasRapidas() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch('/quick-replies'));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (form && headingRef.current) headingRef.current.focus();
  }, [form]);

  function openNew() {
    setError('');
    setMessage('');
    setForm({ ...EMPTY });
  }

  function openEdit(item) {
    setError('');
    setMessage('');
    setForm({ id: item.id, shortcut: item.shortcut, title: item.title, category: item.category, text: item.text });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({
        shortcut: form.shortcut,
        title: form.title,
        category: form.category,
        text: form.text,
      });
      if (form.id) await apiFetch('/quick-replies/' + form.id, { method: 'PATCH', body });
      else await apiFetch('/quick-replies', { method: 'POST', body });
      setForm(null);
      setMessage('Resposta salva.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm('Excluir a resposta ' + item.title + '?')) return;
    setError('');
    try {
      await apiFetch('/quick-replies/' + item.id, { method: 'DELETE' });
      setMessage('Resposta ' + item.title + ' excluída.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copy(item) {
    setError('');
    try {
      await navigator.clipboard.writeText(item.text);
      setMessage('Texto de ' + item.title + ' copiado.');
    } catch (err) {
      setError('Não consegui copiar. Selecione o texto e copie na mão.');
    }
  }

  async function addExamples() {
    setError('');
    try {
      const r = await apiFetch('/quick-replies/examples', { method: 'POST' });
      setMessage(r.added + ' respostas de exemplo adicionadas. Edite os textos com os dados do seu salão.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const term = filter.trim().toLowerCase();
  const shown = (items || []).filter(
    (i) =>
      !term ||
      i.shortcut.includes(term) ||
      i.title.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term) ||
      i.text.toLowerCase().includes(term)
  );

  return (
    <Layout title="Respostas rápidas">
      <p className="page-sub">
        Mensagens prontas para usar na tela de Conversas, quando a IA estiver pausada e a equipe responder manualmente.
      </p>

      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: 'var(--ok)' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {!form && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
          <button className="btn-primary" onClick={openNew}>
            Nova resposta
          </button>
          <div className="field" style={{ margin: 0, minWidth: 240 }}>
            <label htmlFor="rr-busca">Buscar resposta</label>
            <input id="rr-busca" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
      )}

      {form && (
        <form className="card" style={{ maxWidth: 640, marginBottom: 20 }} onSubmit={save}>
          <h2 ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 18 }}>
            {form.id ? 'Editar resposta' : 'Nova resposta'}
          </h2>
          <div className="field">
            <label htmlFor="rr-atalho">Atalho, em letras minúsculas, sem espaços e sem a barra</label>
            <input
              id="rr-atalho"
              value={form.shortcut}
              onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
              aria-describedby="rr-atalho-ajuda"
            />
            <p id="rr-atalho-ajuda" className="page-sub" style={{ margin: '6px 0 0', fontSize: 13 }}>
              Exemplo: pix. Na conversa, você digita /pix e aperta a barra de espaço.
            </p>
          </div>
          <div className="field">
            <label htmlFor="rr-nome">Nome</label>
            <input id="rr-nome" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="rr-categoria">Categoria</label>
            <input
              id="rr-categoria"
              list="rr-categorias"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id="rr-categorias">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="rr-texto">Texto da mensagem</label>
            <textarea
              id="rr-texto"
              rows={5}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              aria-describedby="rr-texto-ajuda"
            />
            <p id="rr-texto-ajuda" className="page-sub" style={{ margin: '6px 0 0', fontSize: 13 }}>
              Escreva {'{nome}'} onde quiser o primeiro nome da cliente.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {items === null && <p>Carregando as respostas...</p>}

      {items !== null && items.length === 0 && !form && (
        <section className="card" style={{ maxWidth: 560 }}>
          <p style={{ marginTop: 0 }}>Você ainda não tem respostas rápidas.</p>
          <button className="btn-primary" onClick={addExamples}>
            Adicionar exemplos
          </button>
        </section>
      )}

      {items !== null && items.length > 0 && shown.length === 0 && <p>Nenhuma resposta encontrada nessa busca.</p>}

      {shown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {shown.map((item) => (
            <article key={item.id} className="card" aria-label={'Resposta ' + item.title}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <code style={codeStyle}>{'/' + item.shortcut}</code>
                <h3 style={{ fontSize: 15, margin: 0 }}>{item.title}</h3>
                <span style={tagStyle}>{item.category}</span>
              </div>
              <p style={{ margin: '0 0 12px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{item.text}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => copy(item)} aria-label={'Copiar o texto de ' + item.title}>
                  Copiar
                </button>
                <button className="btn-secondary" onClick={() => openEdit(item)} aria-label={'Editar ' + item.title}>
                  Editar
                </button>
                <button
                  className="btn-secondary"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => remove(item)}
                  aria-label={'Excluir ' + item.title}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Layout>
  );
}
