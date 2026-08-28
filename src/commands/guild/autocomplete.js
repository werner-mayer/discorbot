import { WAR_STATUS_LABEL } from '../../models/WarStatus.js';
import { truncate } from '../../utils/text.js';

/**
 * Autocomplete das opcoes que apontam para um cla ou para uma guerra.
 * O Discord aceita no maximo 25 sugestoes e espera resposta em 3s, entao
 * qualquer falha aqui responde uma lista vazia em vez de estourar.
 */
export async function autocompleteGuilds(interaction, { services }) {
  const termo = interaction.options.getFocused();
  const clas = await services.guildService.searchGuilds(interaction.guild.id, termo, 25);
  return clas.map((cla) => ({
    name: truncate(`[${cla.tag}] ${cla.name} · nível ${cla.level}`, 100),
    value: cla.tag,
  }));
}

export async function autocompleteWars(interaction, { services }) {
  const termo = String(interaction.options.getFocused() ?? '').toLowerCase();
  const guerras = await services.warService.listOpen(interaction.guild.id);
  return guerras
    .filter(
      (war) =>
        !termo ||
        war.challenger.name.toLowerCase().includes(termo) ||
        war.opponent.name.toLowerCase().includes(termo),
    )
    .slice(0, 25)
    .map((war) => ({
      name: truncate(
        `${war.challenger.name} vs ${war.opponent.name} — ${WAR_STATUS_LABEL[war.status]}`,
        100,
      ),
      value: war.id,
    }));
}

/** Mapa opcao -> resolvedor, por subcomando. */
const RESOLVEDORES = {
  cla: autocompleteGuilds,
  guerra: autocompleteWars,
};

export default async function autocomplete(interaction, context) {
  const opcao = interaction.options.getFocused(true);
  const resolver = RESOLVEDORES[opcao.name];
  if (!resolver) return interaction.respond([]);

  const sugestoes = await resolver(interaction, context).catch(() => []);
  return interaction.respond(sugestoes);
}
