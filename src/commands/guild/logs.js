import { auditLogEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla logs — histórico administrativo (somente administradores). */
export default async function logs(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);
  await deferEphemeral(interaction);

  const limite = interaction.options.getInteger('limite') ?? 15;
  const registros = await services.auditLogService.list(interaction.guild.id, limite);
  const clas = await services.guildService.listByServer(interaction.guild.id);
  const nomes = new Map(clas.map((cla) => [cla.id, cla.name]));

  return replyEphemeral(interaction, {
    embeds: [auditLogEmbed(registros, { resolveGuildName: (id) => nomes.get(id) })],
  });
}
