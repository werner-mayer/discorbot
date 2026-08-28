import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import config from './config/index.js';
import { registerEvents } from './events/index.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('bootstrap');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Necessario para ler membros e aplicar cargos.
    // Ative "Server Members Intent" no portal do desenvolvedor.
    GatewayIntentBits.GuildMembers,
  ],
  // Convites chegam por DM: partials evita eventos incompletos.
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

registerEvents(client);

client.on(Events.Error, (error) => logger.error('Erro no client do Discord', error));
process.on('unhandledRejection', (reason) => logger.error('Promise rejeitada sem tratamento', reason));

async function shutdown(signal) {
  logger.info(`Recebido ${signal}, encerrando...`);
  await client.destroy().catch(() => null);
  await disconnectDatabase().catch(() => null);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  await connectDatabase();
  await client.login(config.discord.token);
}

main().catch(async (error) => {
  logger.error('Falha ao iniciar o bot', error);
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
