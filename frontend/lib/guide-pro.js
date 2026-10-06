export const proGuide = {
  intro:
    'Este guia mostra como usar a Minha área. Use o índice para ir direto ao assunto. Cada assunto tem um título, então com o leitor de tela você pode pular de título em título.',
  sections: [
    {
      id: 'entrar',
      h: 'Entrar e usar no celular',
      blocks: [
        { p: 'Entre com o e-mail e a senha que a administradora passou para você. Você cai direto na Minha área.' },
        { p: 'No celular, toque no botão Abrir menu, no alto da tela. Para instalar como aplicativo, no Android use Instalar aplicativo no menu do Chrome. No iPhone, use Compartilhar e Adicionar à Tela de Início, no Safari.' },
      ],
    },
    {
      id: 'concluir',
      h: 'Concluir atendimentos',
      blocks: [
        { p: 'A seção Atendimentos para concluir mostra os atendimentos que já aconteceram e ainda não foram marcados, dos últimos 30 dias.' },
        {
          ol: [
            'Ache o atendimento da cliente.',
            'Ative Concluir quando o atendimento foi feito, ou Cliente faltou quando ela não veio.',
            'O leitor de tela avisa que o atendimento foi marcado.',
          ],
        },
        { note: 'É o Concluir que conta a sua comissão. Não dá para concluir um atendimento que ainda vai acontecer.' },
      ],
    },
    {
      id: 'proximos',
      h: 'Próximos atendimentos',
      blocks: [
        { p: 'A tabela mostra o dia e a hora, a cliente, o serviço e a situação, que pode ser Agendado ou Confirmado. Em cada linha tem o botão Ficha capilar.' },
      ],
    },
    {
      id: 'ficha',
      h: 'Ficha capilar',
      blocks: [
        {
          ol: [
            'Ative Ficha capilar na linha da cliente.',
            'Preencha tipo de cabelo, histórico de química, data da última química, produtos usados e fórmula de cor.',
            'Ative Salvar ficha. Você volta para a Minha área.',
          ],
        },
        { p: 'Você só abre a ficha de clientes que atendeu ou vai atender.' },
      ],
    },
    {
      id: 'comissoes',
      h: 'Minhas comissões',
      blocks: [
        { p: 'Escolha o mês. O sistema diz quantos atendimentos foram concluídos, o total atendido e a sua comissão, com a porcentagem. A tabela abaixo lista cada atendimento. Só contam os atendimentos marcados como Concluído.' },
      ],
    },
    {
      id: 'ajuda',
      h: 'Problemas comuns',
      blocks: [
        {
          ul: [
            'Não aparece um atendimento: peça para a administradora conferir se ele foi marcado no seu nome.',
            'A comissão parece errada: a porcentagem é definida pela administradora.',
            'Esqueceu a senha: peça para a administradora criar uma nova em Acessos da equipe.',
          ],
        },
      ],
    },
  ],
};
