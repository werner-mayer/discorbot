import config from '../config/index.js';
import GuildWarRepository from '../repositories/GuildWarRepository.js';
import GuildRepository from '../repositories/GuildRepository.js';
import GuildRankingService from './GuildRankingService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { WarStatus } from '../models/WarStatus.js';
import { ConflictError, NotFoundError, PermissionError, ValidationError } from '../utils/errors.js';

/**
 * Guerras entre clas.
 *
 * Fluxo: um lider desafia -> o lider adversario aceita ou recusa -> a guerra
 * fica ATIVA -> um administrador do servidor reporta o placar. O vencedor leva
 * os pontos em disputa. Quem reporta e a organizacao, nao os envolvidos, para
 * o resultado nao virar discussao entre os dois clas.
 */
export class GuildWarService {
  constructor({
    warRepository = new GuildWarRepository(),
    guildRepository = new GuildRepository(),
    rankingService = new GuildRankingService(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.wars = warRepository;
    this.guilds = guildRepository;
    this.ranking = rankingService;
    this.audit = auditLogService;
    this.config = configuration;
  }

  async declare(discordGuild, challenger, opponent, actorId, prize = null) {
    if (challenger.id === opponent.id) {
      throw new ValidationError('Um clã não pode declarar guerra contra si mesmo.');
    }

    const existing = await this.wars.findBetween(challenger.id, opponent.id);
    if (existing) {
      throw new ConflictError(
        existing.status === WarStatus.ACTIVE
          ? `**${challenger.name}** e **${opponent.name}** já estão em guerra.`
          : `Já existe um desafio pendente entre **${challenger.name}** e **${opponent.name}**.`,
      );
    }

    const valor = prize === null || prize === undefined ? this.config.guild.warPrize : Number(prize);
    if (!Number.isInteger(valor) || valor < 0) {
      throw new ValidationError('Os pontos em disputa devem ser um número inteiro não negativo.');
    }

    const war = await this.wars.create({
      discordGuildId: discordGuild.id,
      challengerId: challenger.id,
      opponentId: opponent.id,
      prize: valor,
      createdBy: actorId,
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: challenger.id,
      action: AuditAction.WAR_DECLARED,
      actorId,
      metadata: { adversario: opponent.name, pontos: valor },
    });

    return war;
  }

  async loadPending(warId) {
    const war = await this.wars.findById(warId);
    if (!war) throw new NotFoundError('Guerra não encontrada.');
    if (war.status !== WarStatus.PENDING) {
      throw new ConflictError('Esse desafio já foi respondido.');
    }
    return war;
  }

  /** Só o líder do clã desafiado (ou um admin) responde ao desafio. */
  assertPodeResponder(war, userId, isAdmin) {
    if (!isAdmin && war.opponent.ownerId !== userId) {
      throw new PermissionError('Apenas o líder do clã desafiado pode responder a este desafio.');
    }
  }

  async accept(discordGuild, warId, actorId) {
    const war = await this.loadPending(warId);
    const updated = await this.wars.update(war.id, {
      status: WarStatus.ACTIVE,
      startedAt: new Date(),
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: war.opponentId,
      action: AuditAction.WAR_ACCEPTED,
      actorId,
      metadata: { adversario: war.challenger.name },
    });

    return updated;
  }

  async decline(discordGuild, warId, actorId) {
    const war = await this.loadPending(warId);
    const updated = await this.wars.update(war.id, {
      status: WarStatus.DECLINED,
      endedAt: new Date(),
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: war.opponentId,
      action: AuditAction.WAR_DECLINED,
      actorId,
      metadata: { adversario: war.challenger.name },
    });

    return updated;
  }

  async cancel(discordGuild, warId, actorId) {
    const war = await this.wars.findById(warId);
    if (!war) throw new NotFoundError('Guerra não encontrada.');
    if (![WarStatus.PENDING, WarStatus.ACTIVE].includes(war.status)) {
      throw new ConflictError('Essa guerra já foi encerrada.');
    }

    const updated = await this.wars.update(war.id, {
      status: WarStatus.CANCELLED,
      endedAt: new Date(),
    });
    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: war.challengerId,
      action: AuditAction.WAR_CANCELLED,
      actorId,
    });
    return updated;
  }

  /**
   * Reporta o placar e distribui os pontos. Empate nao move pontuacao.
   */
  async report(discordGuild, warId, challengerScore, opponentScore, actorId) {
    const war = await this.wars.findById(warId);
    if (!war) throw new NotFoundError('Guerra não encontrada.');
    if (war.status !== WarStatus.ACTIVE) {
      throw new ConflictError('Só é possível reportar o placar de uma guerra em andamento.');
    }

    const a = Number(challengerScore);
    const b = Number(opponentScore);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      throw new ValidationError('O placar deve ter dois números inteiros não negativos.');
    }

    const winner = a === b ? null : a > b ? war.challenger : war.opponent;

    const updated = await this.wars.update(war.id, {
      status: WarStatus.FINISHED,
      challengerScore: a,
      opponentScore: b,
      winnerId: winner?.id ?? null,
      endedAt: new Date(),
    });

    let premiado = null;
    if (winner && war.prize > 0) {
      const atual = await this.guilds.findById(winner.id);
      const { guild, leveledUp } = await this.ranking.addPoints(discordGuild.id, atual, war.prize, {
        actorId,
        reason: `vitória contra ${winner.id === war.challengerId ? war.opponent.name : war.challenger.name}`,
      });
      premiado = { guild, leveledUp };
    }

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: war.challengerId,
      action: AuditAction.WAR_FINISHED,
      actorId,
      metadata: { placar: `${a} x ${b}`, vencedor: winner?.name ?? 'empate', pontos: war.prize },
    });

    return { war: updated, winner, premiado };
  }

  getById(warId) {
    return this.wars.findById(warId);
  }

  listOpen(discordGuildId) {
    return this.wars.listOpen(discordGuildId);
  }

  listByGuild(guildId, take) {
    return this.wars.listByGuild(guildId, take);
  }

  /** Estatisticas simples para exibir no /cla info. */
  async statsFor(guildId) {
    const historico = await this.wars.listByGuild(guildId, 100);
    const encerradas = historico.filter((war) => war.status === WarStatus.FINISHED);
    return {
      total: encerradas.length,
      vitorias: encerradas.filter((war) => war.winnerId === guildId).length,
      derrotas: encerradas.filter((war) => war.winnerId && war.winnerId !== guildId).length,
      empates: encerradas.filter((war) => !war.winnerId).length,
      emAndamento: historico.filter((war) => war.status === WarStatus.ACTIVE).length,
    };
  }
}

export default GuildWarService;
