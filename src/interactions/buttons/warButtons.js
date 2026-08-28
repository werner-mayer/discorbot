import { CustomId } from '../../models/customIds.js';
import { infoEmbed, warEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** Resposta ao desafio de guerra: so o lider do cla desafiado (ou admin). */
export const acceptWarButton = {
  customId: CustomId.WAR_ACCEPT,
  async execute(interaction, { args, services }) {
    const [warId] = args;
    await deferEphemeral(interaction);

    const war = await services.warService.loadPending(warId);
    const isAdmin = services.permissionService.isServerAdmin(interaction.member);
    services.warService.assertPodeResponder(war, interaction.user.id, isAdmin);

    const atualizada = await services.warService.accept(interaction.guild, warId, interaction.user.id);

    return replyEphemeral(interaction, {
      embeds: [warEmbed(atualizada, { titulo: '⚔️ Guerra aceita!' })],
      components: [],
    });
  },
};

export const declineWarButton = {
  customId: CustomId.WAR_DECLINE,
  async execute(interaction, { args, services }) {
    const [warId] = args;
    await deferEphemeral(interaction);

    const war = await services.warService.loadPending(warId);
    const isAdmin = services.permissionService.isServerAdmin(interaction.member);
    services.warService.assertPodeResponder(war, interaction.user.id, isAdmin);

    await services.warService.decline(interaction.guild, warId, interaction.user.id);

    return replyEphemeral(interaction, {
      embeds: [
        infoEmbed('Desafio recusado', `**${war.opponent.name}** recusou o desafio de **${war.challenger.name}**.`),
      ],
      components: [],
    });
  },
};
