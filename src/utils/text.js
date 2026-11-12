// Letras cirilicas/gregas indistinguiveis de letras latinas (anti-spoof).
const CONFUSABLES = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm', т: 't',
  н: 'h', в: 'b', і: 'i', ѕ: 's', ј: 'j', ԁ: 'd', ɡ: 'g',
  ο: 'o', ν: 'v', ρ: 'p', ι: 'i', κ: 'k', τ: 't', υ: 'u', χ: 'x', ε: 'e', α: 'a',
};

/**
 * Remove acentos e normaliza para comparacoes de unicidade. Letras de outros
 * alfabetos que imitam as latinas sao dobradas: "Dragоns" (о cirilico) colide
 * com "Dragons".
 */
export function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, (char) => CONFUSABLES[char] ?? char)
    .replace(/\s+/g, ' ');
}

/** true se alguma palavra mistura letras latinas com cirilicas/gregas. */
export function hasMixedScripts(value) {
  return String(value)
    .split(/[\s'._-]+/)
    .some((word) => /\p{Script=Latin}/u.test(word) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(word));
}

/** Nome de canal do Discord: minusculo, sem espacos, preservando emojis. */
export function slugifyChannelName(value, fallback = 'canal') {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    // \uFE0F (variation selector) e \u200D (ZWJ) fazem parte do emoji:
    // sem eles "⚔️" vira "⚔" e o nome criado diverge da prévia mostrada.
    .replace(/[^\p{L}\p{N}\p{Emoji}\u200D\uFE0F\-_・]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 90) || fallback;
}

export function truncate(value, max) {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
