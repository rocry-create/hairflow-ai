import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BASE_PROMPT = `Voce e a recepcionista virtual de um salao de beleza premium chamado HairFlow.
Seu trabalho e atender clientes pelo WhatsApp com simpatia e profissionalismo.

Suas funcoes:
- Entender a intencao do cliente (corte, mechas, mega hair, progressiva, coloracao, hidratacao, orcamento).
- Dar informacoes sobre servicos quando perguntado, usando SOMENTE a lista de servicos e precos abaixo.
- Se o cliente perguntar o preco de um servico da lista, responda o preco direto, sem enrolar ou dizer que vai verificar.
- Servicos que exigem avaliacao NUNCA tem preco final: informe sempre "a partir de" ou a faixa de valores da lista e explique que o valor exato e definido em uma avaliacao com a mega hairista. Nunca diga um valor exato para eles.
- Servicos de mega hair (colocacao, manutencao e remocao) sao feitos somente pelas mega hairistas do salao.
- Se o servico perguntado nao estiver na lista, diga que vai confirmar com a equipe.
- Ajudar a agendar horarios, perguntando dia e horario de preferencia. Para servicos que exigem avaliacao, o primeiro passo e agendar a avaliacao.
- Ser calorosa, breve e objetiva. Use no maximo 2-3 frases por resposta.
- Nunca invente precos ou horarios especificos que nao foram informados a voce.

Responda sempre em portugues do Brasil, em tom acolhedor e profissional.`;

type ServiceInfo = {
  name: string;
  price: number;
  priceMax?: number | null;
  requiresEvaluation?: boolean;
  isMegaHair?: boolean;
  durationMinutes: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function brl(value: number) {
  const [int, dec] = value.toFixed(2).split('.');
  return 'R$ ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

function describeService(s: ServiceInfo) {
  let priceText = brl(s.price);
  if (s.priceMax != null && s.priceMax > s.price) {
    priceText = 'de ' + brl(s.price) + ' a ' + brl(s.priceMax);
  } else if (s.requiresEvaluation) {
    priceText = 'a partir de ' + brl(s.price);
  }

  const notes: string[] = [];
  if (s.requiresEvaluation) notes.push('exige avaliacao, o valor exato so e definido na avaliacao');
  if (s.isMegaHair) notes.push('servico de mega hair, feito somente pelas mega hairistas');

  return (
    '- ' +
    s.name +
    ': ' +
    priceText +
    ' (' +
    s.durationMinutes +
    ' min)' +
    (notes.length > 0 ? ' - ' + notes.join('; ') : '')
  );
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_API_KEY');
  }

  private buildSystemPrompt(clientName: string, services: ServiceInfo[]) {
    let servicesBlock = 'Nenhum servico cadastrado no momento.';
    if (services.length > 0) {
      servicesBlock = services.map(describeService).join('\n');
    }

    return (
      BASE_PROMPT +
      '\n\nServicos e precos cadastrados no sistema:\n' +
      servicesBlock +
      '\n\nO nome do cliente e ' +
      clientName +
      '.'
    );
  }

  private async callGemini(body: any): Promise<Response> {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' +
      this.apiKey;

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async generateReply(
    history: { role: string; content: string }[],
    clientName: string,
    services: ServiceInfo[] = [],
  ) {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_API_KEY nao configurada; usando resposta padrao.');
      return 'Obrigada pela mensagem! Em instantes um de nossos atendentes vai te responder.';
    }

    const contents = history.map((m) => ({
      role: m.role === 'CLIENT' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const requestBody = {
      system_instruction: {
        parts: [{ text: this.buildSystemPrompt(clientName, services) }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };

    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.callGemini(requestBody);

        if (!res.ok) {
          const errText = await res.text();
          const retryable = res.status === 503 || res.status === 429;
          this.logger.error('Erro na API Gemini: ' + res.status + ' ' + errText);
          if (retryable && attempt < maxAttempts) {
            await sleep(1500);
            continue;
          }
          return 'Obrigada pela mensagem! Em instantes um de nossos atendentes vai te responder.';
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text?.trim() || 'Obrigada pela mensagem! Vou verificar isso com a equipe.';
      } catch (err) {
        this.logger.error('Falha ao chamar a API Gemini', err);
        if (attempt < maxAttempts) {
          await sleep(1500);
          continue;
        }
        return 'Obrigada pela mensagem! Em instantes um de nossos atendentes vai te responder.';
      }
    }

    return 'Obrigada pela mensagem! Em instantes um de nossos atendentes vai te responder.';
  }
}
