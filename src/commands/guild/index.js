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
  .setName('cla')
  .setDescription('Sistema de clãs do servidor')
  .setDMPermission(false)
  .addSubcommand((sub) => sub.setName('create').setDescription('Criar um novo clã'))
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Ver informações de um clã')
      .addUserOption((option) =>
        option.setName('usuario').setDescription('Ver o clã deste usuário').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('invite')
      .setDescription('Convidar um usuário para o seu clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será convidado').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('kick')
      .setDescription('Remover um membro do seu clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Quem será removido').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('members').setDescription('Listar os membros do seu clã'))
  .addSubcommand((sub) => sub.setName('leave').setDescription('Sair do seu clã'))
  .addSubcommand((sub) => sub.setName('delete').setDescription('Excluir o seu clã (líder ou admin)'))
  .addSubcommand((sub) =>
    sub
      .setName('transfer')
      .setDescription('Transferir a liderança do clã')
      .addUserOption((option) => option.setName('usuario').setDescription('Novo líder').setRequired(true)),
  )
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
  .addSubcommand((sub) => sub.setName('list').setDescription('Listar todos os clãs do servidor (admin)'));

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
