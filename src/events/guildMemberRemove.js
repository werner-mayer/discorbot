import { Events } from 'discord.js';
import services from '../services/index.js';
import GuildMemberRepository from '../repositories/GuildMemberRepository.js';
import { AuditAction } from '../models/AuditAction.js';
import { GuildMemberRole } from '../models/GuildMemberRole.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('guildMemberRemove');
const memberRepository = new GuildMemberRepository();

/**
 * Quem sai do servidor deixa de contar como membro da guilda.
 * O lider e mantido no banco para nao "orfanizar" a guilda — um admin decide
 * se transfere a lideranca ou exclui a guilda.
 */
export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      const membership = await memberRepository.findByUser(member.guild.id, member.id);
      if (!membership) return;

      if (membership.role === GuildMemberRole.OWNER) {
        logger.warn(
          `Líder da guilda ${membership.guild.name} saiu do servidor. Registro mantido para revisão de um admin.`,
        );
        return;
      }

      await memberRepository.delete(membership.id);
      await services.auditLogService.record({
        discordGuildId: member.guild.id,
        guildId: membership.guildId,
        action: AuditAction.MEMBER_LEFT,
        actorId: member.id,
        targetId: member.id,
        metadata: { reason: 'saiu do servidor' },
      });
      logger.info(`${member.id} removido da guilda ${membership.guild.name} (saiu do servidor).`);
    } catch (error) {
      logger.error('Falha ao sincronizar saída de membro', error?.message);
    }
  },
};
