import { ChannelType, SlashCommandBuilder } from 'discord.js';
import create from './create.js';
import info from './info.js';
import invite from './invite.js';
import kick from './kick.js';
import members from './members.js';
import leave from './leave.js';
import deleteGuild from './deleteGuild.js';
import transfer from './transfer.js';
import promote from './promote.js';
import demote from './demote.js';
import edit from './edit.js';
import settings from './settings.js';
import join from './join.js';
import requests from './requests.js';
import ranking from './ranking.js';
import points from './points.js';
import logs from './logs.js';
import war from './war.js';
import panel from './panel.js';
import repair from './repair.js';
import list from './list.js';
import help from './help.js';
import guide from './guide.js';
import autocomplete from './autocomplete.js';

/**
 * Comando /cla. Os handlers apenas leem opcoes e delegam aos services —
 * nenhuma regra de negocio mora aqui.
 */
const claOption = (option, descricao = 'Nome ou TAG do clã') =>
  option.setName('cla').setDescription(descricao).setAutocomplete(true).setRequired(true);

const guerraOption = (option) =>
  option.setName('guerra').setDescription('Guerra em aberto').setAutocomplete(true).setRequired(true);

export const data = new SlashCommandBuilder()
  .setName('cla')
  .setDescription('Sistema de clãs do servidor')
  .setDMPermission(false)
  // ---------------------------------------------------------------- básico
  .addSubcommand((sub) => sub.setName('help').setDescription('Como funcionam os clãs e lista de comandos'))
  .addSubcommand((sub) => sub.setName('create').setDescription('Criar um novo clã'))
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Ver informações de um clã')
      .addUserOption((option) =>
        option.setName('usuario').setDescription('Ver o clã deste usuário').setRequired(false),
      ),
  )
  .addSubcommand((sub) => sub.setName('members').setDescription('Listar os membros do seu clã'))
  .addSubcommand((sub) => sub.setName('leave').setDescription('Sair do seu clã'))
  // ---------------------------------------------------------------- entrada
  .addSubcommand((sub) =>
    sub
      .setName('join')
      .setDescription('Entrar ou pedir entrada em um clã')
      .addStringOption(claOption)
      .addStringOption((option) =>
        option.setName('mensagem').setDescription('Recado para a liderança').setMaxLength(300).setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('invite')
      .setDescription('Convidar um usuário para o seu clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será convidado').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('requests').setDescription('Ver e decidir pedidos de entrada'))
  // ------------------------------------------------------------ administração
  .addSubcommand((sub) =>
    sub
      .setName('kick')
      .setDescription('Remover um membro do seu clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será removido').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('promote')
      .setDescription('Promover um membro a oficial')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será promovido').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('demote')
      .setDescription('Rebaixar um oficial a membro')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será rebaixado').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('transfer')
      .setDescription('Transferir a liderança do clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Novo líder').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('edit').setDescription('Editar descrição, ícone, limite e cor'))
  .addSubcommand((sub) => sub.setName('settings').setDescription('Configurar quem pode entrar no clã'))
  .addSubcommand((sub) =>
    sub
      .setName('delete')
      .setDescription('Excluir um clã (líder do próprio, admin de qualquer um)')
      .addStringOption((option) =>
        option
          .setName('cla')
          .setDescription('Qual clã apagar (padrão: o seu) — admin')
          .setAutocomplete(true)
          .setRequired(false),
      ),
  )
  // ------------------------------------------------------------- progressão
  .addSubcommand((sub) =>
    sub
      .setName('ranking')
      .setDescription('Ranking de clãs por pontos')
      .addIntegerOption((option) =>
        option.setName('limite').setDescription('Quantos clãs mostrar (padrão 10)').setMinValue(1).setMaxValue(25),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('points')
      .setDescription('Dar ou tirar pontos de um clã (admin)')
      .addStringOption(claOption)
      .addIntegerOption((option) =>
        option.setName('valor').setDescription('Pontos a somar (negativo para tirar)').setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('motivo').setDescription('Por quê').setMaxLength(200).setRequired(false),
      ),
  )
  // ------------------------------------------------------------------ guerra
  .addSubcommandGroup((group) =>
    group
      .setName('war')
      .setDescription('Guerras entre clãs')
      .addSubcommand((sub) =>
        sub
          .setName('challenge')
          .setDescription('Desafiar outro clã')
          .addStringOption((option) => claOption(option, 'Clã adversário'))
          .addIntegerOption((option) =>
            option.setName('pontos').setDescription('Pontos em disputa').setMinValue(0).setMaxValue(1000),
          ),
      )
      .addSubcommand((sub) => sub.setName('list').setDescription('Guerras pendentes e em andamento'))
      .addSubcommand((sub) =>
        sub
          .setName('report')
          .setDescription('Registrar o placar de uma guerra (admin)')
          .addStringOption(guerraOption)
          .addIntegerOption((option) =>
            option.setName('desafiante').setDescription('Pontos do desafiante').setMinValue(0).setRequired(true),
          )
          .addIntegerOption((option) =>
            option.setName('desafiado').setDescription('Pontos do desafiado').setMinValue(0).setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName('cancel').setDescription('Cancelar uma guerra').addStringOption(guerraOption),
      ),
  )
  // ------------------------------------------------------------------ staff
  .addSubcommand((sub) =>
    sub
      .setName('repair')
      .setDescription('Verificar e recriar cargo/canais apagados')
      .addBooleanOption((option) =>
        option.setName('todas').setDescription('Verificar todos os clãs (admin)').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('panel')
      .setDescription('Publicar o painel de criação de clãs (admin)')
      .addChannelOption((option) =>
        option
          .setName('canal')
          .setDescription('Canal onde o painel será publicado')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('Listar todos os clãs do servidor (admin)'))
  .addSubcommand((sub) =>
    sub
      .setName('guide')
      .setDescription('Publicar o guia de comandos num canal (admin)')
      .addChannelOption((option) =>
        option
          .setName('canal')
          .setDescription('Canal onde o guia será publicado')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('logs')
      .setDescription('Histórico administrativo do sistema (admin)')
      .addIntegerOption((option) =>
        option.setName('limite').setDescription('Quantos registros (padrão 15)').setMinValue(1).setMaxValue(25),
      ),
  );

const subcommands = {
  help,
  guide,
  create,
  info,
  invite,
  kick,
  members,
  leave,
  delete: deleteGuild,
  transfer,
  promote,
  demote,
  edit,
  settings,
  join,
  requests,
  ranking,
  points,
  logs,
  repair,
  panel,
  list,
};

export async function execute(interaction, context) {
  const group = interaction.options.getSubcommandGroup(false);
  if (group === 'war') return war(interaction, context);

  const name = interaction.options.getSubcommand();
  const handler = subcommands[name];
  if (!handler) throw new Error(`Subcomando não implementado: ${name}`);
  return handler(interaction, context);
}

export { autocomplete };

export default { data, execute, autocomplete };
