import ready from './ready.js';
import interactionCreate from './interactionCreate.js';
import guildMemberRemove from './guildMemberRemove.js';

export const events = [ready, interactionCreate, guildMemberRemove];

/** Registra todos os eventos no client. */
export function registerEvents(client) {
  for (const event of events) {
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    else client.on(event.name, (...args) => event.execute(...args));
  }
  return client;
}

export default registerEvents;
