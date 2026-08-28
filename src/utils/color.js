import { ValidationError } from './errors.js';

const HEX_PATTERN = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** Cores nomeadas aceitas como atalho no modal. */
const NAMED_COLORS = {
  vermelho: '#E74C3C',
  azul: '#3498DB',
  verde: '#2ECC71',
  amarelo: '#F1C40F',
  laranja: '#E67E22',
  roxo: '#9B59B6',
  rosa: '#E91E63',
  ciano: '#1ABC9C',
  branco: '#FFFFFF',
  preto: '#010101',
  cinza: '#95A5A6',
};

/**
 * Valida e normaliza uma cor informada pelo usuario.
 * Aceita "#FF0000", "FF0000", "#F00" e nomes em portugues.
 * @returns {string} hex normalizado em maiusculo, com "#".
 */
export function parseColor(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new ValidationError('Informe uma cor (ex.: `#FF0000`).');

  const named = NAMED_COLORS[raw.toLowerCase()];
  if (named) return named;

  const match = raw.match(HEX_PATTERN);
  if (!match) {
    throw new ValidationError(
      `Cor inválida: \`${raw}\`. Use um hexadecimal como \`#FF0000\` ou um nome (${Object.keys(NAMED_COLORS).join(', ')}).`,
    );
  }

  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');

  // #000000 e interpretado pelo Discord como "sem cor"; usamos quase-preto.
  if (hex.toUpperCase() === '000000') hex = '010101';

  return `#${hex.toUpperCase()}`;
}

export function colorToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
