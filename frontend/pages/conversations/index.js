import { useEffect, useState, useRef } from 'react';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';

const STAGE_LABELS = {
  NOVO_CONTATO: 'Novo contato',
  PEDIU_ORCAMENTO: 'Pediu orcamento',
  AVALIACAO_MARCADA: 'Avaliacao marcada',
  COMPARECEU: 'Compareceu',
  FECHOU_SERVICO: 'Fechou servico',
  POS_VENDA: 'Pos-venda',
};

const STAGE_ORDER = Object.keys(STAGE_LABELS);

const ROLE_LABELS = {
  CLIENT: 'Cliente',
  AI: 'IA',
  HUMAN: 'Voce',
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [waConnected, setWaConnected] = useState(false);
  const [qr, setQr] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  async function loadConversations() {
    try {
      const data = await apiFetch('/whatsapp/conversations');
      setConversations(data || []);
    } catch (err) {
      // silencioso: nao interrompe a tela por causa de uma falha de polling
    }
  }

  async function loadStatus() {
    try {
      const data = await apiFetch('/whatsapp/status');
      const state = data?.instance?.state || data?.state;
      setWaConnected(state === 'open');
    } catch (err) {
      setWaConnected(false);
    }
  }

  async function loadDetail(id) {
    try {
      const data = await apiFetch('/whatsapp/conversations/' + id);
      setDetail(data);
    } catch (err) {
      // ignora falha pontual
    }
  }

  useEffect(() => {
    loadConversations();
    loadStatus();
    const interval = setInterval(() => {
      loadConversations();
      if (selectedId) loadDetail(selectedId);
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [detail]);

  function selectConversation(id) {
    setSelectedId(id);
    setDetail(null);
    loadDetail(id);
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const data = await apiFetch('/whatsapp/connect');
      const base64 = data?.base64 || data?.qrcode?.base64 || data?.code;
      setQr(base64 || null);
    } catch (err) {
      setQr(null);
    } finally {
      setConnecting(false);
    }
  }

  async function toggleAi() {
    if (!detail) return;
    const next = !detail.aiEnabled;
    setDetail({ ...detail, aiEnabled: next });
    try {
      await apiFetch('/whatsapp/conversations/' + detail.id + '/ai', {
        method: 'PATCH',
        body: JSON.stringify({ aiEnabled: next }),
      });
    } catch (err) {
      setDetail({ ...detail, aiEnabled: !next });
    }
  }

  async function changeStage(stage) {
    if (!detail) return;
    const previous = detail.stage;
    setDetail({ ...detail, stage });
    try {
      await apiFetch('/whatsapp/conversations/' + detail.id + '/stage', {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      loadConversations();
    } catch (err) {
      setDetail({ ...detail, stage: previous });
    }
  }

  async function deleteConversation() {
    if (!detail) return;
    if (!window.confirm('Excluir esta conversa? Essa acao nao pode ser desfeita.')) return;
    try {
      await apiFetch('/whatsapp/conversations/' + detail.id, { method: 'DELETE' });
      setSelectedId(null);
      setDetail(null);
      loadConversations();
    } catch (err) {
      // se falhar, conversa continua visivel
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !detail) return;
    setSending(true);
    const text = replyText.trim();
    try {
      await apiFetch('/whatsapp/conversations/' + detail.id + '/reply', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setReplyText('');
      loadDetail(detail.id);
    } catch (err) {
      // mantem o texto no campo se falhar, para o usuario tentar de novo
    } finally {
      setSending(false);
    }
  }

  return (
    <Layout title="Conversas IA">
      <div className="top-actions">
        <div className="wa-status">
          <span className={'wa-dot ' + (waConnected ? 'on' : 'off')} />
          {waConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
        </div>
        {!waConnected && (
          <button className="btn-primary" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Gerando QR code...' : 'Conectar WhatsApp'}
          </button>
        )}
      </div>

      {qr && !waConnected && (
        <div className="card qr-box">
          <img src={qr} alt="QR Code do WhatsApp" />
          <p className="page-sub" style={{ margin: 0 }}>
            Abra o WhatsApp do salao, va em Aparelhos conectados e escaneie este codigo.
          </p>
        </div>
      )}

      <div className="conv-layout">
        <div className="card conv-list">
          {conversations.length === 0 && (
            <div className="empty-state">Nenhuma conversa ainda.</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={'conv-item' + (selectedId === c.id ? ' active' : '')}
              onClick={() => selectConversation(c.id)}
            >
              <div className="conv-item-top">
                <span className="conv-item-name">{c.client?.name || 'Sem nome'}</span>
                <span className={'stage-badge stage-' + c.stage}>
                  {STAGE_LABELS[c.stage] || c.stage}
                </span>
              </div>
              <div className="conv-item-preview">{c.lastMessage || 'Sem mensagens'}</div>
            </div>
          ))}
        </div>

        <div className="card conv-detail">
          {!detail && <div className="empty-state">Selecione uma conversa a esquerda.</div>}

          {detail && (
            <>
              <div className="conv-detail-head">
                <div>
                  <div className="conv-detail-name">{detail.client?.name || 'Sem nome'}</div>
                  <div className="conv-detail-phone">{detail.client?.phone}</div>
                </div>
                <div className="conv-detail-controls">
                  <select
                    value={detail.stage}
                    onChange={(e) => changeStage(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    {STAGE_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <div className="ai-toggle">
                    IA
                    <div
                      className={'switch' + (detail.aiEnabled ? ' on' : '')}
                      onClick={toggleAi}
                    >
                      <div className="switch-knob" />
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={deleteConversation}>
                    Excluir
                  </button>
                </div>
              </div>

              <div className="msg-thread" ref={threadRef}>
                {(detail.messages || []).map((m) => (
                  <div key={m.id} className={'msg-bubble msg-' + m.role}>
                    <div className="msg-role-label">{ROLE_LABELS[m.role] || m.role}</div>
                    {m.content}
                  </div>
                ))}
              </div>

              <div className="reply-row">
                <textarea
                  placeholder="Escreva uma resposta manual..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button className="btn-primary" onClick={sendReply} disabled={sending}>
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
