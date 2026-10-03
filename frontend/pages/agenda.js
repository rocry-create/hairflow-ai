import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';

const STATUS_LABEL = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluido',
  NO_SHOW: 'Faltou',
  CANCELLED: 'Cancelado',
};

export default function AgendaPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    professionalId: '',
    serviceId: '',
    scheduledAt: '',
  });
  const [saving, setSaving] = useState(false);

  function loadAppointments() {
    apiFetch('/appointments')
      .then(setAppointments)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadAppointments();
    apiFetch('/clients').then(setClients).catch(() => {});
    apiFetch('/professionals').then(setProfessionals).catch(() => {});
    apiFetch('/services').then(setServices).catch(() => {});
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.serviceId) || null,
    [services, form.serviceId]
  );

  const availableProfessionals = useMemo(() => {
    if (selectedService && selectedService.isMegaHair) {
      return professionals.filter((p) => p.isMegaHairSpecialist);
    }
    return professionals;
  }, [professionals, selectedService]);

  function handleServiceChange(serviceId) {
    const service = services.find((s) => s.id === serviceId);
    const isMega = Boolean(service && service.isMegaHair);
    const stillValid =
      !isMega || professionals.find((p) => p.id === form.professionalId && p.isMegaHairSpecialist);
    setForm({
      ...form,
      serviceId,
      professionalId: stillValid ? form.professionalId : '',
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      });
      setShowForm(false);
      setForm({ clientId: '', professionalId: '', serviceId: '', scheduledAt: '' });
      loadAppointments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiFetch('/appointments/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Agenda">
      {error && <div className="error-box">{error}</div>}

      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Novo agendamento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Cliente</label>
              <select
                required
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">Selecione</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Servico</label>
              <select
                required
                value={form.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">Selecione</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isMegaHair ? ' (mega hair)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Profissional</label>
              <select
                required
                value={form.professionalId}
                onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
              >
                <option value="">Selecione</option>
                {availableProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedService && selectedService.isMegaHair && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  Somente mega hairistas aparecem aqui para este serviço.
                </p>
              )}
            </div>
            <div className="field">
              <label>Data e hora</label>
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Agendar'}
          </button>
        </form>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Cliente</th>
              <th>Profissional</th>
              <th>Servico</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: '#8a8578' }}>
                  Nenhum agendamento ainda.
                </td>
              </tr>
            )}
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.scheduledAt).toLocaleString('pt-BR')}</td>
                <td>{a.client.name}</td>
                <td>{a.professional.name}</td>
                <td>{a.service.name}</td>
                <td>{STATUS_LABEL[a.status] || a.status}</td>
                <td>
                  {a.status === 'SCHEDULED' && (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && updateStatus(a.id, e.target.value)}
                    >
                      <option value="">Acao...</option>
                      <option value="CONFIRMED">Confirmar</option>
                      <option value="COMPLETED">Concluir</option>
                      <option value="NO_SHOW">Marcar falta</option>
                      <option value="CANCELLED">Cancelar</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
