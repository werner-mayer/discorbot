/**
 * Emojis oferecidos na criacao e em /cla settings.
 * O Discord limita um select a 25 opcoes, entao a lista e curada em vez de
 * livre — escolher de uma grade tambem e mais rapido do que digitar.
 */
export const CLAN_EMOJIS = Object.freeze([
  { emoji: '⚔️', label: 'Espadas' },
  { emoji: '🛡️', label: 'Escudo' },
  { emoji: '🪓', label: 'Machado' },
  { emoji: '🏹', label: 'Arco' },
  { emoji: '🔨', label: 'Martelo' },
  { emoji: '👑', label: 'Coroa' },
  { emoji: '🐉', label: 'Dragão' },
  { emoji: '🐺', label: 'Lobo' },
  { emoji: '🦅', label: 'Águia' },
  { emoji: '🐻', label: 'Urso' },
  { emoji: '🦌', label: 'Alce' },
  { emoji: '🐗', label: 'Javali' },
  { emoji: '🦂', label: 'Escorpião' },
  { emoji: '🐍', label: 'Serpente' },
  { emoji: '💀', label: 'Caveira' },
  { emoji: '☠️', label: 'Caveira pirata' },
  { emoji: '🔥', label: 'Fogo' },
  { emoji: '❄️', label: 'Gelo' },
  { emoji: '⚡', label: 'Raio' },
  { emoji: '🌊', label: 'Onda' },
  { emoji: '🌑', label: 'Lua negra' },
  { emoji: '⭐', label: 'Estrela' },
  { emoji: '🏰', label: 'Castelo' },
  { emoji: '⛏️', label: 'Picareta' },
]);

export const DEFAULT_CLAN_EMOJI = '⚔️';

export function isValidClanEmoji(value) {
  return CLAN_EMOJIS.some((item) => item.emoji === value);
}
