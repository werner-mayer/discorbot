/** Remove acentos e normaliza para comparacoes de unicidade. */
export function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Nome de canal do Discord: minusculo, sem espacos, preservando emojis. */
export function slugifyChannelName(value, fallback = 'canal') {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\p{Emoji}\-_・]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 90) || fallback;
}

export function truncate(value, max) {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
