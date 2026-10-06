import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvolutionService } from './evolution.service';

const INSTANCE_NAME = 'hairflow';
const BASE_URL = 'http://hairflow_evolution:8080';

type CallResult = { ok: boolean; status: number; data: any };

type StatusInfo = {
  name: string;
  state: string;
  message?: string;
  number?: string;
  profileName?: string;
};

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return digits;
}

@Injectable()
export class WhatsappInstanceService {
  private readonly apiKey: string;

  constructor(
    private config: ConfigService,
    private evolution: EvolutionService,
  ) {
    this.apiKey = this.config.get<string>('EVOLUTION_API_KEY') || '';
  }

  private async call(method: string, path: string, body?: any): Promise<CallResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(BASE_URL + path, {
        method,
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text.slice(0, 300) };
      }
      return { ok: res.ok, status: res.status, data };
    } catch {
      throw new BadRequestException('Não consegui falar com a Evolution API. Confira se ela está ligada.');
    } finally {
      clearTimeout(timer);
    }
  }

  private qrFrom(data: any) {
    let qr: any = data?.base64 ?? data?.qrcode?.base64 ?? null;
    if (qr && !String(qr).startsWith('data:')) qr = 'data:image/png;base64,' + qr;
    const pairingCode: any = data?.pairingCode ?? data?.qrcode?.pairingCode ?? null;
    return { qr: qr ? String(qr) : null, pairingCode: pairingCode ? String(pairingCode) : null };
  }

  private async details(): Promise<{ number?: string; profileName?: string }> {
    try {
      const res = await this.call('GET', '/instance/fetchInstances?instanceName=' + INSTANCE_NAME);
      if (!res.ok) return {};
      const item: any = Array.isArray(res.data) ? res.data[0] : res.data;
      const inst: any = item?.instance ?? item ?? {};
      const jid = String(item?.ownerJid ?? inst?.owner ?? inst?.ownerJid ?? '');
      const number = jid ? jid.split('@')[0].split(':')[0] : item?.number ? String(item.number) : undefined;
      const profileName = item?.profileName ?? inst?.profileName ?? undefined;
      return { number: number || undefined, profileName: profileName ? String(profileName) : undefined };
    } catch {
      return {};
    }
  }

  async status(): Promise<StatusInfo> {
    let res: CallResult;
    try {
      res = await this.call('GET', '/instance/connectionState/' + INSTANCE_NAME);
    } catch {
      return { name: INSTANCE_NAME, state: 'unreachable', message: 'Não consegui falar com a Evolution API.' };
    }
    if (res.status === 404) return { name: INSTANCE_NAME, state: 'not_created' };
    if (!res.ok) {
      return {
        name: INSTANCE_NAME,
        state: 'error',
        message: 'A Evolution API respondeu com o erro ' + res.status + '.',
      };
    }
    const state = String(res.data?.instance?.state ?? res.data?.state ?? 'unknown');
    const info = state === 'open' || state === 'connecting' ? await this.details() : {};
    return { name: INSTANCE_NAME, state, ...info };
  }

  async create() {
    const current = await this.status();
    if (current.state === 'unreachable' || current.state === 'error') {
      throw new BadRequestException(current.message || 'A Evolution API não respondeu.');
    }
    if (current.state !== 'not_created') {
      throw new BadRequestException('A instância já existe. Use Gerar QR Code para conectar.');
    }
    const webhookUrl = this.config.get<string>('WEBHOOK_BASE_URL') || '';
    const res = await this.call('POST', '/instance/create', {
      instanceName: INSTANCE_NAME,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: { url: webhookUrl, events: ['MESSAGES_UPSERT'] },
    });
    if (!res.ok) {
      throw new BadRequestException('Não foi possível criar a instância. Erro ' + res.status + '.');
    }
    return { created: true, ...this.qrFrom(res.data) };
  }

  async qrcode(number?: string) {
    const digits = number ? normalizePhone(number) : '';
    if (number && digits.length < 12) {
      throw new BadRequestException('Escreva o WhatsApp do salão com DDD, só números. Exemplo: 17999998888.');
    }
    const path = '/instance/connect/' + INSTANCE_NAME + (digits ? '?number=' + digits : '');
    const res = await this.call('GET', path);
    if (res.status === 404) {
      throw new BadRequestException('A instância ainda não foi criada. Ative Nova instância.');
    }
    if (!res.ok) {
      throw new BadRequestException('A Evolution API respondeu com o erro ' + res.status + '.');
    }
    const connected = String(res.data?.instance?.state || '') === 'open';
    return { connected, ...this.qrFrom(res.data) };
  }

  async restart() {
    let res = await this.call('PUT', '/instance/restart/' + INSTANCE_NAME);
    if (res.ok) return { ok: true, method: 'restart' };
    if (res.status === 404 || res.status === 405) {
      const fallback = await this.call('GET', '/instance/connect/' + INSTANCE_NAME);
      if (fallback.ok) return { ok: true, method: 'connect' };
      res = fallback;
    }
    throw new BadRequestException('Não foi possível reiniciar. Erro ' + res.status + '.');
  }

  async logout() {
    const res = await this.call('DELETE', '/instance/logout/' + INSTANCE_NAME);
    if (res.ok) return { ok: true };
    const now = await this.status();
    if (now.state === 'close') return { ok: true };
    throw new BadRequestException('Não foi possível desconectar. Erro ' + res.status + '.');
  }

  async remove() {
    try {
      await this.call('DELETE', '/instance/logout/' + INSTANCE_NAME);
    } catch {
      // segue para remover mesmo assim
    }
    const res = await this.call('DELETE', '/instance/delete/' + INSTANCE_NAME);
    if (res.ok || res.status === 404) return { ok: true };
    throw new BadRequestException('Não foi possível remover a instância. Erro ' + res.status + '.');
  }

  async sendTest(phone: string) {
    const digits = normalizePhone(phone);
    if (digits.length < 12) {
      throw new BadRequestException('Escreva o WhatsApp com DDD, só números. Exemplo: 17999998888.');
    }
    const now = await this.status();
    if (now.state !== 'open') {
      throw new BadRequestException('O WhatsApp do salão não está conectado.');
    }
    const ok = await this.evolution.sendMessage(
      digits,
      'Teste do HairFlow AI: o WhatsApp do salão está conectado e enviando mensagens.',
    );
    if (!ok) throw new BadRequestException('A mensagem de teste não foi enviada.');
    return { ok: true };
  }
}
