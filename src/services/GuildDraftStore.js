import config from '../config/index.js';

/**
 * Guarda temporariamente os dados do modal enquanto o usuario confirma a
 * criacao (o customId de um botao nao comporta todos os campos).
 * Em memoria de proposito: e um rascunho descartavel. Se o bot reiniciar,
 * o usuario apenas clica em "Criar Clã" de novo.
 */
export class GuildDraftStore {
  constructor({ ttlMinutes = config.guild.draftTtlMinutes } = {}) {
    this.ttl = ttlMinutes * 60_000;
    this.drafts = new Map();
  }

  #key(discordGuildId, userId) {
    return `${discordGuildId}:${userId}`;
  }

  save(discordGuildId, userId, draft) {
    const key = this.#key(discordGuildId, userId);
    const existing = this.drafts.get(key);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => this.drafts.delete(key), this.ttl);
    timer.unref?.();
    this.drafts.set(key, { draft, timer });
    return draft;
  }

  get(discordGuildId, userId) {
    return this.drafts.get(this.#key(discordGuildId, userId))?.draft ?? null;
  }

  /**
   * Retira o rascunho de forma atomica (get + clear no mesmo passo sincrono).
   * Quem chama primeiro leva o rascunho; um segundo clique encontra null.
   */
  take(discordGuildId, userId) {
    const draft = this.get(discordGuildId, userId);
    if (draft) this.clear(discordGuildId, userId);
    return draft;
  }

  clear(discordGuildId, userId) {
    const key = this.#key(discordGuildId, userId);
    const existing = this.drafts.get(key);
    if (existing) clearTimeout(existing.timer);
    this.drafts.delete(key);
  }
}

export const guildDraftStore = new GuildDraftStore();
export default guildDraftStore;
