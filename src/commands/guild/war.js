import { warEmbed, warsListEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { warChallengeRow } from '../../interactions/components.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';
import { NotFoundError } from '../../utils/errors.js';

/** /cla war challenge <cla> [pontos] — o líder desafia outro clã. */
async function challenge(interaction, { services }) {
  const termo = interaction.options.getString('cla', true);
  const pontos = interaction.options.getInteger('pontos');
  await deferEphemeral(interaction);

  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  const adversario = await services.joinRequestService.resolveGuild(interaction.guild.id, termo);
  const war = await services.warService.declare(
    interaction.guild,
    guild,
    adversario,
    interaction.user.id,
    pontos,
  );

  // O desafio vai para o canal do cla desafiado, com os botoes de resposta.
  const canal = await services.discordGuildService.fetchChannel(
    interaction.guild,
    adversario.textChannelId,
  );
  await canal
    ?.send({
      content: `<@${adversario.ownerId}>`,
      embeds: [warEmbed(war, { titulo: `⚔️ ${guild.name} desafiou ${adversario.name}!` })],
      components: [warChallengeRow(war.id)],
    })
    .catch(() => null);

  return replyEphemeral(interaction, {
    embeds: [
      successEmbed(
        'Desafio enviado',
        `**${adversario.name}** foi desafiado. A liderança deles precisa aceitar.`,
      ),
    ],
  });
}

/** /cla war list — guerras pendentes e em andamento. */
async function list(interaction, { services }) {
  const guerras = await services.warService.listOpen(interaction.guild.id);
  return replyEphemeral(interaction, { embeds: [warsListEmbed(guerras)] });
}

/** /cla war report — um administrador registra o placar e distribui os pontos. */
async function report(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);

  const warId = interaction.options.getString('guerra', true);
  const placarA = interaction.options.getInteger('desafiante', true);
  const placarB = interaction.options.getInteger('desafiado', true);
  await deferEphemeral(interaction);

  const { war, winner, premiado } = await services.warService.report(
    interaction.guild,
    warId,
    placarA,
    placarB,
    interaction.user.id,
  );

  const extras = [];
  if (winner && war.prize) extras.push(`**${winner.name}** levou ${war.prize} pontos.`);
  if (premiado?.leveledUp) extras.push(`🎉 Subiu para o nível ${premiado.guild.level}!`);

  return replyEphemeral(interaction, {
    embeds: [warEmbed(war, { titulo: '🏁 Guerra encerrada' })],
    content: extras.join(' ') || undefined,
  });
}

/** /cla war cancel — cancela um desafio ou guerra em andamento. */
async function cancel(interaction, { services }) {
  const warId = interaction.options.getString('guerra', true);
  await deferEphemeral(interaction);

  const war = await services.warService.getById(warId);
  if (!war) throw new NotFoundError('Guerra não encontrada.');

  const isAdmin = services.permissionService.isServerAdmin(interaction.member);
  if (!isAdmin) {
    const envolvido = [war.challenger.ownerId, war.opponent.ownerId].includes(interaction.user.id);
    if (!envolvido) {
      services.permissionService.assertServerAdmin(interaction.member);
    }
  }

  await services.warService.cancel(interaction.guild, warId, interaction.user.id);
  return replyEphemeral(interaction, {
    embeds: [
      infoEmbed('Guerra cancelada', `**${war.challenger.name}** vs **${war.opponent.name}** foi cancelada.`),
    ],
  });
}

const acoes = { challenge, list, report, cancel };

export default async function war(interaction, context) {
  const acao = interaction.options.getSubcommand();
  return acoes[acao](interaction, context);
}
