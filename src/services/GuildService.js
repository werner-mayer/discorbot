import config from '../config/index.js';
import GuildRepository from '../repositories/GuildRepository.js';
import GuildMemberRepository from '../repositories/GuildMemberRepository.js';
import DiscordGuildService from './DiscordGuildService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { GuildMemberRole } from '../models/GuildMemberRole.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { normalize } from '../utils/text.js';
import { parseColor } from '../utils/color.js';
import { validateGuildName, validateGuildTag } from '../utils/validators.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GuildService');

/**
 * Regras de negocio do clã em si. Orquestra Discord + banco.
 * Handlers de comando/interacao nunca falam com repositorios diretamente.
 */
export class GuildService {
  constructor({
    guildRepository = new GuildRepository(),
    memberRepository = new GuildMemberRepository(),
    discordGuildService = new DiscordGuildService(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.guilds = guildRepository;
    this.members = memberRepository;
    this.discord = discordGuildService;
    this.audit = auditLogService;
    this.config = configuration;
  }

  // ------------------------------------------------------------- validacao

  /** Valida e normaliza a entrada crua do modal. Nao toca no Discord nem no banco. */
  validateDraft(input) {
    const name = validateGuildName(input.name);
    const tag = validateGuildTag(input.tag);
    const color = parseColor(input.color);

    const allowCustom = this.config.guild.allowCustomChannelNames;
    return {
      name,
      tag,
      color,
      nameNormalized: normalize(name),
      tagNormalized: normalize(tag),
      textChannelName:
        (allowCustom && input.textChannelName?.trim()) || this.config.guild.defaultTextChannelName,
      voiceChannelName:
        (allowCustom && input.voiceChannelName?.trim()) || this.config.guild.defaultVoiceChannelName,
    };
  }

  async assertAvailable(discordGuildId, { nameNormalized, tagNormalized, name, tag }) {
    const byName = await this.guilds.findByNormalizedName(discordGuildId, nameNormalized);
    if (byName) throw new ConflictError(`Já existe um clã chamado **${name}** neste servidor.`);

    const byTag = await this.guilds.findByNormalizedTag(discordGuildId, tagNormalized);
    if (byTag) throw new ConflictError(`A TAG **[${tag}]** já está em uso pelo clã **${byTag.name}**.`);
  }

  // --------------------------------------------------------------- leitura

  async getById(id) {
    const guild = await this.guilds.findById(id);
    if (!guild) throw new NotFoundError('Clã não encontrada.');
    return guild;
  }

  /** Clã do usuario no servidor, ou null. */
  async getUserGuild(discordGuildId, userId) {
    const membership = await this.members.findByUser(discordGuildId, userId);
    return membership ? { guild: membership.guild, membership } : null;
  }

  async requireUserGuild(discordGuildId, userId) {
    const result = await this.getUserGuild(discordGuildId, userId);
    if (!result) throw new NotFoundError('Você não faz parte de nenhum clã.');
    return result;
  }

  listByServer(discordGuildId) {
    return this.guilds.listByServer(discordGuildId);
  }

  /** Busca por nome ou TAG (autocomplete e comandos que recebem um cla). */
  searchGuilds(discordGuildId, term, take = 25) {
    return this.guilds.search(discordGuildId, term, take);
  }

  listMembers(guildId) {
    return this.members.listByGuild(guildId);
  }

  countMembers(guildId) {
    return this.guilds.countMembers(guildId);
  }

  // --------------------------------------------------------------- criacao

  /**
   * Fluxo completo de criacao (passos 1 a 12 do processo):
   * valida unicidade -> cria cargo/categoria/canais/permissoes ->
   * persiste clã + lider -> aplica o cargo ao criador.
   */
  async createGuild(discordGuild, ownerId, rawDraft) {
    const draft = this.validateDraft(rawDraft);
    const discordGuildId = discordGuild.id;

    // 1 e 2 — nome e TAG unicos no servidor.
    await this.assertAvailable(discordGuildId, draft);

    // Regra: um usuario so pode participar de um clã por vez.
    const existingMembership = await this.members.findByUser(discordGuildId, ownerId);
    if (existingMembership) {
      throw new ConflictError(
        `Você já faz parte do clã **${existingMembership.guild.name}**. Saia dela antes de criar outra (\`/cla leave\`).`,
      );
    }

    // 3 a 8 — estrutura no Discord (com rollback interno em caso de falha).
    const structure = await this.discord.createStructure(discordGuild, {
      ...draft,
      ownerId,
    });

    let guildRecord;
    try {
      // 10 e 11 — persistencia do clã + registro do lider, em uma escrita atomica.
      guildRecord = await this.guilds.create({
        discordGuildId,
        name: draft.name,
        nameNormalized: draft.nameNormalized,
        tag: draft.tag,
        tagNormalized: draft.tagNormalized,
        color: draft.color,
        ownerId,
        ...structure,
        members: {
          create: {
            discordGuildId,
            discordUserId: ownerId,
            role: GuildMemberRole.OWNER,
          },
        },
      });
    } catch (error) {
      logger.error('Falha ao persistir o clã, revertendo estrutura do Discord.', error?.message);
      await this.discord.destroyStructure(discordGuild, structure, 'Rollback: falha ao salvar no banco');
      throw new ConflictError('Não consegui salvar o clã no banco de dados. Nada foi criado.');
    }

    // 9 — o criador recebe o cargo do clã.
    await this.discord.assignRole(discordGuild, ownerId, structure.roleId, 'Criador do clã');
    await this.discord.applyTagToNickname(discordGuild, ownerId, draft.tag);

    await this.audit.record({
      discordGuildId,
      guildId: guildRecord.id,
      action: AuditAction.GUILD_CREATED,
      actorId: ownerId,
      metadata: { name: draft.name, tag: draft.tag, color: draft.color },
    });

    logger.info(`Clã criado: ${draft.name} [${draft.tag}] por ${ownerId}`);
    return guildRecord;
  }

  // -------------------------------------------------------------- manutencao

  /**
   * Reconcilia o banco com o Discord: recria o que foi apagado manualmente e
   * reaplica o cargo em quem perdeu. Chamado antes de operacoes sensiveis.
   */
  async repairGuild(discordGuild, guildRecord, { actorId = null, reassignRoles = true } = {}) {
    const { patch, repaired } = await this.discord.ensureStructure(discordGuild, guildRecord);

    let record = guildRecord;
    if (Object.keys(patch).length) {
      record = await this.guilds.update(guildRecord.id, patch);
    }

    const members = await this.members.listByGuild(record.id);
    await this.discord.syncPermissions(discordGuild, {
      categoryId: record.categoryId,
      roleId: record.roleId,
      ownerId: record.ownerId,
      officerIds: members
        .filter((member) => member.role === GuildMemberRole.OFFICER)
        .map((member) => member.discordUserId),
    });

    if (reassignRoles) {
      for (const member of members) {
        await this.discord
          .assignRole(discordGuild, member.discordUserId, record.roleId, 'Reparo do clã')
          .catch(() => null);
      }
    }

    if (repaired.length) {
      await this.audit.record({
        discordGuildId: discordGuild.id,
        guildId: record.id,
        action: AuditAction.GUILD_REPAIRED,
        actorId: actorId ?? discordGuild.client.user.id,
        metadata: { repaired },
      });
      logger.warn(`Clã ${record.name}: recriado -> ${repaired.join(', ')}`);
    }

    return { guild: record, repaired };
  }

  // --------------------------------------------------------------- exclusao

  async deleteGuild(discordGuild, guildRecord, actorId) {
    const members = await this.members.listByGuild(guildRecord.id);

    await this.discord.destroyStructure(discordGuild, guildRecord);
    for (const member of members) {
      await this.discord.clearTagFromNickname(discordGuild, member.discordUserId, guildRecord.tag);
    }

    // Membros e convites saem junto (onDelete: Cascade no schema).
    await this.guilds.delete(guildRecord.id);

    await this.audit.record({
      discordGuildId: discordGuild.id,
      action: AuditAction.GUILD_DELETED,
      actorId,
      metadata: { name: guildRecord.name, tag: guildRecord.tag, members: members.length },
    });

    logger.info(`Clã excluído: ${guildRecord.name} por ${actorId}`);
    return { removedMembers: members.length };
  }
}

export default GuildService;
