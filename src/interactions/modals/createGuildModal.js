import { CustomId } from '../../models/customIds.js';
import { confirmationEmbed } from '../../utils/embeds.js';
import { confirmationRow } from '../components.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/**
 * Recebe o modal, valida os dados e mostra a tela de confirmacao.
 * Nada e criado ainda — apenas um rascunho em memoria.
 */
export default {
  customId: CustomId.CREATE_MODAL,
  async execute(interaction, { services }) {
    const field = (id) => {
      try {
        return interaction.fields.getTextInputValue(id);
      } catch {
        return '';
      }
    };

    const draft = services.guildService.validateDraft({
      name: field('name'),
      tag: field('tag'),
      color: field('color'),
      textChannelName: field('textChannelName'),
      voiceChannelName: field('voiceChannelName'),
    });

    // Falha cedo se nome/TAG ja existem, antes de pedir confirmacao.
    await services.guildService.assertAvailable(interaction.guild.id, draft);

    services.guildDraftStore.save(interaction.guild.id, interaction.user.id, draft);

    return replyEphemeral(interaction, {
      embeds: [confirmationEmbed(draft)],
      components: [confirmationRow()],
    });
  },
};
