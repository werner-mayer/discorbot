import { Events } from 'discord.js';
import config from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ready');

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Bot conectado como ${client.user.tag}`);

    const discordGuild = await client.guilds.fetch(config.discord.serverId).catch(() => null);
    if (!discordGuild) {
      logger.warn(
        `O bot não está no servidor ${config.discord.serverId} (DISCORD_SERVER_ID). Convide-o antes de usar os comandos.`,
      );
      return;
    }

    if (config.discord.guildCreationChannelId) {
      const channel = await discordGuild.channels
        .fetch(config.discord.guildCreationChannelId)
        .catch(() => null);
      if (!channel) {
        logger.warn('GUILD_CREATION_CHANNEL_ID aponta para um canal inexistente.');
      }
    }

    logger.info(`Pronto para administrar clãs em "${discordGuild.name}".`);
  },
};
