import { CustomId } from '../../models/customIds.js';
import { confirmationEmbed } from '../../utils/embeds.js';
import { clanEmojiRow, confirmationRow } from '../components.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/**
 * Monta a tela de confirmacao: previa dos nomes que serao criados, a grade
 * de emojis e os botoes. Compartilhada com o handler do select de emoji, que
 * redesenha a mesma tela quando o usuario troca a escolha.
 */
export function confirmationPayload(draft, services) {
  const discord = services.discordGuildService;
  const previa = {
    categoria: discord.categoryName(draft.name, draft.emoji),
    texto: discord.textChannelName(draft.emoji),
    voz: discord.voiceChannelName(draft.emoji),
  };

  return {
    embeds: [confirmationEmbed(draft, previa)],
    components: [clanEmojiRow(CustomId.EMOJI_CREATE, draft.emoji), confirmationRow()],
  };
}

/**
 * Recebe o modal, valida os dados e mostra a tela de confirmacao.
 * Nada e criado ainda — apenas um rascunho em memoria.
 */
export default {
  customId: CustomId.CREATE_MODAL,
  async execute(interaction, { services }) {
    const draft = services.guildService.validateDraft({
      name: interaction.fields.getTextInputValue('name'),
      tag: interaction.fields.getTextInputValue('tag'),
      color: interaction.fields.getTextInputValue('color'),
    });

    // Falha cedo se nome/TAG ja existem, antes de pedir confirmacao.
    await services.guildService.assertAvailable(interaction.guild.id, draft);
    services.guildDraftStore.save(interaction.guild.id, interaction.user.id, draft);

    return replyEphemeral(interaction, confirmationPayload(draft, services));
  },
};
