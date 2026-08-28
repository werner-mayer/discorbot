import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/**
 * /guild repair — recria cargo/categoria/canais apagados manualmente e
 * reaplica cargos e permissoes. Lider da guilda ou administrador.
 */
export default async function repair(interaction, { services }) {
  await deferEphemeral(interaction);

  const isAdmin = services.permissionService.isServerAdmin(interaction.member);
  const all = interaction.options.getBoolean('todas') ?? false;

  if (all) {
    services.permissionService.assertServerAdmin(interaction.member);
    const guilds = await services.guildService.listByServer(interaction.guild.id);
    const report = [];
    for (const guildRecord of guilds) {
      const { repaired } = await services.guildService.repairGuild(interaction.guild, guildRecord, {
        actorId: interaction.user.id,
      });
      report.push(`**${guildRecord.name}** — ${repaired.length ? repaired.join(', ') : 'ok'}`);
    }
    return replyEphemeral(interaction, {
      embeds: [successEmbed('Verificação concluída', report.join('\n') || 'Nenhuma guilda cadastrada.')],
    });
  }

  const { guild } = await services.guildService.requireUserGuild(
    interaction.guild.id,
    interaction.user.id,
  );
  if (!isAdmin) services.permissionService.assertCanEditGuild(guild, interaction.member);

  const { repaired } = await services.guildService.repairGuild(interaction.guild, guild, {
    actorId: interaction.user.id,
  });

  return replyEphemeral(interaction, {
    embeds: [
      repaired.length
        ? warningEmbed('Estrutura restaurada', `Recriado: ${repaired.join(', ')}.`)
        : successEmbed('Tudo certo', `A estrutura de **${guild.name}** está íntegra. Cargo: <@&${guild.roleId}>.`),
    ],
  });
}
