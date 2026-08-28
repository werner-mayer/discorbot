import { ChannelType, SlashCommandBuilder } from 'discord.js';
import create from './create.js';
import info from './info.js';
import invite from './invite.js';
import kick from './kick.js';
import members from './members.js';
import leave from './leave.js';
import deleteGuild from './deleteGuild.js';
import transfer from './transfer.js';
import panel from './panel.js';
import repair from './repair.js';
import list from './list.js';

/**
 * Comando /guild. Os handlers apenas leem opcoes e delegam aos services —
 * nenhuma regra de negocio mora aqui.
 */
export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('Sistema de guildas do servidor')
  .setDMPermission(false)
  .addSubcommand((sub) => sub.setName('create').setDescription('Criar uma nova guilda'))
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Ver informações de uma guilda')
      .addUserOption((option) =>
        option.setName('usuario').setDescription('Ver a guilda deste usuário').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('invite')
      .setDescription('Convidar um usuário para a sua guilda')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será convidado').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('kick')
      .setDescription('Remover um membro da sua guilda')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será removido').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('members').setDescription('Listar os membros da sua guilda'))
  .addSubcommand((sub) => sub.setName('leave').setDescription('Sair da sua guilda'))
  .addSubcommand((sub) => sub.setName('delete').setDescription('Excluir a sua guilda (líder ou admin)'))
  .addSubcommand((sub) =>
    sub
      .setName('transfer')
      .setDescription('Transferir a liderança da guilda')
      .addUserOption((option) => option.setName('usuario').setDescription('Novo líder').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('repair')
      .setDescription('Verificar e recriar cargo/canais apagados')
      .addBooleanOption((option) =>
        option.setName('todas').setDescription('Verificar todas as guildas (admin)').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('panel')
      .setDescription('Publicar o painel de criação de guildas (admin)')
      .addChannelOption((option) =>
        option
          .setName('canal')
          .setDescription('Canal onde o painel será publicado')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('Listar todas as guildas do servidor (admin)'));

const subcommands = {
  create,
  info,
  invite,
  kick,
  members,
  leave,
  delete: deleteGuild,
  transfer,
  repair,
  panel,
  list,
};

export async function execute(interaction, context) {
  const name = interaction.options.getSubcommand();
  const handler = subcommands[name];
  if (!handler) throw new Error(`Subcomando não implementado: ${name}`);
  return handler(interaction, context);
}

export default { data, execute };
