import config from '../config/index.js';
import GuildRepository from '../repositories/GuildRepository.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Pontuacao, nivel e ranking dos clas.
 * O nivel e derivado dos pontos (nivel = floor(pontos / pointsPerLevel) + 1) e
 * fica guardado na coluna `level` para ordenar e exibir sem recalcular.
 */
export class GuildRankingService {
  constructor({
    guildRepository = new GuildRepository(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.guilds = guildRepository;
    this.audit = auditLogService;
    this.config = configuration;
  }

  levelFor(points) {
    const perLevel = Math.max(1, this.config.guild.pointsPerLevel);
    return Math.floor(Math.max(0, points) / perLevel) + 1;
  }

  /** Quanto falta para o proximo nivel. */
  progressFor(points) {
    const perLevel = Math.max(1, this.config.guild.pointsPerLevel);
    const current = Math.max(0, points);
    const into = current % perLevel;
    return { into, needed: perLevel, missing: perLevel - into };
  }

  /**
   * Soma (ou subtrai) pontos e reajusta o nivel.
   * @returns {{ guild: object, leveledUp: boolean, previousLevel: number }}
   */
  async addPoints(discordGuildId, guildRecord, delta, { actorId, reason = null } = {}) {
    const amount = Number(delta);
    if (!Number.isInteger(amount) || amount === 0) {
      throw new ValidationError('Informe um número inteiro de pontos diferente de zero.');
    }

    const previousLevel = guildRecord.level;
    const points = Math.max(0, guildRecord.points + amount);
    const level = this.levelFor(points);

    const updated = await this.guilds.update(guildRecord.id, { points, level });

    await this.audit.record({
      discordGuildId,
      guildId: guildRecord.id,
      action: AuditAction.POINTS_CHANGED,
      actorId,
      metadata: { delta: amount, total: points, reason },
    });

    const leveledUp = level > previousLevel;
    if (leveledUp) {
      await this.audit.record({
        discordGuildId,
        guildId: guildRecord.id,
        action: AuditAction.LEVEL_UP,
        actorId,
        metadata: { from: previousLevel, to: level },
      });
    }

    return { guild: updated, leveledUp, previousLevel };
  }

  ranking(discordGuildId, take = 10) {
    return this.guilds.listRanked(discordGuildId, take);
  }

  /** Posicao do cla no ranking do servidor (1 = primeiro). */
  async positionOf(discordGuildId, guildId) {
    const all = await this.guilds.listRanked(discordGuildId, 1000);
    const index = all.findIndex((guild) => guild.id === guildId);
    return { position: index + 1, total: all.length };
  }
}

export default GuildRankingService;
