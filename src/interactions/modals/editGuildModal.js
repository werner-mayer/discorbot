import { CustomId } from '../../models/customIds.js';
import { settingsEmbed, successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** Aplica a edicao do cla (descricao, boas-vindas, icone, limite e cor). */
export default {
  customId: CustomId.EDIT_MODAL,
  async execute(interaction, { services }) {
    await deferEphemeral(interaction);

    const { guild } = await services.guildService.requireUserGuild(
      interaction.guild.id,
      interaction.user.id,
    );
    services.permissionService.assertCanEditGuild(guild, interaction.member);

    const memberCount = await services.guildService.countMembers(guild.id);
    const { guild: updated, changed } = await services.settingsService.updateProfile(
      interaction.guild,
      guild,
      {
        description: interaction.fields.getTextInputValue('description'),
        welcomeMessage: interaction.fields.getTextInputValue('welcomeMessage'),
        iconUrl: interaction.fields.getTextInputValue('iconUrl'),
        memberLimit: interaction.fields.getTextInputValue('memberLimit'),
        color: interaction.fields.getTextInputValue('color'),
      },
      { actorId: interaction.user.id, memberCount },
    );

    return replyEphemeral(interaction, {
      embeds: [
        changed.length
          ? successEmbed(`Clã atualizado`, `Campos alterados: ${changed.join(', ')}.`)
          : successEmbed('Nada mudou', 'Você não alterou nenhum campo.'),
        settingsEmbed(updated),
      ],
      components: [],
    });
  },
};
