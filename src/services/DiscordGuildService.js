import { ChannelType, PermissionFlagsBits } from 'discord.js';
import config from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { slugifyChannelName, truncate } from '../utils/text.js';

const logger = createLogger('DiscordGuildService');

// Sem estas duas o bot nao consegue criar nada.
const REQUIRED_BOT_PERMISSIONS = [
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
];

// Desejaveis: cada uma que faltar apenas reduz o que o bot consegue conceder
// nos canais do cla, sem impedir a criacao.
const DESIRED_PERMISSIONS = {
  'Ler Histórico de Mensagens': PermissionFlagsBits.ReadMessageHistory,
  'Conectar': PermissionFlagsBits.Connect,
  'Falar': PermissionFlagsBits.Speak,
  'Gerenciar Mensagens': PermissionFlagsBits.ManageMessages,
  'Silenciar Membros': PermissionFlagsBits.MuteMembers,
  'Mover Membros': PermissionFlagsBits.MoveMembers,
  'Ensurdecer Membros': PermissionFlagsBits.DeafenMembers,
};

/**
 * Camada que fala com a API do Discord: cargos, categorias, canais e overwrites.
 * Nao conhece o banco de dados — recebe e devolve dados simples.
 * Toda leitura de objeto (`fetch*`) devolve `null` quando o objeto foi apagado
 * manualmente no servidor, para o resto do sistema tratar isso sem quebrar.
 */
export class DiscordGuildService {
  constructor({ configuration = config } = {}) {
    this.config = configuration;
  }

  // ---------------------------------------------------------------- helpers

  assertBotCanManage(discordGuild) {
    const me = discordGuild.members.me;
    if (!me) throw new AppError('Não consegui identificar o bot neste servidor.');
    const missing = REQUIRED_BOT_PERMISSIONS.filter((flag) => !me.permissions.has(flag));
    if (missing.length) {
      throw new AppError(
        'O bot precisa das permissões **Gerenciar Cargos** e **Gerenciar Canais** para administrar clãs.',
      );
    }
  }

  async fetchRole(discordGuild, roleId) {
    if (!roleId) return null;
    return discordGuild.roles.fetch(roleId).catch(() => null);
  }

  async fetchChannel(discordGuild, channelId, expectedType = null) {
    if (!channelId) return null;
    const channel = await discordGuild.channels.fetch(channelId).catch(() => null);
    if (!channel) return null;
    if (expectedType !== null && channel.type !== expectedType) return null;
    return channel;
  }

  async fetchMember(discordGuild, userId) {
    if (!userId) return null;
    return discordGuild.members.fetch(userId).catch(() => null);
  }

  /**
   * O discord.js so aceita um overwrite cujo id resolva para um User ou Role
   * ja em cache. O dono do cla pode nao estar cacheado quando a operacao nao
   * parte de uma interacao dele (reparo automatico, tarefa de fundo), entao
   * garantimos a presenca antes de montar os overwrites.
   */
  async ensureMembersCached(discordGuild, userIds) {
    for (const userId of new Set(userIds.filter(Boolean))) {
      if (discordGuild.members.cache?.has(userId)) continue;
      await discordGuild.members.fetch(userId).catch(() => null);
    }
  }

  emojiOf(guildRecord) {
    return guildRecord?.emoji || this.config.guild.defaultEmoji;
  }

  categoryName(guildName, emoji) {
    const icone = emoji || this.config.guild.defaultEmoji;
    const rotulo = this.config.guild.categoryLabel?.trim();
    const nome = guildName.toUpperCase();
    // Sem rotulo configurado a categoria fica so "🐉 DRAGONS".
    return truncate(rotulo ? `${icone} ${rotulo} - ${nome}` : `${icone} ${nome}`, 100);
  }

  /** Canais nascem com nome automatico a partir do emoji do cla. */
  textChannelName(emoji) {
    const icone = emoji || this.config.guild.defaultEmoji;
    return slugifyChannelName(`${icone}・${this.config.guild.textChannelLabel}`, 'chat');
  }

  voiceChannelName(emoji) {
    const icone = emoji || this.config.guild.defaultEmoji;
    return `${icone}・${this.config.guild.voiceChannelLabel}`.slice(0, 100);
  }

  // ------------------------------------------------------------ overwrites

