import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

export default function Grupos() {
  const [cfg, setCfg] = useState(null);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCfg(await apiFetch('/group-automation'));
      setGroups((await apiFetch('/group-automation/groups')) || []);
      setMembers((await apiFetch('/group-automation/members')) || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set(field, value) {
    setCfg({ ...cfg, [field]: value });
  }

  function pickGroup(id) {
    const g = groups.find((x) => x.id === id);
    setCfg({ ...cfg, groupId: id || null, groupName: g ? g.name : null });
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const body = {
        groupId: cfg.groupId || null,
        groupName: cfg.groupName || null,
        welcomeEnabled: cfg.welcomeEnabled,
        welcomeText: cfg.welcomeText,
        offerEnabled: cfg.offerEnabled,
        offerText: cfg.offerText,
        offerDelayMinutes: Number(cfg.offerDelayMinutes),
        repeatAfterHours: Number(cfg.repeatAfterHours),
        enabled: cfg.enabled,
      };
      setCfg(await apiFetch('/group-automation', { method: 'PUT', body: JSON.stringify(body) }));
      setMessage('Configuração salva.');
      setMembers((await apiFetch('/group-automation/members')) || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) {
    return (
      <Layout title="Grupos">
        {error ? <div className="error-box" role="alert">{error}</div> : <p>Carregando...</p>}
      </Layout>
    );
  }

  return (
    <Layout title="Grupos">
      <p className="page-sub">
        Quando alguém entra no grupo escolhido, recebe uma mensagem de boas-vindas e, depois do tempo que você definir, uma segunda mensagem. As mensagens vão no particular.
      </p>

      <div role="status" aria-live="polite" style={{ minHeight: 22, marginBottom: 10, color: 'var(--ok)' }}>
        {message}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <section className="card" style={{ maxWidth: 720, marginBottom: 20 }}>
        <div className="field">
          <label htmlFor="gr-grupo">Grupo do WhatsApp</label>
          <select id="gr-grupo" value={cfg.groupId || ''} onChange={(e) => pickGroup(e.target.value)}>
            <option value="">Escolha o grupo...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || g.id}
              </option>
            ))}
          </select>
          <p className="page-sub" style={{ margin: '6px 0 0', fontSize: 13 }}>
            Ao trocar de grupo, a automação desliga sozinha. Ligue de novo depois de salvar. Quem já está no grupo novo não recebe nada.
          </p>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!cfg.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          Automação ligada
        </label>
      </section>

      <section className="card" style={{ maxWidth: 720, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Mensagem de boas-vindas</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!cfg.welcomeEnabled}
            onChange={(e) => set('welcomeEnabled', e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          Enviar boas-vindas assim que a pessoa entrar
        </label>
        <div className="field">
          <label htmlFor="gr-boas">Texto da boas-vindas</label>
          <textarea id="gr-boas" rows={4} value={cfg.welcomeText || ''} onChange={(e) => set('welcomeText', e.target.value)} />
        </div>
      </section>

      <section className="card" style={{ maxWidth: 720, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Segunda mensagem (oferta)</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!cfg.offerEnabled}
            onChange={(e) => set('offerEnabled', e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          Enviar a segunda mensagem
        </label>
        <div className="field">
          <label htmlFor="gr-oferta">Texto da segunda mensagem</label>
          <textarea id="gr-oferta" rows={4} value={cfg.offerText || ''} onChange={(e) => set('offerText', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gr-tempo">Enviar depois de quantos minutos</label>
          <input id="gr-tempo" type="number" min="0" value={cfg.offerDelayMinutes} onChange={(e) => set('offerDelayMinutes', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gr-repete">Quem sair e entrar de novo só recebe outra vez depois de quantas horas</label>
          <input id="gr-repete" type="number" min="0" value={cfg.repeatAfterHours} onChange={(e) => set('repeatAfterHours', e.target.value)} />
        </div>
        <p className="page-sub" style={{ fontSize: 13 }}>
          Escreva {'{nome}'} onde quiser o primeiro nome da pessoa. Você pode mudar os textos quando quiser, e a mudança vale também para quem já está esperando a segunda mensagem.
        </p>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </section>

      <section className="card" style={{ maxWidth: 720, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Quem entrou no grupo</h2>
        {members.length === 0 && <p className="page-sub">Ainda não há pessoas registradas. Escolha o grupo, salve e ligue a automação.</p>}
        {members.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {members.map((m) => (
              <li key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{m.name || m.phone}</strong>
                {' - '}
                {m.present ? 'no grupo' : 'saiu'}
                {'. Boas-vindas: '}
                {m.welcomeSentAt ? 'enviada' : m.welcomeDueAt ? 'aguardando' : 'não se aplica'}
                {'. Segunda mensagem: '}
                {m.offerSentAt ? 'enviada' : m.offerDueAt ? 'aguardando' : 'não se aplica'}
                {'.'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}
