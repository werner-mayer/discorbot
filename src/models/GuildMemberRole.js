export const GuildMemberRole = Object.freeze({
  OWNER: 'OWNER',
  OFFICER: 'OFFICER',
  MEMBER: 'MEMBER',
});

export const ROLE_LABEL = Object.freeze({
  OWNER: 'Líder',
  OFFICER: 'Oficial',
  MEMBER: 'Membro',
});

/** Hierarquia: quanto maior, mais poder. Usada pelo GuildPermissionService. */
export const ROLE_WEIGHT = Object.freeze({
  OWNER: 30,
  OFFICER: 20,
  MEMBER: 10,
});

export function isValidMemberRole(role) {
  return Object.prototype.hasOwnProperty.call(GuildMemberRole, role);
}