  /**
   * Monta os overwrites da categoria. Os canais herdam da categoria
   * (sao criados sincronizados), entao ha apenas um lugar de verdade.
   */
  /**
   * O Discord recusa com 50013 qualquer overwrite que conceda uma permissao que
   * o proprio bot nao possui. Filtramos os bits para o que ele pode conceder,
   * assim a criacao nunca quebra por falta de uma permissao acessoria — as
   * permissoes que faltarem sao reportadas por missingGrantablePermissions().
   */
  #grantable(discordGuild, flags) {
    const me = discordGuild.members.me;
    if (!me || me.permissions.has(PermissionFlagsBits.Administrator)) return flags;
    return flags.filter((flag) => me.permissions.has(flag));
  }

  /** Permissoes desejadas que o bot ainda nao tem (para avisar o administrador). */
  missingGrantablePermissions(discordGuild) {
    const me = discordGuild.members.me;
    if (!me || me.permissions.has(PermissionFlagsBits.Administrator)) return [];
    return Object.entries(DESIRED_PERMISSIONS)
      .filter(([, flag]) => !me.permissions.has(flag))
      .map(([name]) => name);
  }

  buildCategoryOverwrites({ discordGuild, roleId, ownerId, officerIds = [] }) {
    const botId = discordGuild.client.user.id;

    const overwrites = [
      {
        // Todo mundo VE a categoria e os canais do cla, mas nao le nada nem
        // entra na voz: o cla fica visivel como vitrine, o conteudo e fechado.
        id: discordGuild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      },
      {
        id: botId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.Connect,
        ],
      },
      {
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.UseApplicationCommands,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
        ],
      },
    ];

    // Cargos administrativos configurados continuam enxergando tudo.
    for (const adminRoleId of this.config.discord.adminRoleIds) {
      if (!discordGuild.roles.cache.has(adminRoleId)) continue;
      overwrites.push({
        id: adminRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    // Lider e oficiais moderam os proprios canais.
    const moderatorAllow = [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.DeafenMembers,
    ];
    const moderators = new Set([ownerId, ...officerIds].filter(Boolean));
    for (const userId of moderators) {
      // Quem saiu do servidor nao resolve para um membro: ignorar em vez de
      // estourar a criacao inteira do canal.
      if (!discordGuild.members.cache?.has(userId)) continue;
      overwrites.push({ id: userId, allow: moderatorAllow });
    }

    // Funde entradas repetidas (o mesmo id pode aparecer como bot e como dono)
    // e remove os bits que o bot nao tem poder para conceder.
    const merged = new Map();
    for (const overwrite of overwrites) {
      const current = merged.get(overwrite.id) ?? { id: overwrite.id, allow: [], deny: [] };
      current.allow.push(...(overwrite.allow ?? []));
      current.deny.push(...(overwrite.deny ?? []));
      merged.set(overwrite.id, current);
    }

    return [...merged.values()].map(({ id, allow, deny }) => ({
      id,
      allow: this.#grantable(discordGuild, [...new Set(allow)]),
      deny: this.#grantable(discordGuild, [...new Set(deny)]),
    }));
  }

  async syncPermissions(discordGuild, { categoryId, roleId, ownerId, officerIds = [] }) {
    const category = await this.fetchChannel(discordGuild, categoryId, ChannelType.GuildCategory);
    if (!category) return false;

    await this.ensureMembersCached(discordGuild, [ownerId, ...officerIds]);

    await category.permissionOverwrites.set(
      this.buildCategoryOverwrites({ discordGuild, roleId, ownerId, officerIds }),
      'Sincronização de permissões do clã',
    );

    // Garante que os canais filhos voltem a herdar da categoria.
    for (const child of category.children.cache.values()) {
      await child.lockPermissions().catch((error) => {
        logger.warn(`Falha ao sincronizar canal ${child.id}`, error?.message);
      });
    }
    return true;
  }

  // --------------------------------------------------------------- criacao

  createRole(discordGuild, { name, tag, color, emoji }) {
    return discordGuild.roles.create({
      name: `${emoji || this.config.guild.defaultEmoji} [${tag}] ${name}`,
      colors: { primaryColor: color },
      hoist: this.config.guild.roleHoist,
      mentionable: this.config.guild.roleMentionable,
      reason: `Cargo do clã ${name}`,
    });
  }

  async createCategory(discordGuild, { name, emoji, roleId, ownerId, officerIds = [] }) {
    await this.ensureMembersCached(discordGuild, [ownerId, ...officerIds]);
    return discordGuild.channels.create({
      name: this.categoryName(name, emoji),
      type: ChannelType.GuildCategory,
      permissionOverwrites: this.buildCategoryOverwrites({ discordGuild, roleId, ownerId, officerIds }),
      reason: `Categoria do clã ${name}`,
    });
  }

  createTextChannel(discordGuild, { categoryId, emoji }) {
    return discordGuild.channels.create({
      name: this.textChannelName(emoji),
      type: ChannelType.GuildText,
      parent: categoryId,
      reason: 'Canal de texto do clã',
    });
  }

  createVoiceChannel(discordGuild, { categoryId, emoji }) {
    return discordGuild.channels.create({
      name: this.voiceChannelName(emoji),
      type: ChannelType.GuildVoice,
      parent: categoryId,
      reason: 'Canal de voz do clã',
    });
  }

  /**
   * Cria toda a estrutura de um clã. Em caso de falha no meio do caminho,
   * desfaz o que ja tinha sido criado (rollback) para nao deixar lixo.
   */
  async createStructure(discordGuild, { name, tag, color, emoji, ownerId }) {
    this.assertBotCanManage(discordGuild);

    const created = [];
    try {
      const role = await this.createRole(discordGuild, { name, tag, color, emoji });
      created.push(role);

      const category = await this.createCategory(discordGuild, { name, emoji, roleId: role.id, ownerId });
      created.push(category);

      const textChannel = await this.createTextChannel(discordGuild, { categoryId: category.id, emoji });
      created.push(textChannel);

      const voiceChannel = await this.createVoiceChannel(discordGuild, { categoryId: category.id, emoji });
      created.push(voiceChannel);

      return {
        roleId: role.id,
        categoryId: category.id,
        textChannelId: textChannel.id,
        voiceChannelId: voiceChannel.id,
      };
    } catch (error) {
      logger.error('Falha ao criar estrutura do clã, revertendo.', error?.message);
      await this.rollback(created);
      throw new AppError(
        'Não consegui criar a estrutura do clã no Discord. Verifique as permissões do bot e tente novamente.',
      );
    }
  }

  async rollback(createdObjects) {
    for (const object of [...createdObjects].reverse()) {
      await object.delete('Rollback da criação do clã').catch(() => null);
    }
  }

  /**
   * Verifica se cargo/categoria/canais ainda existem e recria o que faltar.
   * @returns {{ patch: object, repaired: string[] }} patch = campos a atualizar no banco.
   */
  async ensureStructure(discordGuild, guildRecord) {
    this.assertBotCanManage(discordGuild);

    const patch = {};
    const repaired = [];

    let role = await this.fetchRole(discordGuild, guildRecord.roleId);
    if (!role) {
      role = await this.createRole(discordGuild, guildRecord);
      patch.roleId = role.id;
      repaired.push('cargo');
    }

    let category = await this.fetchChannel(
      discordGuild,
      guildRecord.categoryId,
      ChannelType.GuildCategory,
    );
    if (!category) {
      category = await this.createCategory(discordGuild, {
        name: guildRecord.name,
        emoji: this.emojiOf(guildRecord),
        roleId: role.id,
        ownerId: guildRecord.ownerId,
      });
      patch.categoryId = category.id;
      repaired.push('categoria');
    }

    let textChannel = await this.fetchChannel(
      discordGuild,
      guildRecord.textChannelId,
      ChannelType.GuildText,
    );
    if (!textChannel) {
      textChannel = await this.createTextChannel(discordGuild, {
        categoryId: category.id,
        emoji: this.emojiOf(guildRecord),
      });
      patch.textChannelId = textChannel.id;
      repaired.push('canal de texto');
    }

    let voiceChannel = await this.fetchChannel(
      discordGuild,
      guildRecord.voiceChannelId,
      ChannelType.GuildVoice,
    );
    if (!voiceChannel) {
      voiceChannel = await this.createVoiceChannel(discordGuild, {
        categoryId: category.id,
        emoji: this.emojiOf(guildRecord),
      });
      patch.voiceChannelId = voiceChannel.id;
      repaired.push('canal de voz');
    }

    // Canais orfaos (categoria recriada) voltam para a categoria correta.
    for (const channel of [textChannel, voiceChannel]) {
      if (channel.parentId !== category.id) {
        await channel.setParent(category.id, { lockPermissions: true }).catch(() => null);
      }
    }

    return { patch, repaired, role, category, textChannel, voiceChannel };
  }

  // -------------------------------------------------------------- membros

  async assignRole(discordGuild, userId, roleId, reason = 'Entrada no clã') {
    const member = await this.fetchMember(discordGuild, userId);
    const role = await this.fetchRole(discordGuild, roleId);
    if (!member || !role) return false;
    if (member.roles.cache.has(role.id)) return true;
    await member.roles.add(role, reason);
    return true;
  }

  async removeRole(discordGuild, userId, roleId, reason = 'Saída do clã') {
    const member = await this.fetchMember(discordGuild, userId);
    const role = await this.fetchRole(discordGuild, roleId);
    if (!member || !role) return false;
    if (!member.roles.cache.has(role.id)) return true;
    await member.roles.remove(role, reason);
    return true;
  }

  /** Opcional: prefixa o apelido com a TAG. Falhas sao ignoradas de proposito. */
  async applyTagToNickname(discordGuild, userId, tag) {
    if (!this.config.guild.applyTagToNickname) return;
    const member = await this.fetchMember(discordGuild, userId);
    if (!member || !member.manageable) return;
    const base = member.nickname ?? member.user.username;
    if (base.startsWith(`[${tag}]`)) return;
    await member.setNickname(truncate(`[${tag}] ${base}`, 32)).catch(() => null);
  }

  async clearTagFromNickname(discordGuild, userId, tag) {
    if (!this.config.guild.applyTagToNickname) return;
    const member = await this.fetchMember(discordGuild, userId);
    if (!member || !member.manageable || !member.nickname) return;
    if (!member.nickname.startsWith(`[${tag}]`)) return;
    const cleaned = member.nickname.slice(`[${tag}]`.length).trim();
    await member.setNickname(cleaned || null).catch(() => null);
  }

  // -------------------------------------------------------------- remocao

  /** Apaga cargo, canais e categoria. Objetos ja inexistentes sao ignorados. */
  async destroyStructure(discordGuild, guildRecord, reason = 'Clã excluído') {
    const results = { role: false, category: false, textChannel: false, voiceChannel: false };

    const textChannel = await this.fetchChannel(discordGuild, guildRecord.textChannelId);
    if (textChannel) results.textChannel = Boolean(await textChannel.delete(reason).catch(() => null));

    const voiceChannel = await this.fetchChannel(discordGuild, guildRecord.voiceChannelId);
    if (voiceChannel) results.voiceChannel = Boolean(await voiceChannel.delete(reason).catch(() => null));

    const category = await this.fetchChannel(discordGuild, guildRecord.categoryId);
    if (category) {
      // Canais extras criados manualmente dentro da categoria tambem saem.
      for (const child of category.children?.cache.values() ?? []) {
        await child.delete(reason).catch(() => null);
      }
      results.category = Boolean(await category.delete(reason).catch(() => null));
    }

    const role = await this.fetchRole(discordGuild, guildRecord.roleId);
    if (role) results.role = Boolean(await role.delete(reason).catch(() => null));

    return results;
  }

  /** Reflete nome, TAG, cor e emoji no cargo, na categoria e nos canais. */
  async renameStructure(discordGuild, guildRecord, { name, tag, color, emoji }) {
    const icone = emoji || this.emojiOf(guildRecord);

    const role = await this.fetchRole(discordGuild, guildRecord.roleId);
    if (role) {
      await role
        .edit({
          name: `${icone} [${tag}] ${name}`,
          colors: { primaryColor: color },
          reason: 'Atualização do clã',
        })
        .catch(() => null);
    }

    const category = await this.fetchChannel(discordGuild, guildRecord.categoryId, ChannelType.GuildCategory);
    if (category) await category.setName(this.categoryName(name, icone)).catch(() => null);

    // Os canais so acompanham quando o emoji muda: renomear a cada edicao
    // apagaria um nome que a lideranca tenha ajustado na mao.
    if (emoji && emoji !== guildRecord.emoji) {
      const texto = await this.fetchChannel(discordGuild, guildRecord.textChannelId, ChannelType.GuildText);
      if (texto) await texto.setName(this.textChannelName(icone)).catch(() => null);
      const voz = await this.fetchChannel(discordGuild, guildRecord.voiceChannelId, ChannelType.GuildVoice);
      if (voz) await voz.setName(this.voiceChannelName(icone)).catch(() => null);
    }
  }
}

export default DiscordGuildService;
