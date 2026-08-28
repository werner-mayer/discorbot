import 'dotenv/config';

/**
 * Centraliza toda a configuracao vinda do ambiente.
 * Nenhum ID de servidor, cargo ou canal deve aparecer hardcoded no restante
 * do codigo — tudo passa por aqui.
 */

function required(key) {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(
      `Variavel de ambiente obrigatoria ausente: ${key}. Copie .env.example para .env e preencha.`,
    );
  }
  return value.trim();
}

function optional(key, fallback = null) {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

function number(key, fallback) {
  const raw = optional(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(key, fallback) {
  const raw = optional(key);
  if (raw === null) return fallback;
  return ['1', 'true', 'yes', 'sim'].includes(raw.toLowerCase());
}

function list(key) {
  const raw = optional(key);
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    serverId: required('DISCORD_SERVER_ID'),
    guildCreationChannelId: optional('GUILD_CREATION_CHANNEL_ID'),
    adminRoleIds: list('ADMIN_ROLE_ID'),
  },
  guild: {
    nameMinLength: number('GUILD_NAME_MIN_LENGTH', 3),
    nameMaxLength: number('GUILD_NAME_MAX_LENGTH', 32),
    tagMinLength: number('GUILD_TAG_MIN_LENGTH', 2),
    tagMaxLength: number('GUILD_TAG_MAX_LENGTH', 5),
    categoryPrefix: optional('GUILD_CATEGORY_PREFIX', '⚔️ CLÃ -'),
    defaultTextChannelName: optional('GUILD_DEFAULT_TEXT_CHANNEL', '💬・chat'),
    defaultVoiceChannelName: optional('GUILD_DEFAULT_VOICE_CHANNEL', '🔊・voz'),
    allowCustomChannelNames: boolean('GUILD_ALLOW_CUSTOM_CHANNEL_NAMES', true),
    roleHoist: boolean('GUILD_ROLE_HOIST', true),
    roleMentionable: boolean('GUILD_ROLE_MENTIONABLE', true),
    applyTagToNickname: boolean('GUILD_APPLY_TAG_TO_NICKNAME', false),
    inviteExpirationMinutes: number('GUILD_INVITE_EXPIRATION_MINUTES', 1440),
    // 0 = sem limite. Preparado para a feature futura de limite por clã.
    maxMembers: number('GUILD_MAX_MEMBERS', 0),
    draftTtlMinutes: number('GUILD_DRAFT_TTL_MINUTES', 10),
    // Progressao: nivel = floor(pontos / pointsPerLevel) + 1
    pointsPerLevel: number('GUILD_POINTS_PER_LEVEL', 100),
    // Pontos que o vencedor de uma guerra leva por padrao
    warPrize: number('GUILD_WAR_PRIZE', 50),
    maxDescriptionLength: number('GUILD_MAX_DESCRIPTION_LENGTH', 300),
  },
};

export default config;
