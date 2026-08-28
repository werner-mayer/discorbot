import { REST, Routes } from 'discord.js';
import config from '../config/index.js';
import { toJSON } from '../commands/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('deploy-commands');

/**
 * Registra os slash commands no servidor configurado.
 * Comandos por servidor propagam na hora (globais levam ate 1h).
 */
async function main() {
  const body = toJSON();
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  logger.info(`Registrando ${body.length} comando(s) no servidor ${config.discord.serverId}...`);
  const data = await rest.put(
    Routes.applicationGuildCommands(config.discord.clientId, config.discord.serverId),
    { body },
  );
  logger.info(`Comandos registrados: ${data.map((command) => `/${command.name}`).join(', ')}`);
}

main().catch((error) => {
  logger.error('Falha ao registrar comandos', error);
  process.exit(1);
});
