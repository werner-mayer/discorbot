import { inviteEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { inviteRow } from '../../interactions/components.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /guild invite @usuario */
export default async function invite(interaction, { services }) {
  const target = interaction.options.getUser('usuario', true);
  await deferEphemeral(interaction);

  const { guild, membership } = await services.guildService.requireUserGuild(
    interaction.guild.id,
    interaction.user.id,
  );
  services.permissionService.assertCanManageMembers(guild, membership, interaction.member);

  const { invite: inviteRecord } = await services.inviteService.createInvite(
    interaction.guild,
    guild,
    interaction.user.id,
    target.id,
  );

  const payload = {
    embeds: [inviteEmbed(guild, interaction.user.id)],
    components: [inviteRow(inviteRecord.id)],
  };

  // Preferencia por DM; se o usuario tiver DMs fechadas, cai no canal atual.
  const sentDirectly = await target.send(payload).then(() => true).catch(() => false);
  if (!sentDirectly) {
    await interaction.channel?.send({ content: `<@${target.id}>`, ...payload }).catch(() => null);
  }

  return replyEphemeral(interaction, {
    embeds: [
      sentDirectly
        ? successEmbed('Convite enviado', `<@${target.id}> recebeu o convite por mensagem direta.`)
        : warningEmbed(
            'Convite enviado no canal',
            `<@${target.id}> está com DMs fechadas, então o convite foi publicado aqui.`,
          ),
    ],
  });
}
