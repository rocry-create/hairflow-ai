import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const INSTANCE_NAME = 'hairflow';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.baseUrl = 'http://hairflow_evolution:8080';
    this.apiKey = this.config.get<string>('EVOLUTION_API_KEY');
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey || '',
    };
  }

  async createInstance(webhookUrl: string) {
    const res = await fetch(this.baseUrl + '/instance/create', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          events: ['MESSAGES_UPSERT'],
        },
      }),
    });
    return res.json();
  }

  async getQrCode() {
    const res = await fetch(this.baseUrl + '/instance/connect/' + INSTANCE_NAME, {
      headers: this.headers(),
    });
    return res.json();
  }

  async getStatus() {
    const res = await fetch(this.baseUrl + '/instance/connectionState/' + INSTANCE_NAME, {
      headers: this.headers(),
    });
    return res.json();
  }

  async sendMessage(phone: string, text: string) {
    try {
      const res = await fetch(this.baseUrl + '/message/sendText/' + INSTANCE_NAME, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          number: phone,
          text,
        }),
      });
      if (!res.ok) {
        this.logger.error('Falha ao enviar mensagem: ' + res.status + ' ' + (await res.text()));
      }
      return res.ok;
    } catch (err) {
      this.logger.error('Erro ao enviar mensagem via Evolution API', err);
      return false;
    }
  }

  async getGroupParticipants(groupId: string): Promise<{ phone: string; name: string | null }[] | null> {
    try {
      const url = this.baseUrl + '/group/participants/' + INSTANCE_NAME + '?groupJid=' + encodeURIComponent(groupId);
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) return null;
      const data: any = await res.json();
      const list: any[] = Array.isArray(data) ? data : data.participants || [];
      const out: { phone: string; name: string | null }[] = [];
      for (const p of list) {
        const raw = String((p && (p.phoneNumber || p.id)) || '');
        if (raw.includes('@lid') && !p.phoneNumber) continue;
        const phone = raw.split('@')[0].split(':')[0].replace(/\D/g, '');
        if (phone) out.push({ phone, name: (p && p.name) || null });
      }
      return out;
    } catch (err) {
      return null;
    }
  }
}
