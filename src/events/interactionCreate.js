import { Events } from 'discord.js';
import services from '../services/index.js';
import { resolveCommand } from '../commands/index.js';
import { resolveInteractionHandler } from '../interactions/router.js';
import { AppError } from '../utils/errors.js';
import { errorEmbed } from '../utils/embeds.js';
import { replyEphemeral } from '../utils/interactionReply.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('interaction');

/**
 * Porta de entrada de todas as interacoes: comandos, botoes e modais.
 * Centraliza o tratamento de erro para que nenhuma falha fique sem resposta.
 */
export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const context = { services };

    try {
      if (interaction.isChatInputCommand()) {
        const command = resolveCommand(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, context);
        return;
      }

      if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
        const resolved = resolveInteractionHandler(interaction.customId);
        if (!resolved) return;
        await resolved.handler.execute(interaction, { ...context, args: resolved.args });
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },
};

async function handleError(interaction, error) {
  const isExpected = error instanceof AppError;

  if (isExpected) {
    logger.warn(`${error.code}: ${error.message}`);
  } else {
    logger.error('Erro inesperado ao processar interação', error);
  }

  const embed = errorEmbed(
    isExpected
      ? error.message
      : 'Ocorreu um erro inesperado. Tente novamente — se persistir, avise um administrador.',
  );

  // Interacoes de modal ainda nao respondidas nao aceitam editReply.
  await replyEphemeral(interaction, { embeds: [embed], components: [] }).catch(() => null);
}
