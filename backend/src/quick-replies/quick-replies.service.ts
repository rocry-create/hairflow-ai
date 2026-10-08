import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EXAMPLES = [
  { shortcut: 'boasvindas', title: 'Boas-vindas', category: 'Atendimento', text: 'Olá, {nome}! Seja bem-vinda. Como posso ajudar você hoje?' },
  { shortcut: 'horario', title: 'Horário de funcionamento', category: 'Atendimento', text: 'Nosso horário de atendimento é de terça a sábado, das 9h às 18h.' },
  { shortcut: 'endereco', title: 'Endereço', category: 'Atendimento', text: 'Estamos na Rua EXEMPLO, 123. Qualquer dúvida para chegar, é só me chamar.' },
  { shortcut: 'pix', title: 'Chave Pix', category: 'Pagamento', text: 'Nossa chave Pix é: SUA_CHAVE_AQUI. Assim que efetuar, me envie o comprovante, {nome}.' },
  { shortcut: 'confirmar', title: 'Confirmar horário', category: 'Agenda', text: '{nome}, seu horário está confirmado! Qualquer imprevisto, avise com antecedência.' },
  { shortcut: 'remarcar', title: 'Remarcar horário', category: 'Agenda', text: 'Claro, {nome}! Qual dia e horário ficam melhores para você?' },
];

function clean(dto: any) {
  const shortcut = String(dto?.shortcut || '').trim().toLowerCase().replace(/^\/+/, '').replace(/\s+/g, '');
  const title = String(dto?.title || '').trim();
  const text = String(dto?.text || '').trim();
  const category = String(dto?.category || 'Atendimento').trim() || 'Atendimento';
  if (!shortcut) throw new BadRequestException('Informe o atalho.');
  if (!title) throw new BadRequestException('Informe o nome.');
  if (!text) throw new BadRequestException('Informe o texto da mensagem.');
  return { shortcut, title, text, category };
}

@Injectable()
export class QuickRepliesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.quickReply.findMany({ orderBy: [{ category: 'asc' }, { title: 'asc' }] });
  }

  async create(dto: any) {
    const data = clean(dto);
    const exists = await this.prisma.quickReply.findUnique({ where: { shortcut: data.shortcut } });
    if (exists) throw new BadRequestException('Já existe uma resposta com esse atalho.');
    return this.prisma.quickReply.create({ data });
  }

  async update(id: string, dto: any) {
    const found = await this.prisma.quickReply.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Resposta não encontrada.');
    const data = clean(dto);
    const other = await this.prisma.quickReply.findUnique({ where: { shortcut: data.shortcut } });
    if (other && other.id !== id) throw new BadRequestException('Já existe uma resposta com esse atalho.');
    return this.prisma.quickReply.update({ where: { id }, data });
  }

  async remove(id: string) {
    const found = await this.prisma.quickReply.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Resposta não encontrada.');
    await this.prisma.quickReply.delete({ where: { id } });
    return { deleted: true };
  }

  async addExamples() {
    let added = 0;
    for (const e of EXAMPLES) {
      const exists = await this.prisma.quickReply.findUnique({ where: { shortcut: e.shortcut } });
      if (!exists) {
        await this.prisma.quickReply.create({ data: e });
        added++;
      }
    }
    return { added };
  }
}
