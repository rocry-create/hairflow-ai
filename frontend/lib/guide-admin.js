export const adminGuide = {
  intro:
    'Este guia explica, passo a passo, como usar cada parte do HairFlow AI. Use o índice para ir direto ao assunto. Cada assunto tem um título, então com o leitor de tela você pode pular de título em título.',
  sections: [
    {
      id: 'rotina',
      h: 'Rotina sugerida do dia',
      blocks: [
        {
          ol: [
            'De manhã, abra o Funil e veja os cartões novos. Responda quem a IA passou para a equipe.',
            'Em Conversas IA, confira se o WhatsApp do salão está conectado.',
            'Durante o dia, quando um atendimento terminar, marque como Concluído na Agenda.',
            'No fim do dia, olhe o Dashboard para ver faturamento, agendamentos e faltas.',
            'Uma vez por semana, abra Relatórios IA e gere o resumo da IA. Se houver clientes que não voltam, faça uma campanha.',
          ],
        },
        {
          note: 'Marcar Concluído é o passo mais importante. É isso que alimenta o financeiro, as comissões, os relatórios, o funil e o aviso de manutenção do mega hair.',
        },
      ],
    },
    {
      id: 'primeiros-passos',
      h: 'Primeiros passos e menu',
      blocks: [
        { p: 'Para entrar, abra o endereço do sistema no navegador e digite seu e-mail e sua senha. O menu lateral tem estas áreas:' },
        {
          ul: [
            'Dashboard: visão geral do mês, com números e gráficos.',
            'Conversas IA: as conversas do WhatsApp e a conexão do número.',
            'Funil: o caminho de cada cliente, de contato novo até pós-venda.',
            'Clientes: cadastro das clientes e ficha capilar.',
            'Agenda: os horários marcados.',
            'Serviços: o que o salão faz, com preço e duração.',
            'Profissionais: quem atende, com comissão.',
            'Acessos da equipe: e-mail e senha de cada profissional.',
            'Financeiro: faturamento, comissões e lucro por período.',
            'Relatórios IA: números do atendimento e resumo escrito pela IA.',
            'Campanhas: mensagens em massa para clientes.',
            'Guia de uso: esta página.',
          ],
        },
        { h3: 'No celular' },
        { p: 'Toque no botão Abrir menu, no alto da tela, para ver as áreas. Para fechar, toque fora do menu ou aperte a tecla Esc.' },
        { h3: 'Instalar como aplicativo' },
        {
          ul: [
            'No Android, no Chrome: abra o menu do navegador e escolha Instalar aplicativo.',
            'No iPhone, no Safari: toque em Compartilhar e escolha Adicionar à Tela de Início.',
          ],
        },
        { p: 'Aparece um ícone verde com um H branco na tela inicial.' },
      ],
    },
    {
      id: 'cadastros',
      h: 'Antes de começar: serviços e profissionais',
      blocks: [
        { p: 'A IA e a Agenda dependem destes dois cadastros. Preencha com cuidado.' },
        { h3: 'Serviços' },
        {
          ul: [
            'Preencha nome, duração em minutos e preço. Para preço em faixa, preencha também o preço máximo.',
            'Marque Exige avaliação quando o valor só puder ser definido numa avaliação, como no mega hair. A IA nunca dá preço fechado desses serviços: ela informa só o a partir de ou a faixa.',
            'Marque Mega hair nos serviços de mega hair. Eles só podem ser feitos por mega hairistas.',
            'Quando você muda um preço, a IA já usa o valor novo na próxima mensagem.',
          ],
        },
        {
          note: 'Para serviços que exigem avaliação, cadastre também um serviço de avaliação, com a palavra Avaliação no nome, por exemplo Avaliação Mega Hair. Nele, marque Mega hair se for do mega hair, mas não marque Exige avaliação. Sem ele, a IA não consegue marcar e passa o pedido para a equipe.',
        },
        { h3: 'Profissionais' },
        {
          ul: [
            'Preencha nome, telefone, comissão em porcentagem e se é mega hairista.',
            'O sistema não deixa marcar mega hair com quem não é mega hairista.',
            'Remover uma profissional só tira o nome da lista. O histórico dela continua nos relatórios.',
            'Quando a IA marca um horário, ela escolhe a primeira profissional livre, na ordem em que foram cadastradas.',
          ],
        },
      ],
    },
    {
      id: 'conversas',
      h: 'Conversas IA (WhatsApp)',
      blocks: [
        { p: 'Aqui ficam todas as conversas do número de WhatsApp do salão. A IA responde sozinha, usando os serviços e preços cadastrados. Ela não responde mensagens de grupos.' },
        {
          ul: [
            'Escolha uma conversa para ler as mensagens.',
            'Cada conversa tem uma chave para ligar ou desligar a IA. Desligue quando a equipe quiser assumir a conversa e ligue de novo depois.',
            'Você pode escrever uma resposta como equipe, e ela é enviada pelo WhatsApp.',
            'Também dá para mudar a etapa do funil e excluir uma conversa.',
          ],
        },
        { h3: 'Quando a IA não souber' },
        { p: 'Se o pedido foge do que ela sabe fazer, a IA diz que a equipe vai ajudar. Nesses casos, entre na conversa e responda.' },
        { h3: 'Conexão do número' },
        { p: 'Se o WhatsApp do salão cair, a IA para de responder. Nesta tela, conecte de novo lendo o QR Code com o WhatsApp do salão.' },
      ],
    },
    {
      id: 'ia-agenda',
      h: 'A IA marcando horários',
      blocks: [
        { p: 'A cliente escreve o serviço, o dia e a hora que quer. A IA confere a agenda, escolhe uma profissional livre e confirma na própria conversa. O horário aparece na Agenda.' },
        {
          ul: [
            'Se o horário estiver ocupado, a IA oferece até 3 opções perto dele.',
            'O salão atende de segunda a sábado, das 9h às 19h. A IA não marca com menos de 1 hora de antecedência nem com mais de 60 dias.',
            'Para serviços com avaliação, a IA marca a avaliação, e não o serviço final.',
            'Mega hair só é marcado com mega hairistas.',
            'Quando a IA marca uma avaliação, o cartão da cliente vai para Avaliação marcada no Funil.',
          ],
        },
        { note: 'Os horários de funcionamento ficam dentro do sistema. Para mudar, fale com quem cuida do sistema.' },
      ],
    },
    {
      id: 'funil',
      h: 'Funil',
      blocks: [
        { p: 'O Funil mostra o caminho de cada cliente em colunas: Novos contatos, Pediu orçamento, Avaliação marcada, Compareceu, Fechou serviço e Pós-venda. Cada coluna mostra quantos cartões tem.' },
        { h3: 'Criar um cartão' },
        {
          ol: [
            'Ative Novo cartão.',
            'Escreva o nome e o WhatsApp com DDD, só números.',
            'Escolha o serviço que ela quer e a etapa.',
            'Ative Criar cartão. A cliente é cadastrada junto, sem precisar ir em Clientes.',
          ],
        },
        { h3: 'Em cada cartão' },
        {
          ul: [
            'Serviço: troque o serviço direto no cartão.',
            'Mover para: escolha a etapa.',
            'Agendar: marca o horário.',
          ],
        },
        { h3: 'Agendar direto do funil' },
        {
          ol: [
            'Ative Agendar no cartão.',
            'Confira o serviço e a profissional. Para mega hair, só aparecem mega hairistas.',
            'Escolha o dia e o horário.',
            'Ative Marcar na Agenda.',
          ],
        },
        { p: 'Depois da avaliação, quando o cartão estiver em Compareceu, o serviço final que a cliente quer já vem escolhido no Agendar.' },
        { h3: 'O que muda sozinho' },
        {
          ul: [
            'Cliente nova que escreve no WhatsApp entra em Novos contatos.',
            'Avaliação marcada, pela IA ou pelo Agendar: o cartão vai para Avaliação marcada.',
            'Serviço final marcado pelo Agendar: vai para Fechou serviço.',
            'Avaliação marcada como Concluída na Agenda: vai para Compareceu.',
            'Serviço final marcado como Concluído: vai para Pós-venda.',
            'Cada atendimento move o cartão uma vez. Se você mover na mão depois, o sistema respeita.',
          ],
        },
        { note: 'A mudança por Concluído acontece quando o Funil é aberto. O Funil mostra as clientes que já têm conversa ou cartão.' },
      ],
    },
    {
      id: 'clientes',
      h: 'Clientes e ficha capilar',
      blocks: [
        {
          ul: [
            'Novo cliente: nome, telefone do WhatsApp e Instagram. Escreva o telefone com 55, o DDD e o número, sem espaços. Exemplo: 5517999998888.',
            'Busque por nome ou telefone.',
            'Remover apaga também as conversas, os agendamentos e a ficha da cliente. Não dá para desfazer.',
          ],
        },
        { h3: 'Ficha capilar' },
        {
          ol: [
            'Na lista de Clientes, ative Ficha capilar na linha da cliente.',
            'Preencha tipo de cabelo, histórico de química, data da última química, produtos usados e fórmula de cor.',
            'Ative Salvar ficha. Você volta para a lista de Clientes.',
          ],
        },
        { p: 'As profissionais abrem e editam a ficha das clientes delas pela Minha área.' },
      ],
    },
    {
      id: 'agenda',
      h: 'Agenda',
      blocks: [
        { p: 'A Agenda lista os horários marcados, com data, cliente, profissional, serviço e situação.' },
        {
          ol: [
            'Para marcar na mão, ative Novo agendamento.',
            'Escolha cliente, profissional, serviço, dia e horário.',
            'Salve. O sistema não deixa dois horários da mesma profissional se cruzarem e não deixa mega hair com quem não é mega hairista.',
          ],
        },
        { p: 'Em cada linha, o menu Ação muda a situação do atendimento, por exemplo para Concluído ou Faltou.' },
        {
          note: 'Marcar como Concluído é o passo mais importante. É isso que conta o faturamento, as comissões, os relatórios, o aviso de manutenção do mega hair e a mudança automática do funil. Atendimento que ficar sem marcar não entra nessas contas.',
        },
      ],
    },
    {
      id: 'lembretes',
      h: 'Lembretes de confirmação',
      blocks: [
        { p: 'O sistema avisa a cliente sozinho, quando falta até um dia para o horário.' },
        {
          ul: [
            'A mensagem diz o serviço, o dia, a hora e a profissional, e pede para a cliente responder SIM.',
            'Só sai entre 8h e 20h, e só para horários marcados há mais de 4 horas. Cada horário recebe um lembrete só.',
            'Se a cliente responder sim, confirmo, ok ou algo parecido, a situação na Agenda muda para Confirmado.',
            'Se ela disser que não pode, ou pedir para remarcar ou cancelar, a IA avisa que a equipe vai ajudar, desliga a IA naquela conversa e anota no horário. A equipe precisa assumir a conversa.',
            'Depois de remarcar, lembre de ligar a IA de novo na conversa.',
          ],
        },
      ],
    },
    {
      id: 'manutencao',
      h: 'Aviso de manutenção do mega hair',
      blocks: [
        {
          ul: [
            'Quando passam 45 dias de um mega hair concluído, o sistema pergunta se a cliente quer marcar a manutenção. Só conta o serviço de mega hair, não a avaliação.',
            'Vai até 120 dias depois do serviço, com no máximo 15 avisos por dia, entre 9h e 19h, e pausa entre as mensagens.',
            'Não avisa quem já tem mega hair marcado.',
            'Quando a cliente responde com dia e hora, a IA marca a manutenção.',
          ],
        },
        { note: 'O aviso só funciona se o mega hair tiver sido marcado como Concluído na Agenda.' },
      ],
    },
    {
      id: 'campanhas',
      h: 'Campanhas',
      blocks: [
        { p: 'Campanhas mandam a mesma mensagem, com o nome da cliente, para um grupo de clientes.' },
        {
          ol: [
            'Escreva um nome para a campanha.',
            'Escolha quem recebe: clientes inativas, mega hair na hora da manutenção, ou todas as clientes.',
            'Nos dois primeiros, informe a quantidade de dias.',
            'Veja quantas clientes vão receber.',
            'Ajuste a mensagem. Escreva {nome} onde quiser o primeiro nome da cliente.',
            'Ative Enviar teste para mim, com o seu WhatsApp, e confira a mensagem.',
            'Ative Iniciar campanha e confirme.',
          ],
        },
        { h3: 'Como o envio funciona' },
        {
          ul: [
            'As mensagens saem uma por vez, com pausa de 20 a 45 segundos, para proteger o número.',
            'O limite é de 150 clientes por campanha.',
            'Você acompanha o progresso e pode Pausar, Continuar ou Cancelar.',
            'Se 3 envios seguidos falharem, a campanha pausa sozinha. Confira a conexão do WhatsApp e ative Continuar.',
            'A campanha não começa se o WhatsApp estiver desconectado.',
            'Cada mensagem fica registrada na conversa da cliente, e a IA responde quando ela responder.',
            'Clientes inativas são as que têm atendimento concluído há mais de X dias.',
          ],
        },
        { note: 'Comece com grupos pequenos. Mandar muitas mensagens iguais de uma vez pode levar o WhatsApp a bloquear o número do salão.' },
      ],
    },
    {
      id: 'financeiro',
      h: 'Dashboard, Financeiro e Relatórios IA',
      blocks: [
        { h3: 'Dashboard' },
        { p: 'Mostra o faturamento do mês, o ticket médio, os agendamentos, a taxa de falta, gráficos e as tabelas de serviços e profissionais que mais faturam.' },
        { h3: 'Financeiro' },
        { p: 'Escolha o período em De e Até. Mostra faturamento, comissões a pagar por profissional, lucro líquido estimado, ticket médio e faturamento por serviço.' },
        { h3: 'Relatórios IA' },
        {
          ul: [
            'Escolha o período e ative Atualizar relatório.',
            'Veja o atendimento pelo WhatsApp, os agendamentos, a agenda, o dinheiro, os serviços, as profissionais e as clientes que não voltam.',
            'Ative Gerar resumo da IA para ler um texto curto com o que vai bem e o que merece atenção.',
          ],
        },
        { note: 'Os valores em dinheiro contam só atendimentos marcados como Concluído. Para escrever o resumo, a IA recebe apenas números somados, sem nomes de clientes.' },
      ],
    },
    {
      id: 'equipe',
      h: 'Acessos da equipe e Minha área',
      blocks: [
        {
          ol: [
            'Em Acessos da equipe, ative Criar acesso na linha da profissional.',
            'Escreva o e-mail, em letras minúsculas, e uma senha com pelo menos 8 caracteres.',
            'Ative Salvar acesso e passe o e-mail e a senha para ela.',
            'Para trocar, use o mesmo botão, que passa a se chamar Trocar e-mail ou senha.',
          ],
        },
        { p: 'A profissional entra no mesmo endereço e vê só a Minha área. Ela não vê financeiro, campanhas nem os dados das outras profissionais. Na Minha área ela pode:' },
        {
          ul: [
            'Concluir um atendimento que já aconteceu, ou marcar que a cliente faltou.',
            'Ver os próximos atendimentos dela.',
            'Ver quanto tem de comissão no mês.',
            'Abrir e editar a ficha capilar das clientes que atendeu ou vai atender.',
          ],
        },
      ],
    },
    {
      id: 'acessibilidade',
      h: 'Uso com leitor de tela',
      blocks: [
        {
          ul: [
            'Cada assunto tem um título. Pule de título em título para andar mais rápido.',
            'Os campos dos formulários têm nome, e o leitor anuncia o nome ao entrar no campo.',
            'Na maioria das telas, os avisos de sucesso e de erro são lidos sozinhos.',
            'Cada gráfico tem uma lista com nome, valor e porcentagem. As tabelas trazem os mesmos números.',
            'No Funil, o menu Mover para troca a etapa sem precisar arrastar.',
            'O nome da página é anunciado quando você entra nela.',
          ],
        },
      ],
    },
    {
      id: 'problemas',
      h: 'Problemas comuns',
      blocks: [
        { h3: 'A IA não responde' },
        {
          ul: [
            'Em Conversas IA, confira se o WhatsApp do salão está conectado.',
            'Abra a conversa e veja se a IA está ligada nela.',
            'A IA não responde mensagens de grupos.',
            'Se a IA do Google estiver muito ocupada, ela manda uma resposta padrão dizendo que a equipe responde em instantes.',
          ],
        },
        { h3: 'A IA não consegue marcar horário' },
        {
          ul: [
            'Confira se o serviço e uma profissional estão cadastrados.',
            'Para serviços com avaliação, confira se existe um serviço com Avaliação no nome.',
            'Para mega hair, confira se há uma mega hairista cadastrada.',
            'A IA só marca de segunda a sábado, das 9h às 19h.',
          ],
        },
        { h3: 'Não chegou lembrete ou aviso de manutenção' },
        {
          ul: [
            'O lembrete só sai para horários na situação Agendado, entre 8h e 20h.',
            'O aviso de manutenção só sai se o mega hair estiver Concluído na Agenda há mais de 45 dias.',
          ],
        },
        { h3: 'A tela está antiga depois de uma atualização' },
        { p: 'Feche e abra o navegador, ou aperte as teclas Ctrl e F5 juntas.' },
        { h3: 'Trocar a senha da administradora' },
        { p: 'Fale com quem cuida do sistema.' },
      ],
    },
  ],
};
