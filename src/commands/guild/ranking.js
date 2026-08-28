import config from '../../config/index.js';
import { rankingEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla ranking — clãs ordenados por pontos. */
export default async function ranking(interaction, { services }) {
  const limite = interaction.options.getInteger('limite') ?? 10;
  const clas = await services.rankingService.ranking(interaction.guild.id, limite);

  return replyEphemeral(interaction, {
    embeds: [rankingEmbed(clas, { pointsPerLevel: config.guild.pointsPerLevel })],
  });
}
