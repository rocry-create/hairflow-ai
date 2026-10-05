import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

export default function Acessos() {
  const [pros, setPros] = useState([]);
  const [access, setAccess] = useState({});
  const [editing, setEditing] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch('/professionals');
      const acc = await apiFetch('/professional-access');
      const map = {};
      (acc || []).forEach((a) => {
        map[a.professionalId] = a.email;
      });
      setPros(list || []);
      setAccess(map);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editing && headingRef.current) headingRef.current.focus();
  }, [editing]);

  function open(p) {
    setEditing(p);
    setEmail(access[p.id] || '');
    setPassword('');
    setError('');
    setMessage('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/professional-access/' + editing.id, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setMessage('Acesso de ' + editing.name + ' salvo. Passe o e-mail e a senha para ela.');
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Acessos da equipe">
      <p className="page-sub">
        Cada profissional entra com o próprio e-mail e senha e vê só a Minha área: a agenda dela, as comissões dela e as fichas das clientes dela.
      </p>

      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: '#15803d' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {editing && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={save}>
          <h2 ref={headingRef} tabIndex={-1} style={{ marginTop: 0, fontSize: 17 }}>
            Acesso de {editing.name}
          </h2>
          <div className="field">
            <label htmlFor="ac-email">E-mail de entrada, em letras minúsculas</label>
            <input id="ac-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ac-senha">Senha, com pelo menos 8 caracteres</label>
            <input id="ac-senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar acesso'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {pros.length === 0 && <p>Nenhuma profissional cadastrada.</p>}
        {pros.length > 0 && (
          <table aria-label="Acessos da equipe">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Acesso</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pros.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{access[p.id] ? access[p.id] : 'Sem acesso'}</td>
                  <td>
                    <button
                      className="btn-secondary"
                      onClick={() => open(p)}
                      aria-label={(access[p.id] ? 'Trocar e-mail ou senha de ' : 'Criar acesso para ') + p.name}
                    >
                      {access[p.id] ? 'Trocar e-mail ou senha' : 'Criar acesso'}
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
