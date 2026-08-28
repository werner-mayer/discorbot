import { CustomId } from '../../models/customIds.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** Confirmacao final: dispara a criacao completa do clã. */
export default {
  customId: CustomId.CONFIRM_CREATE,
  async execute(interaction, { services }) {
    const draft = services.guildDraftStore.get(interaction.guild.id, interaction.user.id);
    if (!draft) {
      return replyEphemeral(interaction, {
        embeds: [errorEmbed('Seu rascunho expirou. Clique em **Criar Clã** novamente.')],
        components: [],
      });
    }

    // A criacao envolve varias chamadas a API do Discord: defer evita timeout.
    await deferEphemeral(interaction);

    const guild = await services.guildService.createGuild(interaction.guild, interaction.user.id, draft);
    services.guildDraftStore.clear(interaction.guild.id, interaction.user.id);

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Clã ${guild.name} [${guild.tag}] criada!`,
          [
            `Cargo: <@&${guild.roleId}>`,
            `Categoria: **${interaction.guild.channels.cache.get(guild.categoryId)?.name ?? guild.categoryId}**`,
            `Texto: <#${guild.textChannelId}>`,
            `Voz: <#${guild.voiceChannelId}>`,
            '',
            'Convide membros com `/cla invite @usuario`.',
          ].join('\n'),
        ),
      ],
      components: [],
    });
  },
};
