import { CustomId } from '../../models/customIds.js';
import { infoEmbed, successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/**
 * Botoes de um pedido de entrada. Quem clica precisa ser lider, oficial ou
 * admin do cla em questao — a checagem e feita contra o cla do pedido, nao
 * contra o cla de quem clicou.
 */
async function assertPodeDecidir(interaction, services, guildRecord) {
  const membership = await services.guildService
    .getUserGuild(interaction.guild.id, interaction.user.id)
    .then((resultado) => (resultado?.guild.id === guildRecord.id ? resultado.membership : null));
  services.permissionService.assertCanManageMembers(guildRecord, membership, interaction.member);
}

export const approveJoinButton = {
  customId: CustomId.JOIN_APPROVE,
  async execute(interaction, { args, services }) {
    const [requestId] = args;
    await deferEphemeral(interaction);

    const request = await services.joinRequestService.loadPending(requestId);
    await assertPodeDecidir(interaction, services, request.guild);

    const { guild } = await services.joinRequestService.approve(
      interaction.guild,
      requestId,
      interaction.user.id,
    );

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          'Pedido aprovado',
          `<@${request.discordUserId}> entrou em **${guild.name}** e já recebeu o cargo.`,
        ),
      ],
      components: [],
    });
  },
};

export const rejectJoinButton = {
  customId: CustomId.JOIN_REJECT,
  async execute(interaction, { args, services }) {
    const [requestId] = args;
    await deferEphemeral(interaction);

    const request = await services.joinRequestService.loadPending(requestId);
    await assertPodeDecidir(interaction, services, request.guild);
    await services.joinRequestService.reject(interaction.guild, requestId, interaction.user.id);

    return replyEphemeral(interaction, {
      embeds: [
        infoEmbed('Pedido recusado', `O pedido de <@${request.discordUserId}> foi recusado.`),
      ],
      components: [],
    });
  },
};
