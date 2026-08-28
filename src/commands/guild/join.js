import { infoEmbed, successEmbed, joinRequestEmbed } from '../../utils/embeds.js';
import { joinRequestRow } from '../../interactions/components.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla join <cla> [mensagem] — entra ou pede entrada, conforme a política. */
export default async function join(interaction, { services }) {
  const termo = interaction.options.getString('cla', true);
  const mensagem = interaction.options.getString('mensagem');
  await deferEphemeral(interaction);

  const alvo = await services.joinRequestService.resolveGuild(interaction.guild.id, termo);
  const resultado = await services.joinRequestService.requestJoin(
    interaction.guild,
    alvo,
    interaction.user.id,
    mensagem,
  );

  if (resultado.tipo === 'JOINED') {
    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Bem-vindo a ${resultado.guild.name} [${resultado.guild.tag}]!`,
          `Você recebeu o cargo e já tem acesso a <#${resultado.guild.textChannelId}>.`,
        ),
      ],
    });
  }

  // Avisa a lideranca no canal do cla, com os botoes de decisao.
  const canal = await services.discordGuildService.fetchChannel(
    interaction.guild,
    alvo.textChannelId,
  );
  await canal
    ?.send({
      content: `<@${alvo.ownerId}>`,
      embeds: [joinRequestEmbed(alvo, resultado.request, interaction.user)],
      components: [joinRequestRow(resultado.request.id)],
    })
    .catch(() => null);

  return replyEphemeral(interaction, {
    embeds: [
      infoEmbed(
        'Pedido enviado',
        `A liderança de **${alvo.name}** [${alvo.tag}] foi avisada e vai decidir. Você recebe o resultado por aqui.`,
      ),
    ],
  });
}
