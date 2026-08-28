import guildCommand from './guild/index.js';

/** Registro de comandos slash. Novos comandos entram nesta lista. */
export const commands = [guildCommand];

export const commandRegistry = new Map(commands.map((command) => [command.data.name, command]));

export function resolveCommand(name) {
  return commandRegistry.get(name) ?? null;
}

export function toJSON() {
  return commands.map((command) => command.data.toJSON());
}
